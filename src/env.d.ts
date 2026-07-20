/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly AUTH_SECRET: string;
  readonly ADMIN_SEED_USERNAME?: string;
  readonly ADMIN_SEED_PASSWORD?: string;
  readonly PUBLIC_BUSINESS_SLUG?: string;
  readonly BLOB_STORE_ID_STORE_ID?: string;
  readonly BLOB_READ_WRITE_TOKEN?: string;
  readonly BLOB_STORE_ID?: string;
  readonly BLOB_STORE_ID_READ_WRITE_TOKEN?: string;
  /** Webhook PEM key — not an upload credential */
  readonly BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
