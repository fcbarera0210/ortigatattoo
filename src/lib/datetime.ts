export const TIMEZONE = 'America/Argentina/Buenos_Aires';

const DAY_TO_JS: Record<string, number> = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
};

const JS_TO_DAY = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] as const;

const WEEKDAY_SHORT_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type DayOfWeek = (typeof JS_TO_DAY)[number];

function getLocalParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Parse YYYY-MM-DD + HH:MM as wall-clock time in America/Argentina/Buenos_Aires. */
export function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  if (typeof Temporal !== 'undefined' && 'ZonedDateTime' in Temporal) {
    const iso = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const zdt = Temporal.ZonedDateTime.from(`${iso}[${TIMEZONE}]`);
    return new Date(zdt.epochMilliseconds);
  }

  let ts = Date.UTC(year, month - 1, day, hours, minutes, 0);
  for (let i = 0; i < 5; i++) {
    const parts = getLocalParts(new Date(ts));
    const desired = Date.UTC(year, month - 1, day, hours, minutes, 0);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const diff = actual - desired;
    if (diff === 0) break;
    ts -= diff;
  }
  return new Date(ts);
}

/** Parse datetime-local value (YYYY-MM-DDTHH:MM) as Argentina wall time. */
export function parseLocalDateTimeInput(localStr: string): Date {
  const [dateStr, timePart] = localStr.split('T');
  const [hours, minutes] = timePart.split(':');
  return parseLocalDateTime(dateStr, `${hours}:${minutes}`);
}

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Accepts `YYYY-MM-DDTHH:MM` (Argentina wall clock) or any Date-parseable instant (ISO). */
export function parseInstantOrLocalDateTime(value: string): Date {
  return DATETIME_LOCAL_RE.test(value) ? parseLocalDateTimeInput(value) : new Date(value);
}

export function formatDateKey(date: Date): string {
  const parts = getLocalParts(date);
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeParts(date: Date): { hours: number; minutes: number } {
  const parts = getLocalParts(date);
  return { hours: parts.hour, minutes: parts.minute };
}

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const date = parseLocalDateTime(dateStr, '12:00');
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
  }).format(date);
  return JS_TO_DAY[WEEKDAY_SHORT_TO_JS[weekday] ?? 0];
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const start = parseLocalDateTime(dateStr, '12:00');
  const next = addMinutes(start, days * 24 * 60);
  return formatDateKey(next);
}

export function startOfDay(dateStr: string): Date {
  return parseLocalDateTime(dateStr, '00:00');
}

export function endOfDay(dateStr: string): Date {
  const nextDay = addDaysToDateStr(dateStr, 1);
  return new Date(startOfDay(nextDay).getTime() - 1);
}

export function getDateRange(daysAhead: number): string[] {
  const dates: string[] = [];
  const todayKey = formatDateKey(new Date());
  for (let i = 0; i <= daysAhead; i++) {
    dates.push(addDaysToDateStr(todayKey, i));
  }
  return dates;
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export { DAY_TO_JS, JS_TO_DAY };

declare const Temporal: {
  ZonedDateTime: {
    from: (iso: string) => { epochMilliseconds: number };
  };
};
