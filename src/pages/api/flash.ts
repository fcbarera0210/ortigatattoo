import type { APIRoute } from 'astro';
import { and, asc, eq } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { flashDesigns } from '../../lib/db/schema';

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
    .from(flashDesigns)
    .where(eq(flashDesigns.businessId, biz.id))
    .orderBy(asc(flashDesigns.sortOrder), asc(flashDesigns.createdAt));

  const filtered = admin ? rows : rows.filter((f) => f.active && !f.reserved);

  return new Response(JSON.stringify({ flash: filtered }), {
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
    title?: string;
    description?: string;
    imageUrl?: string;
    durationMin?: number;
    priceCents?: number;
    priceDisplay?: string;
    active?: boolean;
    reserved?: boolean;
    sortOrder?: number;
  };

  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.title?.trim() || !body.imageUrl?.trim() || !body.durationMin || body.durationMin < 15) {
    return new Response(
      JSON.stringify({ error: 'Título, imagen y duración (mín. 15 min) requeridos' }),
      { status: 400 },
    );
  }

  const priceDisplay =
    body.priceDisplay && PRICE_DISPLAYS.has(body.priceDisplay) ? body.priceDisplay : 'hidden';

  const [created] = await db
    .insert(flashDesigns)
    .values({
      businessId: biz.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl.trim(),
      durationMin: body.durationMin,
      priceCents: body.priceCents ?? 0,
      priceDisplay: priceDisplay as 'hidden' | 'from' | 'fixed',
      active: body.active ?? true,
      reserved: body.reserved ?? false,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return new Response(JSON.stringify({ flash: created }), {
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
    title?: string;
    description?: string;
    imageUrl?: string;
    durationMin?: number;
    priceCents?: number;
    priceDisplay?: string;
    active?: boolean;
    reserved?: boolean;
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

  const updates: Partial<typeof flashDesigns.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return new Response(JSON.stringify({ error: 'Título requerido' }), { status: 400 });
    }
    updates.title = body.title.trim();
  }
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.imageUrl !== undefined) {
    if (!body.imageUrl.trim()) {
      return new Response(JSON.stringify({ error: 'Imagen requerida' }), { status: 400 });
    }
    updates.imageUrl = body.imageUrl.trim();
  }
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
  if (body.reserved !== undefined) updates.reserved = body.reserved;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [existing] = await db
    .select()
    .from(flashDesigns)
    .where(eq(flashDesigns.id, body.id))
    .limit(1);

  if (!existing || existing.businessId !== biz.id) {
    return new Response(JSON.stringify({ error: 'Diseño flash no encontrado' }), { status: 404 });
  }

  const [updated] = await db
    .update(flashDesigns)
    .set(updates)
    .where(eq(flashDesigns.id, body.id))
    .returning();

  return new Response(JSON.stringify({ flash: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: { id?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(flashDesigns)
    .where(and(eq(flashDesigns.id, body.id), eq(flashDesigns.businessId, biz.id)))
    .limit(1);

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Diseño flash no encontrado' }), { status: 404 });
  }

  await db.delete(flashDesigns).where(eq(flashDesigns.id, body.id));
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
