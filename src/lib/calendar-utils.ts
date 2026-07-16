import { formatDateKey as formatDateKeyLocal, endOfDay, startOfDay } from './datetime';

export type CalendarViewMode = 'day' | 'week' | 'month';

export function formatDateKey(date: Date): string {
  return formatDateKeyLocal(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDateKey(a) === formatDateKey(b);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function startOfWeek(date: Date): Date {
  const key = formatDateKey(date);
  const noon = startOfDay(key);
  const day = new Date(noon);
  // Use Argentina calendar day-of-week via date key
  const jsDay = new Date(`${key}T12:00:00`).getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  const mondayKey = formatDateKey(new Date(noon.getTime() + diff * 24 * 60 * 60 * 1000));
  return startOfDay(mondayKey);
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setTime(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return endOfDay(formatDateKey(end));
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return startOfDay(formatDateKey(d));
  });
}

export function addDays(date: Date, days: number): Date {
  const key = formatDateKey(date);
  const d = new Date(startOfDay(key).getTime() + days * 24 * 60 * 60 * 1000);
  return startOfDay(formatDateKey(d));
}

export function getMonthMatrix(date: Date): Date[][] {
  const key = formatDateKey(date);
  const [y, m] = key.split('-').map(Number);
  const first = startOfDay(`${y}-${String(m).padStart(2, '0')}-01`);
  const start = startOfWeek(first);
  const weeks: Date[][] = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function toDatetimeLocalValue(date: Date): string {
  const key = formatDateKey(date);
  const time = date.toLocaleTimeString('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${key}T${time}`;
}
