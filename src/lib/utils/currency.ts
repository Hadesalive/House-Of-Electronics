// Currency conversion utilities
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number; // Rate to convert to New Leones (NLe)
  isDefault: boolean;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: string;
}

// Default currencies with sample exchange rates
export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'NLe',
    name: 'New Leones',
    symbol: 'NLe ',
    exchangeRate: 1,
    isDefault: true
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    exchangeRate: 24, // 1 USD = 24 SLE
    isDefault: false
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    exchangeRate: 26, // 1 EUR = 26 SLE
    isDefault: false
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    exchangeRate: 30, // 1 GBP = 30 SLE
    isDefault: false
  }
];

// Currency conversion functions
export class CurrencyConverter {
  private currencies: Currency[] = [];
  private exchangeRates: Map<string, number> = new Map();

  constructor(currencies: Currency[] = DEFAULT_CURRENCIES) {
    this.currencies = currencies;
    this.updateInternalExchangeRates();
  }

  private updateInternalExchangeRates() {
    this.exchangeRates.clear();
    this.currencies.forEach(currency => {
      this.exchangeRates.set(currency.code, currency.exchangeRate);
      // Add aliases for old currency codes (SLL, SLE, NLE -> NLe)
      if (currency.code === 'NLe') {
        this.exchangeRates.set('SLL', 1); // Old Sierra Leonean Leone
        this.exchangeRates.set('SLE', 1); // Old Sierra Leonean Leone (alternative)
        this.exchangeRates.set('NLE', 1); // Alternative spelling
      }
    });
  }

  // Convert amount from one currency to another
  convertAmount(amount: number, fromCurrency: string, toCurrency: string = 'NLe'): number {
    // Normalize currency codes (handle old SLL/SLE/NLE -> NLe)
    const normalizedFrom = fromCurrency === 'SLL' || fromCurrency === 'SLE' || fromCurrency === 'NLE' ? 'NLe' : fromCurrency;
    const normalizedTo = toCurrency === 'SLL' || toCurrency === 'SLE' || toCurrency === 'NLE' ? 'NLe' : toCurrency;
    
    if (normalizedFrom === normalizedTo) {
      return amount;
    }

    const fromRate = this.exchangeRates.get(normalizedFrom);
    const toRate = this.exchangeRates.get(normalizedTo);

    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not found for ${normalizedFrom} or ${normalizedTo}`);
      return amount;
    }

    // Convert to Leones first, then to target currency
    // If converting TO Leones: multiply by exchange rate
    // If converting FROM Leones: divide by exchange rate
    let amountInLeones: number;
    if (normalizedFrom === 'NLe') {
      amountInLeones = amount; // Already in Leones
    } else {
      amountInLeones = amount * fromRate; // Convert to Leones by multiplying
    }

    if (normalizedTo === 'NLe') {
      return amountInLeones; // Return Leones
    } else {
      return amountInLeones / toRate; // Convert from Leones by dividing
    }
  }

  // Convert amount to Leones (for database storage)
  convertToLeones(amount: number, fromCurrency: string): number {
    return this.convertAmount(amount, fromCurrency, 'NLe');
  }

  // Convert amount from Leones to display currency
  convertFromLeones(amount: number, toCurrency: string): number {
    return this.convertAmount(amount, 'NLe', toCurrency);
  }

  // Round amount to specified decimal places (for display only)
  // This preserves precision during calculations but allows rounding for display
  roundForDisplay(amount: number, decimalPlaces: number = 2): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(amount * factor) / factor;
  }

  // Format currency amount with symbol
  formatCurrency(amount: number, currency: string, decimalPlaces: number = 2): string {
    // Normalize currency code (handle old SLL -> NLe, SLE -> NLe, NLE -> NLe)
    const normalizedCurrency = currency === 'SLL' || currency === 'NLE' || currency === 'SLE' ? 'NLe' : currency;
    const currencyInfo = this.currencies.find(c => c.code === normalizedCurrency);
    
    // Round for display only
    const roundedAmount = this.roundForDisplay(amount, decimalPlaces);
    
    if (!currencyInfo) {
      return `${roundedAmount.toFixed(decimalPlaces)} ${normalizedCurrency}`;
    }

    return `${currencyInfo.symbol}${roundedAmount.toFixed(decimalPlaces)}`;
  }

  // Get currency info
  getCurrency(currencyCode: string): Currency | undefined {
    return this.currencies.find(c => c.code === currencyCode);
  }

  // Get all currencies
  getAllCurrencies(): Currency[] {
    return [...this.currencies];
  }

  // Update exchange rates
  public updateExchangeRates(newRates: Partial<Record<string, number>>) {
    Object.entries(newRates).forEach(([currency, rate]) => {
      const currencyIndex = this.currencies.findIndex(c => c.code === currency);
      if (currencyIndex !== -1) {
        this.currencies[currencyIndex].exchangeRate = rate!;
      }
    });
    this.updateInternalExchangeRates();
  }

  // Set all currencies (replaces existing currencies with new list)
  public setCurrencies(currencies: Currency[]) {
    this.currencies = [...currencies];
    this.updateInternalExchangeRates();
  }

  // Add new currency
  addCurrency(currency: Currency) {
    // Check if currency already exists
    const existingIndex = this.currencies.findIndex(c => c.code === currency.code);
    if (existingIndex !== -1) {
      // Update existing currency
      this.currencies[existingIndex] = currency;
    } else {
      // Add new currency
      this.currencies.push(currency);
    }
    this.updateInternalExchangeRates();
  }

  // Remove currency (except default)
  removeCurrency(currencyCode: string) {
    if (currencyCode === 'NLe' || currencyCode === 'SLE') {
      throw new Error('Cannot remove default currency (NLe)');
    }
    this.currencies = this.currencies.filter(c => c.code !== currencyCode);
    this.updateInternalExchangeRates();
  }
}

// Global currency converter instance
export const currencyConverter = new CurrencyConverter();

// Utility functions for easy access
export const convertToLeones = (amount: number, fromCurrency: string): number => {
  return currencyConverter.convertToLeones(amount, fromCurrency);
};

export const convertFromLeones = (amount: number, toCurrency: string): number => {
  return currencyConverter.convertFromLeones(amount, toCurrency);
};

export const formatCurrency = (amount: number, currency: string, decimalPlaces: number = 2): string => {
  return currencyConverter.formatCurrency(amount, currency, decimalPlaces);
};

export const roundForDisplay = (amount: number, decimalPlaces: number = 2): number => {
  return currencyConverter.roundForDisplay(amount, decimalPlaces);
};

export const getCurrency = (currencyCode: string): Currency | undefined => {
  return currencyConverter.getCurrency(currencyCode);
};

export const getAllCurrencies = (): Currency[] => {
  return currencyConverter.getAllCurrencies();
};
