import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatDateTime } from '../../lib/datetime';
import { formatPhoneDisplay } from '../../lib/phone';
import { formatPriceLabel } from '../../lib/format';
import { buildClientWhatsAppMessage, openWhatsAppUrl } from '../../lib/whatsapp';

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  lastBookingAt: string | null;
  confirmedCount: number;
  cancelledCount: number;
};

type ClientBooking = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  serviceDuration: number;
  priceCents: number;
};

type ClientDetail = {
  client: { id: string; name: string; email: string; phone: string; createdAt: string };
  stats: {
    totalBookings: number;
    confirmedCount: number;
    cancelledCount: number;
    lastBookingAt: string | null;
    firstBookingAt: string | null;
  };
  bookings: ClientBooking[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

function statusClass(status: string) {
  if (status === 'confirmed') return 'status-confirmed text-xs';
  if (status === 'pending') return 'status-pending text-xs';
  return 'status-cancelled text-xs';
}

export function ClientsList() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsappClientTemplate, setWhatsappClientTemplate] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/clients'), fetch('/api/business')])
      .then(async ([clientsRes, bizRes]) => {
        const clientsData = await clientsRes.json();
        const bizData = await bizRes.json();
        const list: ClientRow[] = clientsData.clients ?? [];
        setClients(list);
        setBusinessName(bizData.business?.name ?? 'Ortiga Tattoo');
        setWhatsappClientTemplate(bizData.business?.whatsappClientMessageTemplate ?? null);
        if (list.length > 0) setSelectedId(list[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/clients/${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [clients, search]);

  function handleWhatsAppClient() {
    if (!detail) return;
    const message = buildClientWhatsAppMessage({
      clientName: detail.client.name,
      businessName,
      template: whatsappClientTemplate,
    });
    openWhatsAppUrl(detail.client.phone, message);
  }

  if (loading) return <p className="text-muted">Cargando clientes...</p>;

  if (clients.length === 0) {
    return <p className="text-muted">Aún no hay clientes registrados.</p>;
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, email o teléfono..."
        className="input-field max-w-md"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="card max-h-[70vh] space-y-2 overflow-y-auto p-3">
          <p className="px-2 text-xs uppercase tracking-wider text-muted">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
          </p>
          {filteredClients.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted">Sin resultados.</p>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedId === client.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedId(client.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isSelected ? 'client-list-item-active' : 'border-border hover:border-accent'
                  }`}
                >
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted">{client.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                    <span>{client.totalBookings} turnos</span>
                    <span>·</span>
                    <span>{client.confirmedCount} confirmados</span>
                    {client.lastBookingAt && (
                      <>
                        <span>·</span>
                        <span>Último: {formatDate(new Date(client.lastBookingAt))}</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="card min-h-[320px]">
          {detailLoading ? (
            <p className="text-muted">Cargando detalle...</p>
          ) : !detail ? (
            <p className="text-muted">Seleccioná un cliente para ver su información.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-semibold">{detail.client.name}</h2>
                  <p className="text-sm text-muted">
                    Cliente desde {formatDate(new Date(detail.client.createdAt))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWhatsAppClient}
                  className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  WhatsApp
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="client-detail-field rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted">Email</p>
                  <a href={`mailto:${detail.client.email}`} className="text-sm text-ink hover:underline">
                    {detail.client.email}
                  </a>
                </div>
                <div className="client-detail-field rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted">Teléfono</p>
                  <p className="text-sm">{formatPhoneDisplay(detail.client.phone)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="client-stat rounded-md border border-border p-3 text-center">
                  <p className="font-heading text-3xl font-semibold">{detail.stats.totalBookings}</p>
                  <p className="text-xs text-muted">Total turnos</p>
                </div>
                <div className="client-stat rounded-md border border-border p-3 text-center">
                  <p className="font-heading text-3xl font-semibold text-success">{detail.stats.confirmedCount}</p>
                  <p className="text-xs text-muted">Confirmados</p>
                </div>
                <div className="client-stat rounded-md border border-border p-3 text-center">
                  <p className="font-heading text-3xl font-semibold text-danger">{detail.stats.cancelledCount}</p>
                  <p className="text-xs text-muted">Cancelados</p>
                </div>
              </div>

              <div>
                <h3 className="font-heading mb-3 text-lg font-semibold">Historial de turnos</h3>
                {detail.bookings.length === 0 ? (
                  <p className="text-sm text-muted">Sin turnos registrados.</p>
                ) : (
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                    {detail.bookings.map((booking) => {
                      const price = formatPriceLabel(booking.priceCents, 'fixed');
                      return (
                        <div
                          key={booking.id}
                          className="client-booking-row flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{booking.serviceName}</p>
                            <p className="text-sm text-muted">
                              {formatDateTime(new Date(booking.startAt))} · {booking.serviceDuration} min
                            </p>
                            {price && <p className="text-xs text-muted">{price}</p>}
                          </div>
                          <span className={statusClass(booking.status)}>
                            {STATUS_LABEL[booking.status] ?? booking.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
