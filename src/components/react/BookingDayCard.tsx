import { useEffect, useState } from 'react';
import { formatDateTime, formatTime, parseLocalDateTimeInput } from '../../lib/datetime';
import { toDatetimeLocalValue } from '../../lib/calendar-utils';
import { buildBookingWhatsAppMessage, openWhatsAppUrl } from '../../lib/whatsapp';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { toast } from '../../lib/toast';
import { confirmDialog } from '../../lib/confirm';

export type BookingCardData = {
  id: string;
  startAt: string;
  endAt?: string;
  status: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  bodyZone?: string | null;
  sizeNotes?: string | null;
  styleNotes?: string | null;
  description?: string | null;
  instagramHandle?: string | null;
  referenceImageUrl?: string | null;
  adminNotes?: string | null;
  flashDesignId?: string | null;
  flashTitle?: string | null;
};

type BookingDayCardProps = {
  booking: BookingCardData;
  businessName: string;
  whatsappTemplate: string | null;
  onChanged?: () => void | Promise<void>;
  showContact?: boolean;
  compact?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

function statusClass(status: string) {
  if (status === 'confirmed') return 'status-confirmed text-sm';
  if (status === 'pending') return 'status-pending text-sm';
  return 'status-cancelled text-sm';
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="label-mono mb-1">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink">{value}</p>
    </div>
  );
}

export function BookingDayCard({
  booking,
  businessName,
  whatsappTemplate,
  onChanged,
  showContact = false,
  compact = false,
}: BookingDayCardProps) {
  const { run, isLoading } = useAsyncAction();
  const [extending, setExtending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState(booking.adminNotes ?? '');
  const [newEnd, setNewEnd] = useState(
    booking.endAt ? toDatetimeLocalValue(new Date(booking.endAt)) : '',
  );

  useEffect(() => {
    setAdminNotes(booking.adminNotes ?? '');
    setNewEnd(booking.endAt ? toDatetimeLocalValue(new Date(booking.endAt)) : '');
  }, [booking.id, booking.adminNotes, booking.endAt]);

  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';
  const timeLabel = formatTime(new Date(booking.startAt));
  const endLabel = booking.endAt ? formatTime(new Date(booking.endAt)) : null;

  const hasTattooDetails = Boolean(
    booking.bodyZone ||
      booking.sizeNotes ||
      booking.styleNotes ||
      booking.description ||
      booking.instagramHandle ||
      booking.referenceImageUrl ||
      booking.flashTitle ||
      booking.adminNotes,
  );

  async function patchAction(
    action: 'confirm' | 'reject' | 'cancel',
    actionId: string,
    successMsg: string,
    needsConfirm?: { title: string; message: string },
  ) {
    if (needsConfirm) {
      const ok = await confirmDialog({
        title: needsConfirm.title,
        message: needsConfirm.message,
        confirmLabel: 'Sí',
        cancelLabel: 'No',
        danger: action === 'cancel' || action === 'reject',
      });
      if (!ok) return;
    }
    await run(actionId, async () => {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, action }),
      });
      if (!res.ok) {
        toast.error('No se pudo actualizar el turno');
        return;
      }
      await onChanged?.();
      toast.success(successMsg);
    });
  }

  async function saveExtension() {
    if (!newEnd) {
      toast.error('Elegí una nueva hora de fin');
      return;
    }
    const endAt = parseLocalDateTimeInput(newEnd);
    if (endAt <= new Date(booking.startAt)) {
      toast.error('El fin debe ser posterior al inicio');
      return;
    }
    await run(`extend:${booking.id}`, async () => {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, action: 'extend', endAt: newEnd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error ?? 'No se pudo modificar la duración');
        return;
      }
      setExtending(false);
      await onChanged?.();
      toast.success('Duración actualizada');
    });
  }

  async function saveAdminNotes() {
    await run(`notes:${booking.id}`, async () => {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, action: 'adminNotes', adminNotes }),
      });
      if (!res.ok) {
        toast.error('No se pudieron guardar las notas');
        return;
      }
      await onChanged?.();
      toast.success('Notas guardadas');
    });
  }

  function handleWhatsApp() {
    if (!booking.clientPhone) return;
    const message = buildBookingWhatsAppMessage({
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.serviceName,
      startAt: new Date(booking.startAt),
      businessName,
      template: whatsappTemplate,
    });
    openWhatsAppUrl(booking.clientPhone, message);
  }

  return (
    <div className={`calendar-day-item flex flex-col gap-3 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-h-11 min-w-[56px] shrink-0 border border-accent bg-accent/20 px-2 py-2 text-center font-mono text-xs font-bold text-ink">
          {timeLabel}
          {endLabel && <span className="mt-0.5 block text-[10px] font-normal text-muted">→ {endLabel}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{booking.clientName}</p>
          <p className="text-sm text-muted">{booking.serviceName}</p>
          {booking.flashTitle && (
            <p className="text-xs text-muted">Flash: {booking.flashTitle}</p>
          )}
          {!compact && <p className="text-sm text-muted">{formatDateTime(new Date(booking.startAt))}</p>}
          {showContact && (booking.clientEmail || booking.clientPhone) && (
            <p className="text-xs text-muted">
              {[booking.clientEmail, booking.clientPhone].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className={statusClass(booking.status)}>{STATUS_LABEL[booking.status] ?? booking.status}</span>
      </div>

      {detailsOpen && (
        <div className="space-y-4 border border-border bg-surface-light/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Zona del cuerpo" value={booking.bodyZone} />
            <DetailRow label="Tamaño" value={booking.sizeNotes} />
            <DetailRow label="Estilo" value={booking.styleNotes} />
            <DetailRow label="Instagram" value={booking.instagramHandle} />
            <DetailRow label="Flash" value={booking.flashTitle} />
            {booking.endAt && (
              <DetailRow
                label="Horario"
                value={`${formatDateTime(new Date(booking.startAt))} → ${formatTime(new Date(booking.endAt))}`}
              />
            )}
          </div>
          <DetailRow label="Descripción / idea" value={booking.description} />
          {booking.referenceImageUrl && (
            <div>
              <p className="label-mono mb-2">Imagen de referencia</p>
              <a
                href={booking.referenceImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-border"
              >
                <img
                  src={booking.referenceImageUrl}
                  alt="Referencia del tatuaje"
                  className="max-h-48 max-w-full object-contain"
                />
              </a>
            </div>
          )}
          {!hasTattooDetails && (
            <p className="text-sm text-muted">Esta reserva no tiene detalles de tatuaje cargados.</p>
          )}
          <div>
            <label className="label-mono mb-1 block" htmlFor={`admin-notes-${booking.id}`}>
              Notas internas
            </label>
            <textarea
              id={`admin-notes-${booking.id}`}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Notas solo visibles en el panel admin..."
            />
            <button
              type="button"
              onClick={saveAdminNotes}
              disabled={isLoading(`notes:${booking.id}`)}
              className="btn-secondary mt-2 text-sm"
            >
              Guardar notas
            </button>
          </div>
        </div>
      )}

      {extending && (
        <div className="flex flex-wrap items-center gap-2 border border-border p-3">
          <label className="label-mono">Nueva hora de fin</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="input-field w-auto text-sm"
          />
          <button type="button" onClick={saveExtension} disabled={isLoading(`extend:${booking.id}`)} className="btn-primary text-sm">
            Guardar
          </button>
          <button type="button" onClick={() => setExtending(false)} className="btn-ghost text-sm">
            Cancelar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="btn-secondary text-sm"
        >
          {detailsOpen ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
        {booking.status !== 'cancelled' && (
          <>
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => patchAction('confirm', `confirm:${booking.id}`, 'Turno confirmado')}
                  disabled={isLoading(`confirm:${booking.id}`)}
                  className="btn-primary text-sm"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchAction('reject', `reject:${booking.id}`, 'Solicitud rechazada', {
                      title: 'Rechazar solicitud',
                      message: '¿Rechazar esta solicitud de turno?',
                    })
                  }
                  disabled={isLoading(`reject:${booking.id}`)}
                  className="btn-secondary text-sm text-danger"
                >
                  Rechazar
                </button>
              </>
            )}
            {isConfirmed && (
              <button
                type="button"
                onClick={() =>
                  patchAction('cancel', `cancel:${booking.id}`, 'Turno cancelado', {
                    title: 'Cancelar turno',
                    message: '¿Cancelar este turno confirmado?',
                  })
                }
                disabled={isLoading(`cancel:${booking.id}`)}
                className="btn-secondary text-sm text-danger"
              >
                Cancelar
              </button>
            )}
            {booking.endAt && (
              <button type="button" onClick={() => setExtending((v) => !v)} className="btn-secondary text-sm">
                Extender
              </button>
            )}
            {booking.clientPhone && (
              <button
                type="button"
                onClick={handleWhatsApp}
                className="min-h-9 rounded-md bg-whatsapp px-4 py-2 text-sm font-medium text-white"
              >
                WhatsApp
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
