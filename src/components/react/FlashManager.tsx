import { useEffect, useState } from 'react';
import { formatPriceLabel, type PriceDisplay } from '../../lib/format';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../../lib/confirm';
import { ImageUploader } from './ImageUploader';

type Flash = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
  active: boolean;
  reserved: boolean;
  sortOrder: number;
};

type FlashForm = {
  title: string;
  description: string;
  imageUrl: string;
  durationMin: number;
  priceArs: number;
  priceDisplay: PriceDisplay;
};

const emptyForm = (): FlashForm => ({
  title: '',
  description: '',
  imageUrl: '',
  durationMin: 60,
  priceArs: 0,
  priceDisplay: 'from',
});

export function FlashManager() {
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessSlug, setBusinessSlug] = useState('');
  const [createForm, setCreateForm] = useState<FlashForm>(emptyForm);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const [bizRes, flashRes] = await Promise.all([fetch('/api/business'), fetch('/api/flash?admin=1')]);
    const bizData = await bizRes.json();
    const flashData = await flashRes.json();
    setBusinessSlug(bizData.business?.slug ?? '');
    setFlashes(flashData.flash ?? flashData.flashes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.imageUrl) {
      toast.error('Subí una imagen para el flash');
      return;
    }
    await run('create', async () => {
      const res = await fetch('/api/flash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          imageUrl: createForm.imageUrl,
          durationMin: createForm.durationMin,
          priceCents: Math.round(createForm.priceArs),
          priceDisplay: createForm.priceDisplay,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Error al crear el flash');
        return;
      }
      setCreateForm(emptyForm());
      await load();
      toast.success('Flash agregado correctamente');
    });
  }

  async function patch(id: string, body: Record<string, unknown>, actionId: string, successMsg: string) {
    await run(actionId, async () => {
      const res = await fetch('/api/flash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        toast.error('Error al actualizar el flash');
        return;
      }
      await load();
      toast.success(successMsg);
    });
  }

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: 'Eliminar flash',
      message: '¿Eliminar este diseño flash? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    await run(`del:${id}`, async () => {
      const res = await fetch('/api/flash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error('Error al eliminar el flash');
        return;
      }
      await load();
      toast.success('Flash eliminado');
    });
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="card space-y-4">
        <h2 className="font-heading text-2xl font-semibold">Nuevo flash</h2>

        {createForm.imageUrl ? (
          <div className="flex items-center gap-4">
            <img src={createForm.imageUrl} alt="" className="h-28 w-28 rounded-md object-cover" />
            <button
              type="button"
              onClick={() => setCreateForm((f) => ({ ...f, imageUrl: '' }))}
              className="btn-secondary text-sm"
            >
              Cambiar imagen
            </button>
          </div>
        ) : (
          businessSlug && (
            <ImageUploader
              businessSlug={businessSlug}
              kind="flash"
              onUploaded={(url) => setCreateForm((f) => ({ ...f, imageUrl: url }))}
            />
          )
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            placeholder="Título"
            required
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Duración (min)"
            required
            min={5}
            value={createForm.durationMin}
            onChange={(e) => setCreateForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Precio (ARS)"
            min={0}
            value={createForm.priceArs}
            onChange={(e) => setCreateForm((f) => ({ ...f, priceArs: Number(e.target.value) }))}
            className="input-field"
          />
          <select
            value={createForm.priceDisplay}
            onChange={(e) => setCreateForm((f) => ({ ...f, priceDisplay: e.target.value as PriceDisplay }))}
            className="input-field"
          >
            <option value="hidden">Precio oculto</option>
            <option value="from">Mostrar "Desde"</option>
            <option value="fixed">Precio fijo</option>
          </select>
          <textarea
            placeholder="Descripción"
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            className="input-field min-h-[70px] sm:col-span-2"
          />
        </div>
        <button type="submit" disabled={isLoading('create')} className="btn-primary">
          Agregar flash
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Diseños flash</h2>
        {flashes.length === 0 ? (
          <p className="text-muted">No hay diseños flash creados.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {flashes.map((flash) => {
              const priceLabel = formatPriceLabel(flash.priceCents, flash.priceDisplay);
              return (
                <div key={flash.id} className="card space-y-3">
                  <div className="flex gap-4">
                    <img src={flash.imageUrl} alt={flash.title} className="h-24 w-24 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="font-heading text-lg font-semibold">
                        {flash.title} {!flash.active && <span className="text-sm text-muted">(inactivo)</span>}
                      </p>
                      {flash.description && <p className="mt-1 text-sm text-muted line-clamp-2">{flash.description}</p>}
                      <p className="mt-1 text-sm text-muted">
                        {flash.durationMin} min{priceLabel ? ` · ${priceLabel}` : ''}
                      </p>
                      {flash.reserved && <span className="mt-1 inline-block text-xs text-pending">Reservado</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => patch(flash.id, { reserved: !flash.reserved }, `res:${flash.id}`, flash.reserved ? 'Marcado como disponible' : 'Marcado como reservado')}
                      disabled={isLoading(`res:${flash.id}`)}
                      className="btn-secondary text-sm"
                    >
                      {flash.reserved ? 'Marcar disponible' : 'Marcar reservado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => patch(flash.id, { active: !flash.active }, `tog:${flash.id}`, flash.active ? 'Flash desactivado' : 'Flash activado')}
                      disabled={isLoading(`tog:${flash.id}`)}
                      className="btn-secondary text-sm"
                    >
                      {flash.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(flash.id)}
                      disabled={isLoading(`del:${flash.id}`)}
                      className="btn-secondary text-sm text-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
