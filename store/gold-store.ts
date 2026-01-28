import { create } from "zustand";

export type GoldType = "physical" | "etf" | "sov" | "other";

export interface GoldHolding {
  id: string;
  name: string;
  type: GoldType;
  quantityGrams: number;
  purity: number; // percentage
  purchasePricePerGram: number;
  currentPricePerGram: number;
  purchaseDate: string;
  notes?: string;
}

interface GoldState {
  holdings: GoldHolding[];
  loading: boolean;
  error: string | null;
  addHolding: (payload: Omit<GoldHolding, "id">) => Promise<void>;
  updateHolding: (id: string, updates: Partial<GoldHolding>) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  load: () => Promise<void>;
}

const STORAGE_KEY = "gold_holdings_v1";

const persistToStorage = (data: GoldHolding[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to persist gold holdings", err);
  }
};

const readFromStorage = (): GoldHolding[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoldHolding[]) : [];
  } catch (err) {
    console.error("Failed to read gold holdings", err);
    return [];
  }
};

export const useGoldStore = create<GoldState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    const data = readFromStorage();
    set({ holdings: data, loading: false });
  },

  addHolding: async (payload) => {
    const newHolding: GoldHolding = {
      id: crypto.randomUUID(),
      ...payload,
    };
    const updated = [newHolding, ...get().holdings];
    set({ holdings: updated });
    persistToStorage(updated);
  },

  updateHolding: async (id, updates) => {
    const updated = get().holdings.map((h) =>
      h.id === id ? { ...h, ...updates, id: h.id } : h
    );
    set({ holdings: updated });
    persistToStorage(updated);
  },

  deleteHolding: async (id) => {
    const updated = get().holdings.filter((h) => h.id !== id);
    set({ holdings: updated });
    persistToStorage(updated);
  },
}));
