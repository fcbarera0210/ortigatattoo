import type { APIRoute } from 'astro';
import { desc, eq, sql } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { bookings, clients } from '../../lib/db/schema';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      totalBookings: sql<number>`count(${bookings.id})::int`,
      lastBookingAt: sql<Date | null>`max(${bookings.startAt})`,
      confirmedCount: sql<number>`count(case when ${bookings.status} = 'confirmed' then 1 end)::int`,
      cancelledCount: sql<number>`count(case when ${bookings.status} = 'cancelled' then 1 end)::int`,
    })
    .from(clients)
    .innerJoin(bookings, eq(bookings.clientId, clients.id))
    .where(eq(bookings.businessId, biz.id))
    .groupBy(clients.id, clients.name, clients.email, clients.phone)
    .orderBy(desc(sql`max(${bookings.startAt})`));

  return new Response(JSON.stringify({ clients: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
