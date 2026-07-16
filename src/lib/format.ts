export type PriceDisplay = 'hidden' | 'from' | 'fixed';

/** `amount` is whole ARS pesos (field name priceCents kept for schema parity). */
export function formatPriceCents(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPriceLabel(cents: number, display: PriceDisplay): string | null {
  if (display === 'hidden' || cents <= 0) return null;
  const formatted = formatPriceCents(cents);
  if (display === 'from') return `Desde ${formatted}`;
  return formatted;
}
