import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import { db } from '../../lib/db';
import { galleryPhotos } from '../../lib/db/schema';
import { getBlobToken } from '../../lib/blob-webp-upload';
import { GALLERY_MAX_PHOTOS, isValidBlobUrl } from '../../lib/gallery/constants';

export const prerender = false;

async function listPhotosForBusiness(businessId: string) {
  return db
    .select({
      id: galleryPhotos.id,
      url: galleryPhotos.url,
      sortOrder: galleryPhotos.sortOrder,
    })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.businessId, businessId))
    .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.createdAt));
}

export const GET: APIRoute = async () => {
  const biz = await getActiveBusiness();
  if (!biz) {
    return new Response(JSON.stringify({ photos: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const photos = await listPhotosForBusiness(biz.id);
  return new Response(JSON.stringify({ photos }), {
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

  let body: { url?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !isValidBlobUrl(url)) {
    return new Response(JSON.stringify({ error: 'URL de imagen inválida' }), { status: 400 });
  }

  const existing = await listPhotosForBusiness(biz.id);
  if (existing.length >= GALLERY_MAX_PHOTOS) {
    return new Response(
      JSON.stringify({ error: `Máximo ${GALLERY_MAX_PHOTOS} fotos en la galería` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);

  const [photo] = await db
    .insert(galleryPhotos)
    .values({
      businessId: biz.id,
      url,
      sortOrder: maxOrder + 1,
    })
    .returning();

  return new Response(JSON.stringify({ photo }), {
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

  let body: { id?: string; sortOrder?: number };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  if (!body.id || typeof body.sortOrder !== 'number') {
    return new Response(JSON.stringify({ error: 'id y sortOrder requeridos' }), { status: 400 });
  }

  const [photo] = await db
    .update(galleryPhotos)
    .set({ sortOrder: body.sortOrder })
    .where(eq(galleryPhotos.id, body.id))
    .returning();

  if (!photo || photo.businessId !== biz.id) {
    return new Response(JSON.stringify({ error: 'Foto no encontrada' }), { status: 404 });
  }

  return new Response(JSON.stringify({ photo }), {
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
    return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });
  }

  const [photo] = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, body.id))
    .limit(1);

  if (!photo || photo.businessId !== biz.id) {
    return new Response(JSON.stringify({ error: 'Foto no encontrada' }), { status: 404 });
  }

  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, body.id));

  if (isValidBlobUrl(photo.url)) {
    try {
      await del(photo.url, { token: getBlobToken() });
    } catch (e) {
      console.error('Failed to delete blob:', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
