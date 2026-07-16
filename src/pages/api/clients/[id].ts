import type { APIRoute } from 'astro';
import { and, desc, eq } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/admin-auth';
import { getActiveBusiness } from '../../../lib/business';
import { db } from '../../../lib/db';
import { bookings, clients, flashDesigns, services } from '../../../lib/db/schema';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const { id } = context.params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Cliente no especificado' }), { status: 400 });
  }

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(eq(clients.id, id));

  if (!client) {
    return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
  }

  const clientBookings = await db
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
      adminNotes: bookings.adminNotes,
      serviceName: services.name,
      serviceDuration: services.durationMin,
      priceCents: services.priceCents,
      flashDesignId: bookings.flashDesignId,
      flashTitle: flashDesigns.title,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(flashDesigns, eq(bookings.flashDesignId, flashDesigns.id))
    .where(and(eq(bookings.clientId, id), eq(bookings.businessId, biz.id)))
    .orderBy(desc(bookings.startAt));

  const stats = {
    totalBookings: clientBookings.length,
    confirmedCount: clientBookings.filter((b) => b.status === 'confirmed').length,
    cancelledCount: clientBookings.filter((b) => b.status === 'cancelled').length,
    lastBookingAt: clientBookings[0]?.startAt ?? null,
    firstBookingAt: clientBookings[clientBookings.length - 1]?.startAt ?? null,
  };

  return new Response(
    JSON.stringify({
      client,
      stats,
      bookings: clientBookings,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
