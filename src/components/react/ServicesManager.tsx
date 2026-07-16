import { useEffect, useState } from 'react';
import { formatPriceLabel, type PriceDisplay } from '../../lib/format';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../../lib/confirm';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  priceDisplay: PriceDisplay;
  active: boolean;
  sortOrder: number;
};

type ServiceForm = {
  name: string;
  description: string;
  durationMin: number;
  priceArs: number;
  priceDisplay: PriceDisplay;
};

const emptyForm = (): ServiceForm => ({
  name: '',
  description: '',
  durationMin: 60,
  priceArs: 0,
  priceDisplay: 'from',
});

function toEditForm(service: Service): ServiceForm {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMin: service.durationMin,
    priceArs: service.priceCents,
    priceDisplay: service.priceDisplay,
  };
}

const PRICE_DISPLAY_LABELS: Record<PriceDisplay, string> = {
  hidden: 'Oculto',
  from: 'Desde',
  fixed: 'Fijo',
};

function ServiceFields({
  form,
  onChange,
  disabled,
}: {
  form: ServiceForm;
  onChange: (next: ServiceForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input
        placeholder="Nombre"
        required
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        className="input-field"
        disabled={disabled}
      />
      <input
        type="number"
        placeholder="Duración (min)"
        required
        min={5}
        value={form.durationMin}
        onChange={(e) => onChange({ ...form, durationMin: Number(e.target.value) })}
        className="input-field"
        disabled={disabled}
      />
      <input
        type="number"
        placeholder="Precio (ARS)"
        min={0}
        value={form.priceArs}
        onChange={(e) => onChange({ ...form, priceArs: Number(e.target.value) })}
        className="input-field"
        disabled={disabled}
      />
      <select
        value={form.priceDisplay}
        onChange={(e) => onChange({ ...form, priceDisplay: e.target.value as PriceDisplay })}
        className="input-field"
        disabled={disabled}
      >
        <option value="hidden">Precio oculto</option>
        <option value="from">Mostrar "Desde"</option>
        <option value="fixed">Precio fijo</option>
      </select>
      <textarea
        placeholder="Descripción"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        className="input-field min-h-[70px] sm:col-span-2"
        disabled={disabled}
      />
    </div>
  );
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>(emptyForm);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const res = await fetch('/api/services?admin=1');
    const data = await res.json();
    setServices(data.services ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditForm(toEditForm(service));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await run('create', async () => {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          durationMin: createForm.durationMin,
          priceCents: Math.round(createForm.priceArs),
          priceDisplay: createForm.priceDisplay,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Error al crear el servicio');
        return;
      }
      setCreateForm(emptyForm());
      await load();
      toast.success('Servicio agregado correctamente');
    });
  }

  async function handleUpdate(e: React.FormEvent, id: string) {
    e.preventDefault();
    await run(`save:${id}`, async () => {
      const res = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          durationMin: editForm.durationMin,
          priceCents: Math.round(editForm.priceArs),
          priceDisplay: editForm.priceDisplay,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Error al guardar el servicio');
        return;
      }
      cancelEdit();
      await load();
      toast.success('Servicio actualizado correctamente');
    });
  }

  async function toggleActive(id: string, active: boolean) {
    await run(`toggle:${id}`, async () => {
      const res = await fetch('/api/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      });
      if (!res.ok) {
        toast.error('Error al cambiar el estado del servicio');
        return;
      }
      await load();
      toast.success(active ? 'Servicio desactivado' : 'Servicio activado');
    });
  }

  async function remove(id: string) {
    const ok = await confirmDialog({
      title: 'Eliminar servicio',
      message: '¿Eliminar este servicio? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    await run(`del:${id}`, async () => {
      const res = await fetch('/api/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error('Error al eliminar el servicio');
        return;
      }
      await load();
      toast.success('Servicio eliminado');
    });
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="card space-y-4">
        <h2 className="font-heading text-2xl font-semibold">Nuevo servicio</h2>
        <ServiceFields form={createForm} onChange={setCreateForm} disabled={isLoading('create')} />
        <button type="submit" disabled={isLoading('create')} className="btn-primary">
          Agregar
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Servicios</h2>
        {services.length === 0 ? (
          <p className="text-muted">No hay servicios creados.</p>
        ) : (
          services.map((s) => {
            const isEditing = editingId === s.id;
            const priceLabel = formatPriceLabel(s.priceCents, s.priceDisplay);
            return (
              <div key={s.id} className="card space-y-4">
                {isEditing ? (
                  <form onSubmit={(e) => void handleUpdate(e, s.id)} className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Editando servicio</p>
                    <ServiceFields form={editForm} onChange={setEditForm} disabled={isLoading(`save:${s.id}`)} />
                    <div className="flex flex-wrap gap-3">
                      <button type="submit" disabled={isLoading(`save:${s.id}`)} className="btn-primary">
                        Guardar cambios
                      </button>
                      <button type="button" onClick={cancelEdit} className="btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-heading text-xl font-semibold">
                        {s.name} {!s.active && <span className="text-sm text-muted">(inactivo)</span>}
                      </p>
                      {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                      <p className="mt-1 text-sm text-muted">
                        {s.durationMin} min
                        {priceLabel ? ` · ${priceLabel}` : ` · Precio ${PRICE_DISPLAY_LABELS[s.priceDisplay].toLowerCase()}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(s)} disabled={editingId !== null} className="btn-secondary text-sm">
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(s.id, s.active)}
                        disabled={isLoading(`toggle:${s.id}`) || editingId !== null}
                        className="btn-secondary text-sm"
                      >
                        {s.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        disabled={isLoading(`del:${s.id}`) || editingId !== null}
                        className="btn-secondary text-sm text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
