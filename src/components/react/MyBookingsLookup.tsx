import { useState } from 'react';
import { formatDateTime } from '../../lib/datetime';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../../lib/confirm';
import { useBookingBusiness } from '../../hooks/useBookingBusiness';
import { useAsyncAction } from '../../hooks/useAsyncAction';

type Booking = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  serviceId: string;
  flashDesignId: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

function statusClass(status: string) {
  if (status === 'confirmed') return 'status-confirmed';
  if (status === 'pending') return 'status-pending';
  return 'status-cancelled';
}

export function MyBookingsLookup() {
  const { minCancelHours } = useBookingBusiness();
  const { run, isLoading } = useAsyncAction();
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [reDate, setReDate] = useState('');
  const [reSlots, setReSlots] = useState<string[]>([]);
  const [reTime, setReTime] = useState('');
  const [reLoading, setReLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(false);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Error al buscar reservas');
        return;
      }
      setClientName(data.client?.name ?? '');
      setBookings(data.bookings ?? []);
      setSearchEmail(email);
      setSearched(true);
      if ((data.bookings ?? []).length === 0) toast.info('No hay reservas con este email');
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function canModify(b: Booking): boolean {
    if (b.status === 'cancelled') return false;
    if (b.status === 'pending') return true;
    const hoursUntil = (new Date(b.startAt).getTime() - Date.now()) / 3_600_000;
    return hoursUntil >= minCancelHours;
  }

  async function cancelBooking(b: Booking) {
    const ok = await confirmDialog({
      title: 'Cancelar reserva',
      message: '¿Seguro que querés cancelar esta reserva?',
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No',
      danger: true,
    });
    if (!ok) return;
    await run(`cancel:${b.id}`, async () => {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, email: searchEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo cancelar la reserva');
        return;
      }
      toast.success('Reserva cancelada');
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: 'cancelled' } : x)));
    });
  }

  function openReschedule(b: Booking) {
    setReschedulingId(b.id);
    setReDate('');
    setReSlots([]);
    setReTime('');
  }

  function loadReslots(b: Booking, day: string) {
    setReDate(day);
    setReTime('');
    setReSlots([]);
    setReLoading(true);
    const params = new URLSearchParams({ serviceId: b.serviceId });
    if (b.flashDesignId) params.set('flashDesignId', b.flashDesignId);
    fetch(`/api/slots?date=${day}&${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setReSlots(d.slots ?? []))
      .catch(() => setReSlots([]))
      .finally(() => setReLoading(false));
  }

  async function submitReschedule(b: Booking) {
    if (!reDate || !reTime) {
      toast.error('Elegí fecha y horario');
      return;
    }
    await run(`resch:${b.id}`, async () => {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: b.id, email: searchEmail, date: reDate, time: reTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo reprogramar');
        return;
      }
      toast.success('Reserva reprogramada. Queda pendiente de confirmación.');
      setReschedulingId(null);
      await handleSearch({ preventDefault() {} } as React.FormEvent);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <form onSubmit={handleSearch} className="card gothic-frame space-y-4">
        <p className="section-eyebrow">Consultas</p>
        <h1 className="font-heading text-3xl font-semibold tracking-[0.1em]">Mis reservas</h1>
        <div className="divider-crimson" />
        <p className="text-sm text-muted">Ingresá tu email para ver el estado de tus turnos.</p>
        <div>
          <label className="label-mono mb-1 block" htmlFor="lookup-email">
            Email
          </label>
          <input
            id="lookup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Buscando...' : 'Buscar reservas'}
        </button>
      </form>

      {searched && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-center text-muted">No hay reservas con este email.</p>
          ) : (
            <>
              {clientName && (
                <p className="text-center text-sm text-muted">
                  Hola, <span className="text-ink">{clientName}</span>
                </p>
              )}
              <ul className="space-y-4">
                {bookings.map((b) => {
                  const modifiable = canModify(b);
                  const isRescheduling = reschedulingId === b.id;
                  return (
                    <li key={b.id} className="card space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-xl font-semibold">{b.serviceName}</p>
                          <p className="mt-1 text-sm text-muted">{formatDateTime(new Date(b.startAt))}</p>
                        </div>
                        <span className={`text-xs uppercase ${statusClass(b.status)}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </div>

                      {modifiable && !isRescheduling && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openReschedule(b)} className="btn-secondary text-sm">
                            Reprogramar
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelBooking(b)}
                            disabled={isLoading(`cancel:${b.id}`)}
                            className="btn-secondary text-sm text-danger"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {b.status === 'confirmed' && !modifiable && (
                        <p className="text-xs text-muted">
                          Los cambios se permiten hasta {minCancelHours}h antes del turno. Escribinos por WhatsApp para
                          modificarlo.
                        </p>
                      )}

                      {isRescheduling && (
                        <div className="space-y-3 rounded-md border border-border p-3">
                          <div>
                            <label className="label-mono mb-1 block">Nueva fecha</label>
                            <input
                              type="date"
                              value={reDate}
                              onChange={(e) => loadReslots(b, e.target.value)}
                              className="input-field w-auto"
                            />
                          </div>
                          {reLoading ? (
                            <p className="text-sm text-muted">Cargando horarios...</p>
                          ) : reDate && reSlots.length === 0 ? (
                            <p className="text-sm text-muted">Sin horarios disponibles ese día.</p>
                          ) : (
                            reSlots.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {reSlots.map((slot) => (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setReTime(slot)}
                                    className={`slot-btn ${reTime === slot ? 'slot-btn-selected' : ''}`}
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            )
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => submitReschedule(b)}
                              disabled={isLoading(`resch:${b.id}`)}
                              className="btn-primary text-sm"
                            >
                              Confirmar cambio
                            </button>
                            <button type="button" onClick={() => setReschedulingId(null)} className="btn-ghost text-sm">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {b.status === 'cancelled' && (
                        <a href={`/reservar?serviceId=${b.serviceId}`} className="text-sm text-ink hover:underline">
                          Reservar de nuevo
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
