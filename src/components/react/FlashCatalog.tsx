import { useEffect, useState } from 'react';
import { formatPriceLabel, type PriceDisplay } from '../../lib/format';
import { toast } from '../../lib/toast';

type Flash = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
  reserved: boolean;
};

export function FlashCatalog() {
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/flash')
      .then((r) => r.json())
      .then((d) => setFlashes(d.flash ?? d.flashes ?? []))
      .catch(() => toast.error('No se pudieron cargar los diseños'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Cargando diseños...</p>;

  if (flashes.length === 0) {
    return <p className="text-muted">No hay diseños flash disponibles por el momento.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {flashes.map((flash) => {
        const price = formatPriceLabel(flash.priceCents, flash.priceDisplay);
        const content = (
          <>
            <div className="aspect-square w-full overflow-hidden">
              <img src={flash.imageUrl} alt={flash.title} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <p className="truncate font-heading text-sm tracking-[0.06em]">{flash.title}</p>
              <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                {flash.reserved ? 'Reservado' : [`${flash.durationMin} min`, price].filter(Boolean).join(' · ')}
              </p>
            </div>
          </>
        );

        if (flash.reserved) {
          return (
            <div key={flash.id} className="gallery-item cursor-default opacity-50">
              {content}
            </div>
          );
        }

        return (
          <a key={flash.id} href={`/reservar?flashId=${flash.id}`} className="gallery-item block">
            {content}
          </a>
        );
      })}
    </div>
  );
}
