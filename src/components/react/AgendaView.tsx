import { useEffect, useState } from 'react';
import { addDaysToDateStr, endOfDay, formatDateKey, startOfDay } from '../../lib/datetime';
import { toast } from '../../lib/toast';
import { useBookingBusiness } from '../../hooks/useBookingBusiness';
import { BookingDayCard, type BookingCardData } from './BookingDayCard';
import { ReservationsCalendar } from './ReservationsCalendar';

type Booking = BookingCardData & {
  startAt: string;
  endAt: string;
  status: string;
};

type ViewMode = 'list' | 'calendar';
type StatusFilter = 'all' | 'pending' | 'confirmed';

export function AgendaView() {
  const { businessName, whatsappBookingTemplate } = useBookingBusiness();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [range, setRange] = useState<'day' | 'week'>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [date, setDate] = useState(() => formatDateKey(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  async function load() {
    setLoading(true);
    try {
      let url: string;
      if (range === 'day') {
        url = `/api/bookings?date=${date}`;
      } else {
        const endKey = addDaysToDateStr(date, 6);
        url = `/api/bookings?from=${startOfDay(date).toISOString()}&to=${endOfDay(endKey).toISOString()}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
      toast.error('No se pudo cargar la agenda');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode === 'list') load();
  }, [date, range, viewMode, reloadKey]);

  const visibleBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return b.status !== 'cancelled';
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={viewMode === 'calendar' ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
          >
            Calendario
          </button>
        </div>

        {viewMode === 'list' && (
          <>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRange('day')}
                className={range === 'day' ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
              >
                Día
              </button>
              <button
                type="button"
                onClick={() => setRange('week')}
                className={range === 'week' ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
              >
                Semana
              </button>
            </div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-auto" />
            <div className="flex gap-1">
              {(['all', 'pending', 'confirmed'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={statusFilter === s ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
                >
                  {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendientes' : 'Confirmados'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <ReservationsCalendar defaultView="month" title="Agenda" enableActions showAgendaLink={false} />
      ) : loading ? (
        <p className="text-muted">Cargando agenda...</p>
      ) : visibleBookings.length === 0 ? (
        <p className="text-muted">No hay turnos en este período.</p>
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((b) => (
            <BookingDayCard
              key={b.id}
              booking={b}
              businessName={businessName}
              whatsappTemplate={whatsappBookingTemplate}
              onChanged={() => setReloadKey((k) => k + 1)}
              showContact
            />
          ))}
        </div>
      )}
    </div>
  );
}
