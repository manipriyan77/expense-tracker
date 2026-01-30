"use client";

import { useCallback } from "react";
import {
  formatCurrency,
  formatCompactCurrency,
  type CurrencyPreferences,
} from "@/lib/utils/currency";
import { usePrivacyStore } from "@/store/privacy-store";

const MASKED_PLACEHOLDER = "******";

export function useFormatCurrency() {
  const amountsHidden = usePrivacyStore((s) => s.amountsHidden);

  const format = useCallback(
    (amount: number, preferences?: Partial<CurrencyPreferences>): string => {
      if (amountsHidden) return MASKED_PLACEHOLDER;
      return formatCurrency(amount, preferences);
    },
    [amountsHidden],
  );

  const formatCompact = useCallback(
    (amount: number, preferences?: Partial<CurrencyPreferences>): string => {
      if (amountsHidden) return MASKED_PLACEHOLDER;
      return formatCompactCurrency(amount, preferences);
    },
    [amountsHidden],
  );

  return { format, formatCompact, amountsHidden };
}
