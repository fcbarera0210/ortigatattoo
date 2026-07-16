import { describe, expect, it } from 'vitest';
import { parseLocalDateTime } from '../datetime';
import { computeAvailableSlots, type SlotContext } from './slots';

function baseCtx(overrides: Partial<SlotContext> = {}): SlotContext {
  return {
    date: '2026-06-20',
    serviceDurationMin: 30,
    minAdvanceHours: 2,
    maxAdvanceDays: 7,
    availabilityBlocks: [
      { dayOfWeek: 'SABADO', startTime: '10:00', endTime: '14:00', active: true },
    ],
    bookingBlocks: [],
    existingBookings: [],
    now: parseLocalDateTime('2026-06-18', '08:00'),
    ...overrides,
  };
}

describe('computeAvailableSlots', () => {
  it('returns empty when no availability for day', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        date: '2026-06-15',
        availabilityBlocks: [
          { dayOfWeek: 'LUNES', startTime: '09:00', endTime: '12:00', active: true },
        ],
      }),
    );
    expect(slots).toEqual([]);
  });

  it('generates 30-min slots on saturday', () => {
    const slots = computeAvailableSlots(baseCtx());
    expect(slots).toContain('10:00');
    expect(slots).toContain('10:30');
    expect(slots).toContain('13:00');
    expect(slots).toContain('13:30');
  });

  it('excludes confirmed bookings', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        existingBookings: [
          {
            startAt: parseLocalDateTime('2026-06-20', '10:00'),
            endAt: parseLocalDateTime('2026-06-20', '10:30'),
            status: 'confirmed',
          },
        ],
      }),
    );
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('10:30');
  });

  it('excludes pending bookings', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        existingBookings: [
          {
            startAt: parseLocalDateTime('2026-06-20', '11:00'),
            endAt: parseLocalDateTime('2026-06-20', '11:30'),
            status: 'pending',
          },
        ],
      }),
    );
    expect(slots).not.toContain('11:00');
    expect(slots).toContain('10:00');
  });

  it('ignores cancelled bookings', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        existingBookings: [
          {
            startAt: parseLocalDateTime('2026-06-20', '10:00'),
            endAt: parseLocalDateTime('2026-06-20', '10:30'),
            status: 'cancelled',
          },
        ],
      }),
    );
    expect(slots).toContain('10:00');
  });

  it('respects min advance hours', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        now: parseLocalDateTime('2026-06-20', '09:30'),
      }),
    );
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('12:00');
  });

  it('respects max advance days', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        date: '2026-06-30',
        now: parseLocalDateTime('2026-06-18', '08:00'),
        maxAdvanceDays: 7,
      }),
    );
    expect(slots).toEqual([]);
  });

  it('excludes booking blocks', () => {
    const slots = computeAvailableSlots(
      baseCtx({
        bookingBlocks: [
          {
            startAt: parseLocalDateTime('2026-06-20', '10:00'),
            endAt: parseLocalDateTime('2026-06-20', '11:00'),
          },
        ],
      }),
    );
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('10:30');
    expect(slots).toContain('11:00');
  });
});
