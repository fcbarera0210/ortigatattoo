import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';
import {
  business,
  adminUsers,
  services,
  availabilityBlocks,
} from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/auth';

const AFTERCARE_CONTENT = `Cuidados de tu tatuaje

Primeras horas
- Dejá el film o la curación que te puso el tatuador entre 2 y 4 horas.
- Lavá con agua tibia y jabón neutro, sin frotar. Secá con toques suaves de una toalla limpia.

Primeros días
- Aplicá una capa fina de crema cicatrizante 2 o 3 veces por día.
- No rasques ni saques las costritas: se caen solas.
- Evitá el sol directo, la pileta, el mar y los baños de inmersión hasta que cicatrice.

Recomendaciones
- Usá ropa holgada y limpia sobre la zona tatuada.
- Ante enrojecimiento excesivo, dolor o cualquier duda, escribinos por WhatsApp.

Una buena cicatrización depende de vos. ¡Cuidá tu tatu!`;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const slug = process.env.PUBLIC_BUSINESS_SLUG ?? 'ortiga-tattoo';

  const existing = await db.select().from(business).where(eq(business.slug, slug)).limit(1);

  let businessId: string;

  if (existing.length === 0) {
    const [created] = await db
      .insert(business)
      .values({
        name: 'Ortiga Tattoo',
        slug,
        description:
          'Estudio de tatuajes en La Plata. Diseños personalizados, flash y sesiones a medida con foco en la seguridad y la higiene.',
        address: 'La Plata, Buenos Aires',
        phone: null,
        whatsappNumber: '5492210000000',
        instagramUrl: 'https://instagram.com/ortigatattoo',
        minAdvanceHours: 24,
        maxAdvanceDays: 60,
        minCancelHours: 48,
        aftercareContent: AFTERCARE_CONTENT,
      })
      .returning();
    businessId = created.id;
    console.log('Business seeded:', slug);
  } else {
    businessId = existing[0].id;
    console.log('Business already exists:', slug);
  }

  const existingServices = await db
    .select()
    .from(services)
    .where(eq(services.businessId, businessId));

  if (existingServices.length === 0) {
    await db.insert(services).values([
      {
        businessId,
        name: 'Sesión flash',
        description: 'Sesión corta ideal para diseños chicos o flash.',
        durationMin: 60,
        priceCents: 0,
        priceDisplay: 'hidden',
        sortOrder: 1,
      },
      {
        businessId,
        name: 'Sesión mediana',
        description: 'Sesión para tatuajes de tamaño medio.',
        durationMin: 120,
        priceCents: 0,
        priceDisplay: 'hidden',
        sortOrder: 2,
      },
      {
        businessId,
        name: 'Sesión larga',
        description: 'Sesión extendida para piezas grandes o de mayor detalle.',
        durationMin: 240,
        priceCents: 0,
        priceDisplay: 'hidden',
        sortOrder: 3,
      },
    ]);
    console.log('Services seeded');
  }

  const existingAvail = await db
    .select()
    .from(availabilityBlocks)
    .where(eq(availabilityBlocks.businessId, businessId));

  if (existingAvail.length === 0) {
    const weekdays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;
    await db.insert(availabilityBlocks).values(
      weekdays.flatMap((day) => [
        { businessId, dayOfWeek: day, startTime: '10:00', endTime: '14:00' },
        { businessId, dayOfWeek: day, startTime: '16:00', endTime: '20:00' },
      ]),
    );
    await db.insert(availabilityBlocks).values({
      businessId,
      dayOfWeek: 'SABADO',
      startTime: '10:00',
      endTime: '14:00',
    });
    console.log('Availability seeded');
  }

  const seedUsername = process.env.ADMIN_SEED_USERNAME;
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;

  if (seedUsername && seedPassword) {
    const passwordHash = await hashPassword(seedPassword);
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, seedUsername))
      .limit(1);

    if (existingAdmin.length === 0) {
      await db.insert(adminUsers).values({ username: seedUsername, passwordHash });
      console.log('Admin user created:', seedUsername);
    } else {
      await db
        .update(adminUsers)
        .set({ passwordHash })
        .where(eq(adminUsers.username, seedUsername));
      console.log('Admin user password synced:', seedUsername);
    }
  }

  console.log('Seed complete');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
