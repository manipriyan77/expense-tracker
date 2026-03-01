export interface CurrencyPreferences {
  code: string;
  symbol: string;
  format: "symbol" | "code";
  decimalPlaces: number;
  thousandsSeparator: "," | ".";
  decimalSeparator: "." | ",";
  locale?: string;
}

export const CURRENCY_CONFIGS: Record<string, CurrencyPreferences> = {
  INR: {
    code: "INR",
    symbol: "₹",
    format: "symbol",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    locale: "en-IN",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    format: "symbol",
    decimalPlaces: 2,
    thousandsSeparator: ".",
    decimalSeparator: ",",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    format: "symbol",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    format: "symbol",
    decimalPlaces: 0,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    format: "symbol",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    format: "symbol",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
  },
};

export function formatCurrency(
  amount: number,
  preferences?: Partial<CurrencyPreferences>,
): string {
  const config = {
    ...CURRENCY_CONFIGS.INR,
    ...preferences,
  };

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  // Format the number
  let formattedNumber: string;
  if (config.locale) {
    formattedNumber = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    }).format(absAmount);
  } else {
    const parts = absAmount.toFixed(config.decimalPlaces).split(".");
    const integerPart = parts[0].replace(
      /\B(?=(\d{3})+(?!\d))/g,
      config.thousandsSeparator,
    );
    const decimalPart = parts[1] || "";
    formattedNumber =
      config.decimalPlaces > 0
        ? `${integerPart}${config.decimalSeparator}${decimalPart}`
        : integerPart;
  }

  if (config.format === "code") {
    return `${sign}${config.code} ${formattedNumber}`;
  } else {
    return `${sign}${config.symbol}${formattedNumber}`;
  }
}

export function parseCurrency(value: string): number {
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

export function formatCompactCurrency(
  amount: number,
  preferences?: Partial<CurrencyPreferences>,
): string {
  const config = {
    ...CURRENCY_CONFIGS.INR,
    ...preferences,
  };

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  let formattedNumber: string;
  if (config.locale === "en-IN") {
    if (absAmount >= 10000000) {
      formattedNumber = (absAmount / 10000000).toFixed(1) + "Cr";
    } else if (absAmount >= 100000) {
      formattedNumber = (absAmount / 100000).toFixed(1) + "L";
    } else if (absAmount >= 1000) {
      formattedNumber = (absAmount / 1000).toFixed(1) + "K";
    } else {
      formattedNumber = absAmount.toFixed(config.decimalPlaces);
    }
  } else if (absAmount >= 1000000) {
    formattedNumber = (absAmount / 1000000).toFixed(1) + "M";
  } else if (absAmount >= 1000) {
    formattedNumber = (absAmount / 1000).toFixed(1) + "K";
  } else {
    formattedNumber = absAmount.toFixed(config.decimalPlaces);
  }

  return `${sign}${config.symbol}${formattedNumber}`;
}
