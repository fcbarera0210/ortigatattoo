import type { APIRoute } from 'astro';
import { del } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { requireAdmin } from '../../lib/admin-auth';
import { getActiveBusiness } from '../../lib/business';
import {
  putPublicWebpBlob,
  getBlobAuthOptions,
  WEBP_BLOB_MAX_BYTES,
} from '../../lib/blob-webp-upload';
import { BLOB_DOMAIN } from '../../lib/gallery/constants';

export const prerender = false;

function normalizeSlug(slug: string): string {
  return String(slug).trim().toLowerCase().replace(/\s+/g, '-');
}

function uploadErrorResponse(e: unknown): Response {
  const code = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
  if (code === 'INVALID_TYPE') {
    return new Response(
      JSON.stringify({ error: 'Solo se permiten imágenes WebP optimizadas en el cliente.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (code === 'TOO_LARGE') {
    return new Response(
      JSON.stringify({ error: `La imagen no puede superar ${WEBP_BLOB_MAX_BYTES / 1024} KB.` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (code === 'BLOB_TOKEN_MISSING') {
    return new Response(
      JSON.stringify({
        error:
          'Falta el token de Blob (BLOB_READ_WRITE_TOKEN). Configuralo en .env / Vercel y reinicia.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  console.error('Upload error:', e);
  return new Response(JSON.stringify({ error: 'Error al subir archivo' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const DELETE: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  try {
    const body = await context.request.json().catch(() => ({}));
    const urls = body.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'Se requiere un array "urls"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = urls.every(
      (u: unknown) =>
        typeof u === 'string' && u.startsWith('https://') && u.includes(BLOB_DOMAIN),
    );
    if (!valid) {
      return new Response(JSON.stringify({ error: 'URLs inválidas de Vercel Blob' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await del(urls as string[], getBlobAuthOptions());
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('Delete blob error:', e);
    return new Response(JSON.stringify({ error: 'Error al eliminar imagen' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  try {
    const formData = await context.request.formData();
    const file = formData.get('file') as File | null;
    const businessSlug = formData.get('businessSlug') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No se envió archivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const biz = await getActiveBusiness();
    const slug = normalizeSlug(businessSlug ?? biz?.slug ?? '');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug de negocio inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const path = `gallery/${slug}/${nanoid()}.webp`;

    try {
      const { url } = await putPublicWebpBlob(path, file);
      return new Response(JSON.stringify({ url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return uploadErrorResponse(e);
    }
  } catch (e) {
    return uploadErrorResponse(e);
  }
};
