import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { bookingBlocks } from '../../lib/db/schema';
import { parseInstantOrLocalDateTime } from '../../lib/datetime';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const rows = await db
    .select()
    .from(bookingBlocks)
    .where(eq(bookingBlocks.businessId, biz.id))
    .orderBy(desc(bookingBlocks.startAt));

  return new Response(JSON.stringify({ blocks: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const { request } = context;
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: { startAt?: string; endAt?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.startAt || !body.endAt) {
    return new Response(JSON.stringify({ error: 'startAt y endAt requeridos' }), { status: 400 });
  }

  const startAt = parseInstantOrLocalDateTime(body.startAt);
  const endAt = parseInstantOrLocalDateTime(body.endAt);

  if (endAt <= startAt) {
    return new Response(JSON.stringify({ error: 'endAt debe ser posterior a startAt' }), {
      status: 400,
    });
  }

  const [created] = await db
    .insert(bookingBlocks)
    .values({
      businessId: biz.id,
      startAt,
      endAt,
      reason: body.reason?.trim() || null,
    })
    .returning();

  return new Response(JSON.stringify({ block: created }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const { request } = context;
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  await db.delete(bookingBlocks).where(eq(bookingBlocks.id, body.id));
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
