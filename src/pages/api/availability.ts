import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { availabilityBlocks } from '../../lib/db/schema';

export const prerender = false;

export const GET: APIRoute = async () => {
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const rows = await db
    .select()
    .from(availabilityBlocks)
    .where(eq(availabilityBlocks.businessId, biz.id))
    .orderBy(asc(availabilityBlocks.dayOfWeek));

  return new Response(JSON.stringify({ blocks: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const { request } = context;
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: {
    blocks?: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      active?: boolean;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!Array.isArray(body.blocks)) {
    return new Response(JSON.stringify({ error: 'blocks requerido' }), { status: 400 });
  }

  await db.delete(availabilityBlocks).where(eq(availabilityBlocks.businessId, biz.id));

  if (body.blocks.length > 0) {
    await db.insert(availabilityBlocks).values(
      body.blocks.map((b) => ({
        businessId: biz.id,
        dayOfWeek: b.dayOfWeek as typeof availabilityBlocks.$inferInsert.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
        active: b.active ?? true,
      })),
    );
  }

  const rows = await db
    .select()
    .from(availabilityBlocks)
    .where(eq(availabilityBlocks.businessId, biz.id));

  return new Response(JSON.stringify({ blocks: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
