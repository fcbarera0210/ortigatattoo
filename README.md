# Ortiga Tattoo

Web de estudio de tatuajes con reservas online (pendientes de confirmación), catálogo flash, galería, cuidados y panel de administración.

## Stack

- **Astro 7** + React (islas)
- **Tailwind CSS 4**
- **Neon PostgreSQL** + Drizzle ORM
- **Auth.js** (solo admin)
- **Vercel Blob** (galería, flash, referencias)
- **Vercel** (deploy)

Timezone: `America/Argentina/Buenos_Aires` · Moneda: ARS

## Requisitos

- Node.js >= 22.12
- Cuenta [Neon](https://neon.tech) con PostgreSQL
- Vercel Blob store
- Proyecto en Vercel

## Configuración local

```bash
cd ortigatattoo
npm install
cp .env.example .env
# Editar DATABASE_URL, AUTH_SECRET, ADMIN_SEED_*, BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY, BLOB_STORE_ID_STORE_ID
npm run db:push
npm run db:seed
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon |
| `AUTH_SECRET` | Secret JWT (`openssl rand -base64 32`) |
| `ADMIN_SEED_USERNAME` | Usuario admin inicial |
| `ADMIN_SEED_PASSWORD` | Contraseña admin inicial |
| `PUBLIC_BUSINESS_SLUG` | Default: `ortiga-tattoo` |
| `BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY` | Token Vercel Blob |
| `BLOB_STORE_ID_STORE_ID` | ID del Blob store (`store_...`) |

El timezone `America/Argentina/Buenos_Aires` está fijado en código (`src/lib/datetime.ts`). No uses la variable `TZ` en Vercel: está reservada.

## Rutas públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing (hero, trabajos, horarios, CTA) |
| `/disponibles` | Catálogo flash |
| `/cuidados` | Aftercare editable |
| `/reservar` | Flujo de reserva (queda `pending`) |
| `/mis-reservas` | Consulta, cancelar y reagendar |

## Admin (`/admin`)

Login → Dashboard, Agenda (confirmar / rechazar / extender / WhatsApp), Servicios, Flash, Disponibilidad, Clientes, Galería, Cuidados, Configuración (`minCancelHours`, plantillas WA, etc.).

## Flujo de reserva

1. Cliente elige servicio o flash → fecha → hora → datos + 1 foto referencia opcional.
2. La cita nace como **pending** y bloquea el slot.
3. Ortiga confirma o rechaza en admin; al confirmar un flash, queda `reserved`.
4. Cliente puede cancelar/reagendar si faltan ≥ `minCancelHours` (configurable). Reagendar vuelve a `pending`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo |
| `npm run build` | Build producción |
| `npm run db:push` | Sync schema → Neon |
| `npm run db:seed` | Negocio, servicios, horarios, admin |
| `npm test` | Tests slots / datetime / phone |

## Deploy Vercel

1. Conectar el repo público en Vercel.
2. Configurar las variables de entorno (incluye Blob).
3. Ejecutar `npm run db:push` y `npm run db:seed` contra la BD de producción.
4. Deploy automático en cada push (URL por defecto de Vercel).

## Checklist infra

- [ ] Repo GitHub `ortigatattoo`
- [ ] Proyecto Vercel vinculado
- [ ] Neon DB + `DATABASE_URL`
- [ ] Blob store + `BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY` + `BLOB_STORE_ID_STORE_ID`
- [ ] `AUTH_SECRET` + seed admin
- [ ] Seed y smoke test: reservar → confirmar en admin
