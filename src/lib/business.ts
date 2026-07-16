import { eq } from 'drizzle-orm';
import { db } from './db';
import { business } from './db/schema';

export function getBusinessSlug(): string {
  return (
    import.meta.env.PUBLIC_BUSINESS_SLUG ??
    process.env.PUBLIC_BUSINESS_SLUG ??
    'ortiga-tattoo'
  );
}

export async function getActiveBusiness() {
  const slug = getBusinessSlug();
  const [row] = await db.select().from(business).where(eq(business.slug, slug)).limit(1);
  return row ?? null;
}
