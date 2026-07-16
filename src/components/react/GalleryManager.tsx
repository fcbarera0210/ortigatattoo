import { useEffect, useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../../lib/confirm';
import { GALLERY_MAX_PHOTOS } from '../../lib/gallery/constants';

type Photo = {
  id: string;
  url: string;
  sortOrder: number;
};

export function GalleryManager() {
  const [businessSlug, setBusinessSlug] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    setLoading(true);
    try {
      const [bizRes, galleryRes] = await Promise.all([fetch('/api/business'), fetch('/api/gallery')]);
      const bizData = await bizRes.json();
      const galleryData = await galleryRes.json();
      setBusinessSlug(bizData.business?.slug ?? '');
      setPhotos(galleryData.photos ?? []);
    } catch {
      toast.error('Error al cargar la galería');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUploaded(url: string) {
    await run('add-photo', async () => {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? 'Error al guardar la foto');
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        }).catch(() => {});
        return;
      }
      toast.success('Foto añadida a la galería');
      await load();
    });
  }

  async function removePhoto(id: string) {
    const ok = await confirmDialog({
      title: 'Eliminar foto',
      message: '¿Eliminar esta foto de la galería? Se borrará permanentemente.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    await run(`delete-${id}`, async () => {
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Foto eliminada');
        await load();
      } else {
        toast.error('Error al eliminar la foto');
      }
    });
  }

  async function movePhoto(id: string, direction: 'up' | 'down') {
    const index = photos.findIndex((p) => p.id === id);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= photos.length) return;

    const current = photos[index];
    const other = photos[swapIndex];

    await Promise.all([
      fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, sortOrder: other.sortOrder }),
      }),
      fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, sortOrder: current.sortOrder }),
      }),
    ]);
    await load();
  }

  if (loading) return <p className="text-muted">Cargando galería...</p>;

  const atLimit = photos.length >= GALLERY_MAX_PHOTOS;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {photos.length} / {GALLERY_MAX_PHOTOS} fotos publicadas
      </p>

      <div className="card space-y-4 p-5">
        {businessSlug && (
          <ImageUploader businessSlug={businessSlug} disabled={atLimit || isLoading('add-photo')} onUploaded={handleUploaded} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold">Fotos publicadas</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted">No hay fotos en la galería pública.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
                <img src={photo.url} alt="" className="h-32 w-full rounded-md object-cover sm:w-40" />
                <div className="flex flex-1 flex-col justify-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={index === 0} onClick={() => movePhoto(photo.id, 'up')} className="btn-secondary text-sm">
                      Subir
                    </button>
                    <button
                      type="button"
                      disabled={index === photos.length - 1}
                      onClick={() => movePhoto(photo.id, 'down')}
                      className="btn-secondary text-sm"
                    >
                      Bajar
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      disabled={isLoading(`delete-${photo.id}`)}
                      className="btn-secondary text-sm text-danger"
                    >
                      {isLoading(`delete-${photo.id}`) ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
