import { useEffect, useMemo, useState } from 'react';
import { DAYS_ORDER, DAY_LABELS } from '../../lib/schedule';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import { formatDateTime, parseLocalDateTimeInput } from '../../lib/datetime';

type Block = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
};

const DAY_SHORT: Record<string, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

const emptyBlock = (): Block => ({ dayOfWeek: 'LUNES', startTime: '10:00', endTime: '18:00', active: true });

function getDaySummary(blocks: Block[]): string {
  const dayBlocks = blocks.filter((b) => b.active);
  if (dayBlocks.length === 0) return blocks.length > 0 ? 'Inactivo' : 'Sin horario';
  if (dayBlocks.length === 1) return `${dayBlocks[0].startTime}–${dayBlocks[0].endTime}`;
  return `${dayBlocks.length} rangos`;
}

export function AvailabilityManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bookingBlocks, setBookingBlocks] = useState<
    Array<{ id: string; startAt: string; endAt: string; reason: string | null }>
  >([]);
  const [selectedDay, setSelectedDay] = useState<string>('LUNES');
  const [showBlocks, setShowBlocks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockForm, setBlockForm] = useState({ startAt: '', endAt: '', reason: '' });
  const { run, isLoading } = useAsyncAction();

  const blocksByDay = useMemo(() => {
    const map: Record<string, Array<Block & { index: number }>> = {};
    DAYS_ORDER.forEach((day) => {
      map[day] = [];
    });
    blocks.forEach((block, index) => {
      if (map[block.dayOfWeek]) map[block.dayOfWeek].push({ ...block, index });
    });
    return map;
  }, [blocks]);

  const selectedDayBlocks = blocksByDay[selectedDay] ?? [];

  async function load() {
    const [availRes, blockRes] = await Promise.all([
      fetch('/api/availability'),
      fetch('/api/booking-blocks'),
    ]);
    const availData = await availRes.json();
    const blockData = await blockRes.json();
    setBlocks(availData.blocks?.length ? availData.blocks : [emptyBlock()]);
    setBookingBlocks(blockData.blocks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function addBlock(day: string) {
    setBlocks((b) => [...b, { dayOfWeek: day, startTime: '10:00', endTime: '18:00', active: true }]);
  }

  function updateBlock(index: number, field: keyof Block, value: string | boolean) {
    setBlocks((b) => b.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeBlock(index: number) {
    setBlocks((b) => b.filter((_, i) => i !== index));
  }

  async function saveAvailability() {
    await run('save-avail', async () => {
      const res = await fetch('/api/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) {
        toast.error('Error al guardar los horarios');
        return;
      }
      await load();
      toast.success('Horarios guardados correctamente');
    });
  }

  async function addBookingBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockForm.startAt || !blockForm.endAt) {
      toast.error('Completá desde y hasta');
      return;
    }
    const startAt = parseLocalDateTimeInput(blockForm.startAt);
    const endAt = parseLocalDateTimeInput(blockForm.endAt);
    if (endAt <= startAt) {
      toast.error('La fecha de fin debe ser posterior al inicio');
      return;
    }
    await run('block', async () => {
      const res = await fetch('/api/booking-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          reason: blockForm.reason.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error('Error al agregar el bloqueo');
        return;
      }
      setBlockForm({ startAt: '', endAt: '', reason: '' });
      await load();
      toast.success('Bloqueo agregado');
    });
  }

  async function removeBookingBlock(id: string) {
    await run(`del:${id}`, async () => {
      const res = await fetch('/api/booking-blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error('Error al eliminar el bloqueo');
        return;
      }
      await load();
      toast.success('Bloqueo eliminado');
    });
  }

  if (loading) return <p className="text-muted">Cargando...</p>;

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-semibold">Horarios semanales</h2>
            <p className="text-sm text-muted">Seleccioná un día y configurá sus franjas horarias.</p>
          </div>
          <button type="button" onClick={saveAvailability} disabled={isLoading('save-avail')} className="btn-primary">
            Guardar horarios
          </button>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {DAYS_ORDER.map((day) => {
              const dayBlocks = blocksByDay[day];
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`avail-day-tab ${isSelected ? 'avail-day-tab-active' : ''}`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">{DAY_SHORT[day]}</span>
                  <span className="text-[10px] text-muted">{getDaySummary(dayBlocks)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{DAY_LABELS[selectedDay]}</h3>
              <p className="text-xs text-muted">
                {selectedDayBlocks.length === 0
                  ? 'Sin horarios configurados'
                  : `${selectedDayBlocks.length} franja${selectedDayBlocks.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button type="button" onClick={() => addBlock(selectedDay)} className="admin-chip admin-chip-active text-xs">
              + Rango
            </button>
          </div>

          {selectedDayBlocks.length === 0 ? (
            <p className="py-6 text-center text-sm italic text-muted">Añadí un rango para este día</p>
          ) : (
            <div className="space-y-2">
              {selectedDayBlocks.map((block) => (
                <div key={block.index} className="avail-slot-row flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(e) => updateBlock(block.index, 'startTime', e.target.value)}
                    className="input-field w-auto text-sm"
                  />
                  <span className="text-muted">—</span>
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(e) => updateBlock(block.index, 'endTime', e.target.value)}
                    className="input-field w-auto text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => updateBlock(block.index, 'active', !block.active)}
                    className={`admin-chip text-xs ${block.active ? 'admin-chip-active' : 'admin-chip-inactive'}`}
                  >
                    {block.active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button type="button" onClick={() => removeBlock(block.index)} className="ml-auto text-sm text-danger">
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <button
          type="button"
          onClick={() => setShowBlocks((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold">Bloqueos puntuales</h2>
            <p className="text-sm text-muted">
              {bookingBlocks.length === 0
                ? 'Sin bloqueos activos'
                : `${bookingBlocks.length} bloqueo${bookingBlocks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <span className="text-muted">{showBlocks ? '▲' : '▼'}</span>
        </button>

        {showBlocks && (
          <>
            <form onSubmit={addBookingBlock} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted">Desde</label>
                <input
                  type="datetime-local"
                  required
                  value={blockForm.startAt}
                  onChange={(e) => setBlockForm((f) => ({ ...f, startAt: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Hasta</label>
                <input
                  type="datetime-local"
                  required
                  value={blockForm.endAt}
                  onChange={(e) => setBlockForm((f) => ({ ...f, endAt: e.target.value }))}
                  className="input-field"
                />
              </div>
              <input
                placeholder="Motivo (opcional)"
                value={blockForm.reason}
                onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                className="input-field sm:col-span-2"
              />
              <button type="submit" disabled={isLoading('block')} className="btn-primary sm:col-span-2">
                Agregar bloqueo
              </button>
            </form>
            <ul className="space-y-2">
              {bookingBlocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm">
                      {formatDateTime(new Date(b.startAt))} — {formatDateTime(new Date(b.endAt))}
                    </p>
                    {b.reason && <p className="text-xs text-muted">{b.reason}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBookingBlock(b.id)}
                    disabled={isLoading(`del:${b.id}`)}
                    className="text-sm text-danger"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
