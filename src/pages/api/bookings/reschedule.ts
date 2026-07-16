import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getActiveBusiness } from '../../../lib/business';
import { buildSlotContext } from '../../../lib/booking/conflicts';
import { isSlotAvailable } from '../../../lib/booking/slots';
import { db } from '../../../lib/db';
import { bookings, clients, flashDesigns } from '../../../lib/db/schema';
import { parseLocalDateTime } from '../../../lib/datetime';
import { isValidEmail, normalizeEmail } from '../../../lib/phone';
import { checkRateLimit } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Espera un momento.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { bookingId?: string; email?: string; date?: string; time?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const email = body.email ? normalizeEmail(body.email) : '';
  if (!body.bookingId || !isValidEmail(email) || !body.date || !body.time) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const [client] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  if (!client) {
    return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), { status: 404 });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, body.bookingId),
        eq(bookings.businessId, biz.id),
        eq(bookings.clientId, client.id),
      ),
    )
    .limit(1);

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return new Response(JSON.stringify({ error: 'No se puede reprogramar una reserva cancelada' }), {
      status: 409,
    });
  }

  let durationMin: number | undefined;
  if (booking.flashDesignId) {
    const [flash] = await db
      .select()
      .from(flashDesigns)
      .where(eq(flashDesigns.id, booking.flashDesignId))
      .limit(1);
    if (flash) durationMin = flash.durationMin;
  }

  const ctx = await buildSlotContext(biz.id, body.date, booking.serviceId, {
    durationMin,
    excludeBookingId: booking.id,
  });
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), { status: 404 });
  }

  if (!isSlotAvailable(ctx, body.time)) {
    return new Response(
      JSON.stringify({ error: 'El horario seleccionado no está disponible' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const startAt = parseLocalDateTime(body.date, body.time);
  const endAt = new Date(startAt.getTime() + ctx.serviceDurationMin * 60_000);

  const [updated] = await db
    .update(bookings)
    .set({
      startAt,
      endAt,
      status: 'pending',
      cancelledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id))
    .returning();

  return new Response(JSON.stringify({ success: true, booking: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
