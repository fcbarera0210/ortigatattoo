import { put } from '@vercel/blob';

export const WEBP_BLOB_MAX_BYTES = 300 * 1024;
export const WEBP_BLOB_MIME = 'image/webp';

function readEnv(name: string): string | undefined {
  const fromImportMeta =
    typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string | undefined>)?.[name]
      : undefined;
  const value = fromImportMeta || process.env[name] || undefined;
  return value?.trim() || undefined;
}

function looksLikeReadWriteToken(value: string): boolean {
  return value.startsWith('vercel_blob_rw_');
}

/** Vercel store id — prefers `BLOB_STORE_ID_STORE_ID` (current), falls back to `BLOB_STORE_ID`. */
export function getBlobStoreId(): string | undefined {
  return readEnv('BLOB_STORE_ID_STORE_ID') || readEnv('BLOB_STORE_ID');
}

/**
 * Resolve a real read-write token.
 * Note: on Vercel, `BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY` is usually a PEM webhook key,
 * not a RW token. We only treat it as a token when the value looks like `vercel_blob_rw_...`
 * (common when the same name was reused locally).
 */
export function getBlobToken(): string | undefined {
  const candidates = [
    readEnv('BLOB_READ_WRITE_TOKEN'),
    readEnv('BLOB_STORE_ID_READ_WRITE_TOKEN'),
    readEnv('BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY'),
  ].filter(Boolean) as string[];

  return candidates.find(looksLikeReadWriteToken);
}

export type BlobAuthOptions = { token: string } | { storeId: string };

/**
 * Prefer an explicit RW token when present.
 * Otherwise authenticate via OIDC + storeId (default on Vercel deployments).
 */
export function getBlobAuthOptions(): BlobAuthOptions {
  const token = getBlobToken();
  if (token) {
    return { token };
  }

  const storeId = getBlobStoreId();
  if (storeId) {
    // Ensures the SDK default OIDC path can also see the store id.
    if (!process.env.BLOB_STORE_ID) {
      process.env.BLOB_STORE_ID = storeId;
    }
    return { storeId };
  }

  throw new Error('BLOB_TOKEN_MISSING');
}

export function assertWebpBlobFile(file: File): void {
  if (file.type !== WEBP_BLOB_MIME) {
    throw new Error('INVALID_TYPE');
  }
  if (file.size > WEBP_BLOB_MAX_BYTES) {
    throw new Error('TOO_LARGE');
  }
}

export async function putPublicWebpBlob(
  path: string,
  file: File,
  options?: { allowOverwrite?: boolean },
): Promise<{ pathname: string; url: string }> {
  assertWebpBlobFile(file);
  const blob = await put(path, file, {
    access: 'public',
    ...getBlobAuthOptions(),
    ...(options?.allowOverwrite && { allowOverwrite: true }),
  });
  return { pathname: path, url: blob.url };
}
