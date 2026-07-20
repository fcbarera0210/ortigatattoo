import { useState } from 'react';
import { GalleryLightbox, type GalleryPhoto } from './GalleryLightbox';

type GallerySectionProps = {
  photos: GalleryPhoto[];
};

export function GallerySection({ photos }: GallerySectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section id="galeria" className="mt-24">
      <div className="mb-8 border-b border-border pb-4">
        <p className="section-eyebrow">Galería</p>
        <h2 className="font-heading mt-2 text-4xl font-semibold tracking-[0.1em] md:text-5xl">Trabajos</h2>
        <div className="divider-crimson mt-4" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="gallery-item aspect-square"
            aria-label={`Ver foto ${index + 1}`}
          >
            <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChangeIndex={setOpenIndex}
        />
      )}
    </section>
  );
}
