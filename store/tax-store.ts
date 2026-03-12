import { create } from "zustand";

interface TaxState {
  taxDeductibleIds: string[];
  markDeductible: (id: string) => void;
  unmarkDeductible: (id: string) => void;
  isDeductible: (id: string) => boolean;
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = "tax-deductible-ids";

export const useTaxStore = create<TaxState>((set, get) => ({
  taxDeductibleIds: [],

  markDeductible: (id: string) => {
    const next = [...get().taxDeductibleIds, id];
    set({ taxDeductibleIds: next });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  unmarkDeductible: (id: string) => {
    const next = get().taxDeductibleIds.filter((x) => x !== id);
    set({ taxDeductibleIds: next });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },

  isDeductible: (id: string) => get().taxDeductibleIds.includes(id),

  hydrateFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ taxDeductibleIds: JSON.parse(stored) });
      }
    } catch {
      // ignore parse errors
    }
  },
}));

export const TAX_DEDUCTIBLE_CATEGORIES = [
  "Healthcare",
  "Medical",
  "Insurance",
  "Education",
  "Rent",
  "Investment",
  "Charity",
  "Donations",
];
