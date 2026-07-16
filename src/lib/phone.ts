export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Argentina mobile: 10 digits starting with area code (e.g. 221..., 11...), or 11 digits with leading 9. */
export function isValidArgentinaPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  if (digits.startsWith('54')) {
    const local = digits.slice(2);
    return local.length >= 10 && local.length <= 11;
  }
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('9')) return true;
  return false;
}

export function formatPhoneForWhatsApp(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  if (digitsOnly.startsWith('54') && digitsOnly.length >= 12) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith('54')) {
    return digitsOnly;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('9')) {
    return `54${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `549${digitsOnly}`;
  }

  return digitsOnly.startsWith('54') ? digitsOnly : `54${digitsOnly}`;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
