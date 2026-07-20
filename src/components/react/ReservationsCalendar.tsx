import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, formatDateTime, formatTime, startOfDay, endOfDay } from '../../lib/datetime';
import type { CalendarViewMode } from '../../lib/calendar-utils';
import {
  addDays,
  formatDateKey,
  formatDayLabel,
  formatMonthLabel,
  getMonthMatrix,
  getWeekDays,
  isToday,
  startOfWeek,
  endOfWeek,
} from '../../lib/calendar-utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useBookingBusiness } from '../../hooks/useBookingBusiness';
import { toast } from '../../lib/toast';
import { BookingDayCard } from './BookingDayCard';
import { DayDetailSheet } from './DayDetailSheet';

export type CalendarBooking = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
};

type ReservationsCalendarProps = {
  compact?: boolean;
  defaultView?: CalendarViewMode;
  title?: string;
  enableActions?: boolean;
  showAgendaLink?: boolean;
};

const DAY_NAMES_MOBILE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function monthKeyOf(date: Date): string {
  return formatDateKey(date).slice(0, 7);
}

function addMonthsLocal(date: Date, months: number): Date {
  const [y, m, d] = formatDateKey(date).split('-').map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const day = String(Math.min(d, 28)).padStart(2, '0');
  return startOfDay(`${ny}-${String(nm).padStart(2, '0')}-${day}`);
}

function getFetchRange(currentDate: Date, viewMode: CalendarViewMode): { from: Date; to: Date } {
  if (viewMode === 'day') {
    const key = formatDateKey(currentDate);
    return { from: startOfDay(key), to: endOfDay(key) };
  }
  if (viewMode === 'week') {
    return {
      from: startOfDay(formatDateKey(startOfWeek(currentDate))),
      to: endOfDay(formatDateKey(endOfWeek(currentDate))),
    };
  }
  const matrix = getMonthMatrix(currentDate);
  return {
    from: startOfDay(formatDateKey(matrix[0][0])),
    to: endOfDay(formatDateKey(matrix[matrix.length - 1][6])),
  };
}

function getPeriodLabel(date: Date, viewMode: CalendarViewMode): string {
  if (viewMode === 'day') return formatDate(date);
  if (viewMode === 'week') {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    return `${formatDayLabel(start)} – ${formatDayLabel(end)}`;
  }
  return formatMonthLabel(date);
}

export function ReservationsCalendar({
  compact = false,
  defaultView = 'week',
  title = 'Calendario de turnos',
  enableActions = true,
  showAgendaLink,
}: ReservationsCalendarProps) {
  const isMobile = useIsMobile();
  const { businessName, whatsappBookingTemplate } = useBookingBusiness();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(defaultView);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<CalendarBooking[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const resolvedShowAgendaLink = showAgendaLink ?? true;

  const loadBookings = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const { from, to } = getFetchRange(currentDate, viewMode);
      try {
        const res = await fetch(`/api/bookings?from=${from.toISOString()}&to=${to.toISOString()}`, { signal });
        const data = await res.json();
        setBookings((data.bookings ?? []).filter((b: CalendarBooking) => b.status !== 'cancelled'));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setBookings([]);
        toast.error('No se pudieron cargar los turnos');
      } finally {
        setLoading(false);
      }
    },
    [currentDate, viewMode],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadBookings(controller.signal);
    return () => controller.abort();
  }, [loadBookings, reloadKey]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    bookings.forEach((booking) => {
      const key = formatDateKey(new Date(booking.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(booking);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    return map;
  }, [bookings]);

  const getBookingsForDate = useCallback(
    (date: Date) => bookingsByDate.get(formatDateKey(date)) ?? [],
    [bookingsByDate],
  );

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedBookings(getBookingsForDate(selectedDate));
  }, [getBookingsForDate, selectedDate]);

  const handleChanged = useCallback(() => setReloadKey((k) => k + 1), []);

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const delta = direction === 'prev' ? -1 : 1;
      if (viewMode === 'day') return addDays(prev, delta);
      if (viewMode === 'week') return addDays(prev, delta * 7);
      return addMonthsLocal(prev, delta);
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedBookings(getBookingsForDate(date));
  };

  const closeDetail = () => {
    setSelectedDate(null);
    setSelectedBookings([]);
  };

  const renderBookingChip = (booking: CalendarBooking) => (
    <span
      key={booking.id}
      className={`calendar-booking-chip block truncate ${booking.status === 'pending' ? 'calendar-booking-chip-pending' : ''}`}
      title={`${booking.clientName} — ${booking.serviceName}`}
    >
      {formatTime(new Date(booking.startAt))} {booking.clientName}
    </span>
  );

  const cellMinH = compact ? 'min-h-[72px]' : 'min-h-[96px]';
  const weekMinH = compact ? 'min-h-[110px]' : 'min-h-[140px]';

  const renderMonthViewDesktop = () => {
    const matrix = getMonthMatrix(currentDate);
    const days = matrix.flat();
    const currentMonth = monthKeyOf(currentDate);
    const maxVisible = compact ? 1 : 2;

    return (
      <div className="hidden grid-cols-7 gap-1.5 sm:gap-2 md:grid">
        {DAY_NAMES_WEEK.map((day) => (
          <div key={day} className="calendar-weekday-label p-1.5 text-center text-xs uppercase tracking-wider">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          const dayBookings = getBookingsForDate(date);
          const isCurrentMonth = monthKeyOf(date) === currentMonth;
          const isTodayDate = isToday(date);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              className={`calendar-cell ${cellMinH} p-2 text-left ${isTodayDate ? 'calendar-cell-today' : ''} ${!isCurrentMonth ? 'calendar-cell-outside' : ''}`}
            >
              <span className={`mb-1 block text-sm font-medium ${isTodayDate ? 'text-ink' : ''}`}>
                {Number(formatDateKey(date).slice(-2))}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayBookings.slice(0, maxVisible).map((b) => renderBookingChip(b))}
                {dayBookings.length > maxVisible && (
                  <span className="text-[10px] text-muted">+{dayBookings.length - maxVisible}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMonthViewMobile = () => {
    const matrix = getMonthMatrix(currentDate);
    const days = matrix.flat();
    const currentMonth = monthKeyOf(currentDate);

    return (
      <div className="grid grid-cols-7 gap-1 md:hidden">
        {DAY_NAMES_MOBILE.map((day, i) => (
          <div key={`${day}-${i}`} className="calendar-weekday-label calendar-weekday-label-mobile text-center uppercase tracking-wider">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          const dayBookings = getBookingsForDate(date);
          const isCurrentMonth = monthKeyOf(date) === currentMonth;
          const isTodayDate = isToday(date);
          const count = dayBookings.length;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              className={`calendar-cell calendar-cell-mobile ${isTodayDate ? 'calendar-cell-today' : ''} ${!isCurrentMonth ? 'calendar-cell-outside' : ''}`}
            >
              <span className={`text-sm font-medium ${isTodayDate ? 'text-ink' : ''}`}>
                {Number(formatDateKey(date).slice(-2))}
              </span>
              {count > 0 &&
                (count > 1 ? (
                  <span className="calendar-day-count">{count}</span>
                ) : (
                  <span className="calendar-day-dot" aria-label="1 turno" />
                ))}
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekViewMobile = () => {
    const weekDays = getWeekDays(currentDate);
    return (
      <div className="space-y-2 md:hidden">
        {weekDays.map((date, i) => {
          const dayBookings = getBookingsForDate(date);
          const isTodayDate = isToday(date);
          const count = dayBookings.length;
          return (
            <button
              key={formatDateKey(date)}
              type="button"
              onClick={() => handleDateClick(date)}
              className={`calendar-week-day-mobile w-full text-left ${isTodayDate ? 'calendar-week-day-mobile-today' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted">{DAY_NAMES_WEEK[i]}</p>
                  <p className={`text-sm font-semibold ${isTodayDate ? 'text-ink' : ''}`}>{formatDayLabel(date)}</p>
                </div>
                {count === 0 ? <span className="text-xs text-muted">Sin turnos</span> : <span className="calendar-day-count">{count}</span>}
              </div>
              {count > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {dayBookings.slice(0, 2).map((b) => renderBookingChip(b))}
                  {count > 2 && <span className="text-[10px] text-muted">+{count - 2} más</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const maxVisible = compact ? 3 : 5;
    return (
      <div className="hidden grid-cols-7 gap-1.5 sm:gap-2 md:grid">
        {weekDays.map((date, i) => {
          const dayBookings = getBookingsForDate(date);
          const isTodayDate = isToday(date);
          return (
            <button
              key={formatDateKey(date)}
              type="button"
              onClick={() => handleDateClick(date)}
              className={`calendar-cell ${weekMinH} flex flex-col p-2 text-left ${isTodayDate ? 'calendar-cell-today' : ''}`}
            >
              <div className="mb-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">{DAY_NAMES_WEEK[i]}</div>
                <div className={`text-sm font-medium ${isTodayDate ? 'text-ink' : ''}`}>
                  {Number(formatDateKey(date).slice(-2))}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayBookings.slice(0, maxVisible).map((b) => renderBookingChip(b))}
                {dayBookings.length > maxVisible && (
                  <span className="text-[10px] text-muted">+{dayBookings.length - maxVisible}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    if (dayBookings.length === 0) {
      return <p className="py-8 text-center text-sm text-muted">No hay turnos este día.</p>;
    }
    if (enableActions) {
      return (
        <div className="space-y-2">
          {dayBookings.map((booking) => (
            <BookingDayCard
              key={booking.id}
              booking={booking}
              businessName={businessName}
              whatsappTemplate={whatsappBookingTemplate}
              onChanged={handleChanged}
              compact
            />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {dayBookings.map((booking) => (
          <div key={booking.id} className="calendar-day-item flex items-center gap-4 p-3">
            <div className="min-w-[56px] border border-accent bg-accent/20 px-2 py-1.5 text-center font-mono text-xs font-bold text-ink">
              {formatTime(new Date(booking.startAt))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{booking.clientName}</p>
              <p className="truncate text-sm text-muted">{booking.serviceName}</p>
            </div>
            <span className={booking.status === 'pending' ? 'status-pending text-xs' : 'status-confirmed text-xs'}>
              {booking.status === 'pending' ? 'Pendiente' : 'Confirmado'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const viewModes: CalendarViewMode[] = ['day', 'week', 'month'];
  const viewModeLabel = (mode: CalendarViewMode) => (mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes');

  const renderToolbar = () => (
    <>
      <div className="md:hidden">
        <div className="space-y-3">
          <div>
            <h2 className="font-heading text-xl font-semibold">{title}</h2>
            <p className="text-sm capitalize text-muted">{getPeriodLabel(currentDate, viewMode)}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => navigate('prev')} className="admin-chip admin-chip-inactive min-h-11 min-w-11 px-3 text-lg" aria-label="Anterior">
              ‹
            </button>
            <button type="button" onClick={() => setCurrentDate(new Date())} className="admin-chip admin-chip-active min-h-11 flex-1">
              Hoy
            </button>
            <button type="button" onClick={() => navigate('next')} className="admin-chip admin-chip-inactive min-h-11 min-w-11 px-3 text-lg" aria-label="Siguiente">
              ›
            </button>
          </div>
          <div className="calendar-view-toggle-mobile">
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={viewMode === mode ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
              >
                {viewModeLabel(mode)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        <div>
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <p className="text-sm capitalize text-muted">{getPeriodLabel(currentDate, viewMode)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={viewMode === mode ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
              >
                {viewModeLabel(mode)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => navigate('prev')} className="admin-chip admin-chip-inactive px-2">
            ‹
          </button>
          <button type="button" onClick={() => setCurrentDate(new Date())} className="admin-chip admin-chip-active">
            Hoy
          </button>
          <button type="button" onClick={() => navigate('next')} className="admin-chip admin-chip-inactive px-2">
            ›
          </button>
        </div>
      </div>
    </>
  );

  const renderDesktopModal = () => {
    if (!selectedDate || isMobile) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeDetail} role="dialog" aria-modal="true">
        <div className="card w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-xl font-semibold capitalize">{formatDate(selectedDate)}</h3>
            <button type="button" onClick={closeDetail} className="text-muted hover:text-accent" aria-label="Cerrar">
              ✕
            </button>
          </div>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-muted">Sin turnos este día.</p>
          ) : enableActions ? (
            <div className="space-y-2">
              {selectedBookings.map((booking) => (
                <BookingDayCard
                  key={booking.id}
                  booking={booking}
                  businessName={businessName}
                  whatsappTemplate={whatsappBookingTemplate}
                  onChanged={handleChanged}
                  compact
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedBookings.map((booking) => (
                <li key={booking.id} className="calendar-day-item rounded-md border border-border p-3">
                  <p className="font-medium">{booking.clientName}</p>
                  <p className="text-sm text-muted">{booking.serviceName}</p>
                  <p className="text-sm">{formatDateTime(new Date(booking.startAt))}</p>
                </li>
              ))}
            </ul>
          )}
          {resolvedShowAgendaLink && (
            <a href="/admin/agenda" className="btn-primary block text-center">
              Ver agenda
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="card space-y-4">
      {renderToolbar()}

      {loading ? (
        <p className="text-sm text-muted">Cargando turnos...</p>
      ) : (
        <>
          {viewMode === 'month' && (
            <>
              {renderMonthViewMobile()}
              {renderMonthViewDesktop()}
            </>
          )}
          {viewMode === 'week' && (
            <>
              {renderWeekViewMobile()}
              {renderWeekView()}
            </>
          )}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {selectedDate && isMobile && (
        <DayDetailSheet
          date={selectedDate}
          bookings={selectedBookings}
          businessName={businessName}
          whatsappTemplate={whatsappBookingTemplate}
          onClose={closeDetail}
          onChanged={handleChanged}
          showAgendaLink={resolvedShowAgendaLink}
        />
      )}

      {renderDesktopModal()}
    </section>
  );
}
