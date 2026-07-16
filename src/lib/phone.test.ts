import { describe, expect, it } from 'vitest';
import { formatPhoneForWhatsApp, isValidArgentinaPhone, normalizePhone } from './phone';

describe('isValidArgentinaPhone', () => {
  it('accepts 10-digit local mobiles', () => {
    expect(isValidArgentinaPhone('2215551234')).toBe(true);
  });

  it('accepts 11-digit with leading 9', () => {
    expect(isValidArgentinaPhone('92215551234')).toBe(true);
  });

  it('accepts with country code 54', () => {
    expect(isValidArgentinaPhone('5492215551234')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidArgentinaPhone('12345')).toBe(false);
  });
});

describe('formatPhoneForWhatsApp', () => {
  it('prefixes 549 for 10-digit numbers', () => {
    expect(formatPhoneForWhatsApp('2215551234')).toBe('5492215551234');
  });

  it('keeps existing 54 prefix', () => {
    expect(formatPhoneForWhatsApp('5492215551234')).toBe('5492215551234');
  });
});

describe('normalizePhone', () => {
  it('strips non-digits', () => {
    expect(normalizePhone('+54 9 221 555-1234')).toBe('5492215551234');
  });
});
