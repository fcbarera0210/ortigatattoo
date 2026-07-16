import { defineMiddleware } from 'astro:middleware';
import { getToken } from '@auth/core/jwt';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const secret = import.meta.env.AUTH_SECRET;
    if (!secret) {
      return next();
    }

    const token = await getToken({
      req: context.request,
      secret,
      secureCookie: import.meta.env.PROD,
    });

    if (!token?.id) {
      return context.redirect('/admin/login');
    }
  }

  return next();
});
