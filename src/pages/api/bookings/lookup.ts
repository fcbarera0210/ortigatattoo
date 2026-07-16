import type { APIRoute } from 'astro';
import { and, desc, eq } from 'drizzle-orm';
import { getActiveBusiness } from '../../../lib/business';
import { db } from '../../../lib/db';
import { bookings, clients, flashDesigns, services } from '../../../lib/db/schema';
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

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const email = body.email ? normalizeEmail(body.email) : '';
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400 });
  }

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const [client] = await db.select().from(clients).where(eq(clients.email, email)).limit(1);

  if (!client) {
    return new Response(JSON.stringify({ bookings: [], client: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      status: bookings.status,
      bodyZone: bookings.bodyZone,
      sizeNotes: bookings.sizeNotes,
      styleNotes: bookings.styleNotes,
      description: bookings.description,
      instagramHandle: bookings.instagramHandle,
      referenceImageUrl: bookings.referenceImageUrl,
      serviceName: services.name,
      serviceId: services.id,
      flashDesignId: bookings.flashDesignId,
      flashTitle: flashDesigns.title,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(flashDesigns, eq(bookings.flashDesignId, flashDesigns.id))
    .where(and(eq(bookings.clientId, client.id), eq(bookings.businessId, biz.id)))
    .orderBy(desc(bookings.startAt));

  return new Response(
    JSON.stringify({
      client: { name: client.name, email: client.email, phone: client.phone },
      bookings: rows,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
