export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

export function formatCurrencyNoDecimals(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    const formatted = (amount / 1_000_000).toFixed(2).replace(/\.00$/, '');
    return `$${formatted}M`;
  }
  return formatCurrencyNoDecimals(amount);
}
