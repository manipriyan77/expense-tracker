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
  updateAllGoldPrices: (newPrice: number) => Promise<void>;
  load: () => Promise<void>;
}

export const useGoldStore = create<GoldState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/gold");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load gold holdings");
      }
      const data = await res.json();
      set({ holdings: data ?? [], loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to load gold holdings",
        holdings: [],
        loading: false,
      });
    }
  },

  addHolding: async (payload) => {
    set({ error: null });
    try {
      const res = await fetch("/api/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add gold holding");
      }
      const added = await res.json();
      set({ holdings: [added, ...get().holdings] });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to add gold holding",
      });
      throw err;
    }
  },

  updateHolding: async (id, updates) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/gold/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update gold holding");
      }
      const updated = await res.json();
      set({
        holdings: get().holdings.map((h) =>
          h.id === id ? { ...h, ...updated, id: h.id } : h,
        ),
      });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to update gold holding",
      });
      throw err;
    }
  },

  deleteHolding: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/gold/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete gold holding");
      }
      set({ holdings: get().holdings.filter((h) => h.id !== id) });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete gold holding",
      });
      throw err;
    }
  },

  updateAllGoldPrices: async (newPrice) => {
    set({ error: null });
    try {
      const updatedHoldings = get().holdings.map((h) => ({
        ...h,
        currentPricePerGram: newPrice,
      }));

      // Update all holdings in parallel
      await Promise.all(
        get().holdings.map((h) =>
          fetch(`/api/gold/${h.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPricePerGram: newPrice }),
          }),
        ),
      );

      set({ holdings: updatedHoldings });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to update gold prices",
      });
      throw err;
    }
  },
}));
