import type { APIRoute } from 'astro';
import { and, eq, gte, lte, ne } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { createBooking } from '../../lib/booking/conflicts';
import { rangeHasConflict } from '../../lib/booking/slots';
import { db } from '../../lib/db';
import { bookingBlocks, bookings, clients, flashDesigns, services } from '../../lib/db/schema';
import { endOfDay, parseLocalDateTimeInput, startOfDay } from '../../lib/datetime';
import { checkRateLimit } from '../../lib/rate-limit';

export const prerender = false;

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function parseDateInput(value: string): Date {
  return DATETIME_LOCAL_RE.test(value) ? parseLocalDateTimeInput(value) : new Date(value);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Espera un momento.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    serviceId?: string;
    date?: string;
    time?: string;
    name?: string;
    email?: string;
    phone?: string;
    flashDesignId?: string | null;
    bodyZone?: string | null;
    sizeNotes?: string | null;
    styleNotes?: string | null;
    description?: string | null;
    instagramHandle?: string | null;
    referenceImageUrl?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.serviceId || !body.date || !body.time || !body.name || !body.email || !body.phone) {
    return new Response(JSON.stringify({ error: 'Todos los campos son requeridos' }), {
      status: 400,
    });
  }

  const result = await createBooking({
    serviceId: body.serviceId,
    date: body.date,
    time: body.time,
    name: body.name,
    email: body.email,
    phone: body.phone,
    flashDesignId: body.flashDesignId ?? null,
    bodyZone: body.bodyZone ?? null,
    sizeNotes: body.sizeNotes ?? null,
    styleNotes: body.styleNotes ?? null,
    description: body.description ?? null,
    instagramHandle: body.instagramHandle ?? null,
    referenceImageUrl: body.referenceImageUrl ?? null,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, bookingId: result.bookingId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const { url } = context;
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const date = url.searchParams.get('date');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const status = url.searchParams.get('status');

  const conditions = [eq(bookings.businessId, biz.id)];

  if (date) {
    conditions.push(gte(bookings.startAt, startOfDay(date)));
    conditions.push(lte(bookings.startAt, endOfDay(date)));
  } else if (from && to) {
    conditions.push(gte(bookings.startAt, new Date(from)));
    conditions.push(lte(bookings.startAt, new Date(to)));
  }

  if (status === 'pending' || status === 'confirmed' || status === 'cancelled') {
    conditions.push(eq(bookings.status, status));
  }

  const rows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      cancelledAt: bookings.cancelledAt,
      bodyZone: bookings.bodyZone,
      sizeNotes: bookings.sizeNotes,
      styleNotes: bookings.styleNotes,
      description: bookings.description,
      instagramHandle: bookings.instagramHandle,
      referenceImageUrl: bookings.referenceImageUrl,
      adminNotes: bookings.adminNotes,
      rescheduleOfBookingId: bookings.rescheduleOfBookingId,
      clientName: clients.name,
      clientEmail: clients.email,
      clientPhone: clients.phone,
      serviceName: services.name,
      serviceId: services.id,
      flashDesignId: bookings.flashDesignId,
      flashTitle: flashDesigns.title,
    })
    .from(bookings)
    .innerJoin(clients, eq(bookings.clientId, clients.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(flashDesigns, eq(bookings.flashDesignId, flashDesigns.id))
    .where(and(...conditions))
    .orderBy(bookings.startAt);

  return new Response(JSON.stringify({ bookings: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: {
    id?: string;
    action?: string;
    startAt?: string;
    endAt?: string;
    durationMin?: number;
    adminNotes?: string;
  };

  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id || !body.action) {
    return new Response(JSON.stringify({ error: 'id y action requeridos' }), { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, body.id), eq(bookings.businessId, biz.id)))
    .limit(1);

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Cita no encontrada' }), { status: 404 });
  }

  const now = new Date();

  switch (body.action) {
    case 'confirm': {
      const [updated] = await db
        .update(bookings)
        .set({ status: 'confirmed', cancelledAt: null, updatedAt: now })
        .where(eq(bookings.id, booking.id))
        .returning();

      if (booking.flashDesignId) {
        await db
          .update(flashDesigns)
          .set({ reserved: true, updatedAt: now })
          .where(eq(flashDesigns.id, booking.flashDesignId));
      }

      return new Response(JSON.stringify({ booking: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'reject':
    case 'cancel': {
      const [updated] = await db
        .update(bookings)
        .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
        .where(eq(bookings.id, booking.id))
        .returning();

      if (booking.flashDesignId) {
        await db
          .update(flashDesigns)
          .set({ reserved: false, updatedAt: now })
          .where(eq(flashDesigns.id, booking.flashDesignId));
      }

      return new Response(JSON.stringify({ booking: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'extend': {
      const startAt = body.startAt ? parseDateInput(body.startAt) : booking.startAt;
      let endAt: Date;
      if (body.endAt) {
        endAt = parseDateInput(body.endAt);
      } else if (typeof body.durationMin === 'number' && body.durationMin > 0) {
        endAt = new Date(startAt.getTime() + body.durationMin * 60_000);
      } else {
        endAt = booking.endAt;
      }

      if (endAt <= startAt) {
        return new Response(JSON.stringify({ error: 'El fin debe ser posterior al inicio' }), {
          status: 400,
        });
      }

      const [existingBookings, blocks] = await Promise.all([
        db
          .select({ startAt: bookings.startAt, endAt: bookings.endAt, status: bookings.status })
          .from(bookings)
          .where(
            and(
              eq(bookings.businessId, biz.id),
              ne(bookings.status, 'cancelled'),
              ne(bookings.id, booking.id),
            ),
          ),
        db
          .select({ startAt: bookingBlocks.startAt, endAt: bookingBlocks.endAt })
          .from(bookingBlocks)
          .where(eq(bookingBlocks.businessId, biz.id)),
      ]);

      if (rangeHasConflict(startAt, endAt, existingBookings, blocks)) {
        return new Response(JSON.stringify({ error: 'El horario se superpone con otra cita' }), {
          status: 409,
        });
      }

      const [updated] = await db
        .update(bookings)
        .set({ startAt, endAt, updatedAt: now })
        .where(eq(bookings.id, booking.id))
        .returning();

      return new Response(JSON.stringify({ booking: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'adminNotes': {
      const [updated] = await db
        .update(bookings)
        .set({ adminNotes: body.adminNotes?.trim() || null, updatedAt: now })
        .where(eq(bookings.id, booking.id))
        .returning();

      return new Response(JSON.stringify({ booking: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    default:
      return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 });
  }
};
