import { WEBP_BLOB_MAX_BYTES } from './blob-webp-upload';

const UPLOAD_API = '/api/upload';

const HEIC_MIMES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const HEIC_EXT = /\.(heic|heif)$/i;

const WORKER_OPTIMIZE_TIMEOUT_MS = 15_000;
const MAIN_THREAD_OPTIMIZE_TIMEOUT_MS = 30_000;

function isHeic(file: File): boolean {
  return HEIC_MIMES.includes(file.type) || HEIC_EXT.test(file.name);
}

const HEIC_ERROR_MESSAGE =
  'Este archivo HEIC/HEIF no pudo convertirse. Conviértelo a JPG o PNG en tu dispositivo y súbelo de nuevo.';

export async function convertHeicToJpgIfNeeded(file: File): Promise<File> {
  if (!isHeic(file)) return file;

  try {
    const { heicTo } = await import('heic-to');
    const blob = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.9,
    });
    const name = file.name.replace(HEIC_EXT, '.jpg');
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
    if (/HEIF|HEIC|format not supported|ERR_LIBHEIF|decode|parse/i.test(msg)) {
      throw new Error(HEIC_ERROR_MESSAGE);
    }
    throw e;
  }
}

const compressionOptions = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('CANVAS_BLOB_FAILED'))),
      type,
      quality,
    );
  });
}

async function compressWithCanvas(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDim = 1920;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('CANVAS_CONTEXT_FAILED');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen';
    const qualities = [0.85, 0.75, 0.65, 0.55, 0.45];
    let lastBlob: Blob | null = null;
    for (const q of qualities) {
      const blob = await canvasToBlob(canvas, 'image/webp', q);
      lastBlob = blob;
      if (blob.size <= WEBP_BLOB_MAX_BYTES) {
        return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
      }
    }
    if (!lastBlob) throw new Error('CANVAS_BLOB_FAILED');
    return new File([lastBlob], `${baseName}.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}

async function runImageCompression(file: File, useWebWorker: boolean): Promise<File> {
  const imageCompression = (await import('browser-image-compression')).default;
  return imageCompression(file, { ...compressionOptions, useWebWorker });
}

export async function optimizeImage(
  file: File,
  opts?: { useWebWorker?: boolean },
): Promise<File> {
  const preferWorker = opts?.useWebWorker ?? true;

  if (preferWorker) {
    try {
      return await withTimeout(
        runImageCompression(file, true),
        WORKER_OPTIMIZE_TIMEOUT_MS,
        'OPTIMIZE_WORKER',
      );
    } catch {
      /* fallback */
    }
  }

  try {
    return await withTimeout(
      runImageCompression(file, false),
      MAIN_THREAD_OPTIMIZE_TIMEOUT_MS,
      'OPTIMIZE_MAIN',
    );
  } catch {
    return compressWithCanvas(file);
  }
}

export async function uploadGalleryImage(
  file: File,
  businessSlug: string,
  kind: 'gallery' | 'flash' | 'reference' = 'gallery',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessSlug', businessSlug);
  formData.append('kind', kind);

  const res = await fetch(UPLOAD_API, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Error al subir la imagen');
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}
