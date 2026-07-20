import { put } from '@vercel/blob';

export const WEBP_BLOB_MAX_BYTES = 300 * 1024;
export const WEBP_BLOB_MIME = 'image/webp';

function readEnv(name: string): string | undefined {
  const fromImportMeta =
    typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string | undefined>)?.[name]
      : undefined;
  return fromImportMeta || process.env[name] || undefined;
}

/** Vercel store id — prefers `BLOB_STORE_ID_STORE_ID` (current), falls back to `BLOB_STORE_ID`. */
export function getBlobStoreId(): string | undefined {
  return readEnv('BLOB_STORE_ID_STORE_ID') || readEnv('BLOB_STORE_ID');
}

export function getBlobToken(): string {
  const token =
    readEnv('BLOB_STORE_ID_WEBHOOK_PUBLIC_KEY') ||
    readEnv('BLOB_READ_WRITE_TOKEN') ||
    readEnv('BLOB_STORE_ID_READ_WRITE_TOKEN');
  if (!token) {
    throw new Error('BLOB_TOKEN_MISSING');
  }
  return token;
}

export function getBlobAuthOptions(): { token: string; storeId?: string } {
  const storeId = getBlobStoreId();
  return {
    token: getBlobToken(),
    ...(storeId ? { storeId } : {}),
  };
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
