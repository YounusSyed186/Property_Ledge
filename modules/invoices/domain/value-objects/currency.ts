/**
 * Currency Value Object and Utilities.
 * Pure Domain Representation - zero hardcoded dependencies.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'prefix' | 'suffix';
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  AUD: { code: 'AUD', symbol: '$', name: 'Australian Dollar', decimals: 2, symbolPosition: 'prefix' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, symbolPosition: 'prefix' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, symbolPosition: 'prefix' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, symbolPosition: 'prefix' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, symbolPosition: 'prefix' },
};

export function getCurrencyConfig(code: string = 'AUD'): CurrencyConfig {
  const upper = (code || 'AUD').toUpperCase();
  return SUPPORTED_CURRENCIES[upper] || {
    code: upper,
    symbol: upper,
    name: upper,
    decimals: 2,
    symbolPosition: 'prefix',
  };
}

export function formatInvoiceAmount(amount: number, currencyCode: string = 'AUD'): string {
  const config = getCurrencyConfig(currencyCode);
  const num = isNaN(amount) ? 0 : amount;
  const formattedNumber = num.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return config.symbolPosition === 'prefix'
    ? `${config.symbol}${formattedNumber}`
    : `${formattedNumber} ${config.symbol}`;
}

export const formatCurrency = formatInvoiceAmount;

export function isValidCurrency(code: string): boolean {
  if (!code) return false;
  return code.toUpperCase() in SUPPORTED_CURRENCIES;
}

