import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function getDatabaseUrl(): string {
  const url =
    (typeof import.meta !== 'undefined' && import.meta.env?.DATABASE_URL) ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  return url;
}

const sql = neon(getDatabaseUrl());
export const db = drizzle(sql, { schema });
