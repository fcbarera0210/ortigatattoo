import { put } from '@vercel/blob';

export const WEBP_BLOB_MAX_BYTES = 300 * 1024;
export const WEBP_BLOB_MIME = 'image/webp';

export function getBlobToken(): string {
  const token =
    (typeof import.meta !== 'undefined' && import.meta.env?.BLOB_READ_WRITE_TOKEN) ||
    process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_TOKEN_MISSING');
  }
  return token;
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
    token: getBlobToken(),
    ...(options?.allowOverwrite && { allowOverwrite: true }),
  });
  return { pathname: path, url: blob.url };
}
