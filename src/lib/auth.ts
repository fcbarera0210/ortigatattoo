import bcrypt from 'bcryptjs';
import Credentials from '@auth/core/providers/credentials';
import type { AuthConfig } from '@auth/core';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { adminUsers } from './db/schema';

export const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username?.toString().trim();
        const password = credentials?.password?.toString();

        if (!username || !password) return null;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.username, username))
          .limit(1);

        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.username,
        };
      },
    }),
  ],
  secret: import.meta.env?.AUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: '/admin/login',
    signOut: '/admin/login',
    error: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
