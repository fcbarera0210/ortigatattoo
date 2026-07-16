import { describe, expect, it } from 'vitest';
import {
  endOfDay,
  formatDateKey,
  formatTime,
  getDateRange,
  parseLocalDateTime,
  parseLocalDateTimeInput,
  startOfDay,
} from './datetime';

describe('parseLocalDateTime (Argentina)', () => {
  it('maps 12:00 on 2026-06-26 to 15:00 UTC (UTC-3)', () => {
    const date = parseLocalDateTime('2026-06-26', '12:00');
    expect(date.toISOString()).toBe('2026-06-26T15:00:00.000Z');
  });

  it('formats back to the same wall time', () => {
    const date = parseLocalDateTime('2026-06-26', '12:00');
    expect(formatTime(date)).toBe('12:00');
  });
});

describe('parseLocalDateTimeInput', () => {
  it('parses datetime-local strings as Argentina wall time', () => {
    const date = parseLocalDateTimeInput('2026-06-26T12:00');
    expect(formatTime(date)).toBe('12:00');
    expect(formatDateKey(date)).toBe('2026-06-26');
  });
});

describe('startOfDay / endOfDay', () => {
  it('startOfDay returns midnight Argentina', () => {
    const start = startOfDay('2026-06-26');
    expect(formatTime(start)).toBe('00:00');
    expect(formatDateKey(start)).toBe('2026-06-26');
  });

  it('endOfDay is last ms of the calendar day', () => {
    const end = endOfDay('2026-06-26');
    expect(formatDateKey(end)).toBe('2026-06-26');
    expect(end.getTime()).toBeGreaterThan(startOfDay('2026-06-26').getTime());
  });
});

describe('getDateRange', () => {
  it('returns consecutive date strings', () => {
    const range = getDateRange(2);
    expect(range).toHaveLength(3);
    expect(range[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
