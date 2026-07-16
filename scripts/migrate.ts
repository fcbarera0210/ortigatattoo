import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL no está configurada. Revisa tu archivo .env');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function main() {
  console.log('Aplicando migraciones...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('Migraciones aplicadas correctamente.');
}

main().catch((error) => {
  console.error('Error al aplicar migraciones:');
  console.error(error);
  process.exit(1);
});
