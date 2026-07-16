import { getToken } from '@auth/core/jwt';
import type { APIContext } from 'astro';

export async function requireAdmin(context: APIContext): Promise<Response | null> {
  const secret = import.meta.env.AUTH_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Auth no configurado' }), { status: 500 });
  }

  const token = await getToken({
    req: context.request,
    secret,
    secureCookie: import.meta.env.PROD,
  });

  if (!token?.id) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  return null;
}
