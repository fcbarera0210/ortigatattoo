export const GALLERY_MAX_PHOTOS = 20;

export const BLOB_DOMAIN = '.blob.vercel-storage.com/';

export function isValidBlobUrl(url: string): boolean {
  return url.startsWith('https://') && url.includes(BLOB_DOMAIN);
}
