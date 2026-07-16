import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { services } from '../../lib/db/schema';

export const prerender = false;

const PRICE_DISPLAYS = new Set(['hidden', 'from', 'fixed']);

export const GET: APIRoute = async (context) => {
  const { url } = context;
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  const admin = url.searchParams.get('admin') === '1';
  if (admin) {
    const authError = await requireAdmin(context);
    if (authError) return authError;
  }
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.businessId, biz.id))
    .orderBy(asc(services.sortOrder));

  const filtered = admin ? rows : rows.filter((s) => s.active);

  return new Response(JSON.stringify({ services: filtered }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: {
    name?: string;
    description?: string;
    durationMin?: number;
    priceCents?: number;
    priceDisplay?: string;
    active?: boolean;
    sortOrder?: number;
  };

  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.name?.trim() || !body.durationMin || body.durationMin < 15) {
    return new Response(JSON.stringify({ error: 'Nombre y duración (mín. 15 min) requeridos' }), {
      status: 400,
    });
  }

  const priceDisplay =
    body.priceDisplay && PRICE_DISPLAYS.has(body.priceDisplay) ? body.priceDisplay : 'hidden';

  const [created] = await db
    .insert(services)
    .values({
      businessId: biz.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      durationMin: body.durationMin,
      priceCents: body.priceCents ?? 0,
      priceDisplay: priceDisplay as 'hidden' | 'from' | 'fixed',
      active: body.active ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return new Response(JSON.stringify({ service: created }), {
    status: 201,
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
    name?: string;
    description?: string;
    durationMin?: number;
    priceCents?: number;
    priceDisplay?: string;
    active?: boolean;
    sortOrder?: number;
  };

  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  const updates: Partial<typeof services.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.durationMin !== undefined) {
    if (body.durationMin < 15) {
      return new Response(JSON.stringify({ error: 'Duración mínima 15 minutos' }), { status: 400 });
    }
    updates.durationMin = body.durationMin;
  }
  if (body.priceCents !== undefined) updates.priceCents = body.priceCents;
  if (body.priceDisplay !== undefined && PRICE_DISPLAYS.has(body.priceDisplay)) {
    updates.priceDisplay = body.priceDisplay as 'hidden' | 'from' | 'fixed';
  }
  if (body.active !== undefined) updates.active = body.active;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [updated] = await db
    .update(services)
    .set(updates)
    .where(eq(services.id, body.id))
    .returning();

  return new Response(JSON.stringify({ service: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  let body: { id?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  await db.delete(services).where(eq(services.id, body.id));
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
