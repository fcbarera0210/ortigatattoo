import { useCallback, useEffect, useState } from 'react';
import { formatDateKey } from '../../lib/datetime';
import { useBookingBusiness } from '../../hooks/useBookingBusiness';
import { BookingDayCard, type BookingCardData } from './BookingDayCard';
import { ReservationsCalendar } from './ReservationsCalendar';

type Booking = BookingCardData & {
  startAt: string;
  endAt: string;
  status: string;
};

export function AdminDashboard() {
  const { businessName, whatsappBookingTemplate } = useBookingBusiness();
  const [pending, setPending] = useState<Booking[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const dateStr = formatDateKey(new Date());
    const [pendingRes, todayRes, clientsRes] = await Promise.all([
      fetch('/api/bookings?status=pending'),
      fetch(`/api/bookings?date=${dateStr}`),
      fetch('/api/clients'),
    ]);
    const pendingData = await pendingRes.json();
    const todayData = await todayRes.json();
    const clientsData = await clientsRes.json();
    setPending(pendingData.bookings ?? []);
    setTodayCount(
      (todayData.bookings ?? []).filter((b: Booking) => b.status !== 'cancelled').length,
    );
    setClientCount(clientsData.clients?.length ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const handleChanged = () => setReloadKey((k) => k + 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="font-display text-4xl text-pending">{pending.length}</p>
          <p className="text-sm text-muted">Solicitudes pendientes</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-4xl">{todayCount}</p>
          <p className="text-sm text-muted">Citas hoy</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-4xl">{clientCount}</p>
          <p className="text-sm text-muted">Clientes</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl">Solicitudes pendientes</h2>
        {pending.length === 0 ? (
          <p className="text-muted">No hay solicitudes pendientes de aprobación.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => (
              <BookingDayCard
                key={b.id}
                booking={b}
                businessName={businessName}
                whatsappTemplate={whatsappBookingTemplate}
                onChanged={handleChanged}
                showContact
              />
            ))}
          </div>
        )}
      </section>

      <ReservationsCalendar compact defaultView="week" title="Reservas" />

      <div className="flex flex-wrap gap-3">
        <a href="/admin/agenda" className="btn-primary">
          Ver agenda
        </a>
        <a href="/admin/disponibilidad" className="btn-secondary">
          Disponibilidad
        </a>
      </div>
    </div>
  );
}
