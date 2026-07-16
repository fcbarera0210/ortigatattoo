import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { hashPassword } from '../../lib/auth';
import { requireAdmin } from '../../lib/admin-auth';
import { db } from '../../lib/db';
import { adminUsers } from '../../lib/db/schema';

export const prerender = false;

const MIN_PASSWORD_LENGTH = 8;

export const GET: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  const users = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.createdAt));

  return new Response(JSON.stringify({ users }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  const authError = await requireAdmin(context);
  if (authError) return authError;

  let body: { username?: string; password?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const username = body.username?.trim();
  const password = body.password ?? '';

  if (!username || username.length < 3) {
    return new Response(
      JSON.stringify({ error: 'El usuario debe tener al menos 3 caracteres' }),
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return new Response(
      JSON.stringify({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` }),
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (existing) {
    return new Response(JSON.stringify({ error: 'Ese nombre de usuario ya existe' }), {
      status: 409,
    });
  }

  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(adminUsers)
    .values({ username, passwordHash })
    .returning({
      id: adminUsers.id,
      username: adminUsers.username,
      createdAt: adminUsers.createdAt,
    });

  return new Response(JSON.stringify({ user: created }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
