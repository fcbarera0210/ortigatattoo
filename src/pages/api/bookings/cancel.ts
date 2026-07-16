import type { APIRoute } from 'astro';
import { and, eq, ne } from 'drizzle-orm';
import { getActiveBusiness } from '../../../lib/business';
import { db } from '../../../lib/db';
import { bookings, clients, flashDesigns } from '../../../lib/db/schema';
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

  let body: { bookingId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const email = body.email ? normalizeEmail(body.email) : '';
  if (!body.bookingId || !isValidEmail(email)) {
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
    return new Response(JSON.stringify({ error: 'La reserva ya está cancelada' }), { status: 409 });
  }

  const now = new Date();
  const minCancelMs = biz.minCancelHours * 60 * 60 * 1000;
  if (booking.startAt.getTime() - now.getTime() < minCancelMs) {
    return new Response(
      JSON.stringify({
        error: `Las cancelaciones deben hacerse con al menos ${biz.minCancelHours} horas de anticipación. Escribinos por WhatsApp.`,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
    .where(and(eq(bookings.id, booking.id), ne(bookings.status, 'cancelled')))
    .returning();

  if (!updated) {
    return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), { status: 404 });
  }

  if (booking.flashDesignId) {
    await db
      .update(flashDesigns)
      .set({ reserved: false, updatedAt: now })
      .where(eq(flashDesigns.id, booking.flashDesignId));
  }

  return new Response(JSON.stringify({ success: true, booking: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
