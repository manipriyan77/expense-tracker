import { create } from "zustand";
import type { FIInputs } from "@/lib/utils/financial-freedom";

const STORAGE_KEY = "financial-freedom-config";

export const DEFAULT_FI_CONFIG: FIInputs = {
  currentAge: 26,
  endAge: 60,
  monthlyExpense: 30000,
  inflationPct: 7,
  returnPct: 12,
  fiMultiplier: 33,
  startingCorpus: 0,
  startingSIP: 8000,
  stepUpPct: 10,
};

interface FinancialFreedomState {
  config: FIInputs;
  hydrated: boolean;
  setConfig: (patch: Partial<FIInputs>) => void;
  resetConfig: () => void;
  hydrateFromStorage: () => void;
}

function persist(config: FIInputs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export const useFinancialFreedomStore = create<FinancialFreedomState>((set, get) => ({
  config: DEFAULT_FI_CONFIG,
  hydrated: false,

  setConfig: (patch) => {
    const next = { ...get().config, ...patch };
    set({ config: next });
    persist(next);
  },

  resetConfig: () => {
    set({ config: DEFAULT_FI_CONFIG });
    persist(DEFAULT_FI_CONFIG);
  },

  hydrateFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ config: { ...DEFAULT_FI_CONFIG, ...parsed }, hydrated: true });
        return;
      }
    } catch {}
    set({ hydrated: true });
  },
}));
