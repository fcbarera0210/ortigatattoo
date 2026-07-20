import type { BookingCardData } from './BookingDayCard';
import { BookingDayCard } from './BookingDayCard';
import { formatDate } from '../../lib/datetime';

type DayDetailSheetProps = {
  date: Date;
  bookings: BookingCardData[];
  businessName: string;
  whatsappTemplate: string | null;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
  showAgendaLink?: boolean;
};

export function DayDetailSheet({
  date,
  bookings,
  businessName,
  whatsappTemplate,
  onClose,
  onChanged,
  showAgendaLink = true,
}: DayDetailSheetProps) {
  const dateLabel = formatDate(date);

  return (
    <div
      className="calendar-bottom-sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={dateLabel}
    >
      <div
        className="calendar-bottom-sheet w-full max-h-[85dvh] space-y-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendar-bottom-sheet-handle" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3 px-4 pt-2">
          <h3 className="font-heading text-xl font-semibold capitalize">{dateLabel}</h3>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-muted hover:text-accent" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="space-y-3 px-4 pb-6">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted">Sin turnos este día.</p>
          ) : (
            bookings.map((booking) => (
              <BookingDayCard
                key={booking.id}
                booking={booking}
                businessName={businessName}
                whatsappTemplate={whatsappTemplate}
                onChanged={onChanged}
                compact
              />
            ))
          )}

          {showAgendaLink && (
            <a href="/admin/agenda" className="btn-primary block min-h-11 text-center leading-[2.75rem]">
              Ver agenda
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
