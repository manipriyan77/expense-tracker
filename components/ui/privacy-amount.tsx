"use client";

import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import type { CurrencyPreferences } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

interface PrivacyAmountProps {
  amount: number;
  compact?: boolean;
  preferences?: Partial<CurrencyPreferences>;
  className?: string;
}

export function PrivacyAmount({
  amount,
  compact,
  preferences,
  className,
}: PrivacyAmountProps) {
  const { format, formatCompact } = useFormatCurrency();
  const text = compact
    ? formatCompact(amount, preferences)
    : format(amount, preferences);

  return <span className={cn(className)}>{text}</span>;
}
