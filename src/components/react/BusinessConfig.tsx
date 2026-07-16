import { useEffect, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import {
  BOOKING_WHATSAPP_VARIABLES,
  CLIENT_WHATSAPP_VARIABLES,
  WhatsAppMessageEditor,
} from './WhatsAppMessageEditor';
import {
  DEFAULT_WHATSAPP_BOOKING_TEMPLATE,
  DEFAULT_WHATSAPP_CLIENT_TEMPLATE,
} from '../../lib/whatsapp';

type Business = {
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  whatsappMessageTemplate: string | null;
  whatsappClientMessageTemplate: string | null;
  mapsUrl: string | null;
  instagramUrl: string | null;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  minCancelHours: number;
};

export function BusinessConfig() {
  const [form, setForm] = useState<Business | null>(null);
  const { run, isLoading } = useAsyncAction();

  useEffect(() => {
    fetch('/api/business')
      .then((r) => r.json())
      .then((d) => setForm(d.business));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    await run('save', async () => {
      const res = await fetch('/api/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Configuración guardada correctamente');
      } else {
        toast.error('Error al guardar la configuración');
      }
    });
  }

  if (!form) return <p className="text-muted">Cargando...</p>;

  return (
    <form onSubmit={handleSave} className="card space-y-6">
      <div className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold">Datos del estudio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-muted">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-muted">Descripción</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
              className="input-field min-h-[80px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Dirección</label>
            <input
              value={form.address ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, address: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Teléfono</label>
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, phone: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">WhatsApp (con código país)</label>
            <input
              value={form.whatsappNumber ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, whatsappNumber: e.target.value })}
              className="input-field"
              placeholder="5492211234567"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Instagram URL</label>
            <input
              value={form.instagramUrl ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, instagramUrl: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-muted">Google Maps URL</label>
            <input
              value={form.mapsUrl ?? ''}
              onChange={(e) => setForm((f) => f && { ...f, mapsUrl: e.target.value })}
              className="input-field"
              placeholder="https://maps.app.goo.gl/..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="font-heading text-xl font-semibold">Reglas de reserva</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Anticipación mín. (horas)</label>
            <input
              type="number"
              min={0}
              max={168}
              value={form.minAdvanceHours}
              onChange={(e) => setForm((f) => f && { ...f, minAdvanceHours: Number(e.target.value) })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Días máx. para reservar</label>
            <input
              type="number"
              min={1}
              max={120}
              value={form.maxAdvanceDays}
              onChange={(e) => setForm((f) => f && { ...f, maxAdvanceDays: Number(e.target.value) })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Cancelación mín. (horas)</label>
            <input
              type="number"
              min={0}
              max={168}
              value={form.minCancelHours}
              onChange={(e) => setForm((f) => f && { ...f, minCancelHours: Number(e.target.value) })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="font-heading text-xl font-semibold">Mensajes de WhatsApp</h3>
        <p className="text-sm text-muted">
          Personaliza los mensajes que se abren al contactar clientes. Pasa el cursor sobre cada variable para ver qué
          hace.
        </p>
        <WhatsAppMessageEditor
          label="Mensaje al contactar por un turno (agenda)"
          value={form.whatsappMessageTemplate ?? ''}
          placeholder={DEFAULT_WHATSAPP_BOOKING_TEMPLATE}
          variables={BOOKING_WHATSAPP_VARIABLES}
          onChange={(whatsappMessageTemplate) => setForm((f) => f && { ...f, whatsappMessageTemplate })}
        />
        <WhatsAppMessageEditor
          label="Mensaje al contactar un cliente (listado)"
          value={form.whatsappClientMessageTemplate ?? ''}
          placeholder={DEFAULT_WHATSAPP_CLIENT_TEMPLATE}
          variables={CLIENT_WHATSAPP_VARIABLES}
          onChange={(whatsappClientMessageTemplate) => setForm((f) => f && { ...f, whatsappClientMessageTemplate })}
        />
      </div>

      <button type="submit" disabled={isLoading('save')} className="btn-primary">
        {isLoading('save') ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}
