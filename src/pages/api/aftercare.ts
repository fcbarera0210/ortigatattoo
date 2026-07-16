import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { business } from '../../lib/db/schema';

export const prerender = false;

export const GET: APIRoute = async () => {
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  return new Response(
    JSON.stringify({ aftercareContent: biz.aftercareContent ?? null }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const PATCH: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404 });
  }

  let body: { aftercareContent?: string | null };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (typeof body.aftercareContent !== 'string' && body.aftercareContent !== null) {
    return new Response(JSON.stringify({ error: 'aftercareContent requerido' }), { status: 400 });
  }

  const value =
    typeof body.aftercareContent === 'string' ? body.aftercareContent.trim() || null : null;

  const [updated] = await db
    .update(business)
    .set({ aftercareContent: value, updatedAt: new Date() })
    .where(eq(business.id, biz.id))
    .returning();

  return new Response(
    JSON.stringify({ aftercareContent: updated.aftercareContent }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
