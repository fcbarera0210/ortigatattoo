import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type GalleryPhoto = {
  id: string;
  url: string;
};

type GalleryLightboxProps = {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
};

export function GalleryLightbox({ photos, index, onClose, onChangeIndex }: GalleryLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const photo = photos[index];
  const hasMultiple = photos.length > 1;

  const goPrev = useCallback(() => {
    onChangeIndex((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onChangeIndex]);

  const goNext = useCallback(() => {
    onChangeIndex((index + 1) % photos.length);
  }, [index, photos.length, onChangeIndex]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, goPrev, goNext]);

  if (!photo || !mounted) return null;

  return createPortal(
    <div
      className="gallery-lightbox-overlay fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de galería"
      onClick={onClose}
    >
      <div className="gallery-lightbox-panel flex w-full flex-col overflow-hidden sm:max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="text-xs uppercase tracking-widest text-muted">
            Foto {index + 1} de {photos.length}
          </p>
          <button type="button" onClick={onClose} className="gallery-lightbox-close" aria-label="Cerrar">
            Cerrar
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-surface-light sm:aspect-[4/3] sm:flex-none">
          <img
            src={photo.url}
            alt={`Foto ${index + 1} de ${photos.length}`}
            className="absolute inset-0 h-full w-full object-contain p-1 sm:p-4"
          />

          {hasMultiple && (
            <>
              <button type="button" onClick={goPrev} className="gallery-lightbox-nav gallery-lightbox-nav-prev" aria-label="Anterior">
                ‹
              </button>
              <button type="button" onClick={goNext} className="gallery-lightbox-nav gallery-lightbox-nav-next" aria-label="Siguiente">
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
