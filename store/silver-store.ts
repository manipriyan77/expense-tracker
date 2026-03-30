import { create } from "zustand";

export type SilverType = "physical" | "etf" | "other";

export interface SilverHolding {
  id: string;
  name: string;
  type: SilverType;
  quantityGrams: number;
  purity: number; // percentage
  purchasePricePerGram: number;
  currentPricePerGram: number;
  purchaseDate: string;
  notes?: string;
}

interface SilverState {
  holdings: SilverHolding[];
  loading: boolean;
  error: string | null;
  addHolding: (payload: Omit<SilverHolding, "id">) => Promise<void>;
  updateHolding: (id: string, updates: Partial<SilverHolding>) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  updateAllSilverPrices: (newPrice: number) => Promise<void>;
  load: () => Promise<void>;
}

export const useSilverStore = create<SilverState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/silver");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load silver holdings");
      }
      const data = await res.json();
      set({ holdings: data ?? [], loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to load silver holdings",
        holdings: [],
        loading: false,
      });
    }
  },

  addHolding: async (payload) => {
    set({ error: null });
    try {
      const res = await fetch("/api/silver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add silver holding");
      }
      const added = await res.json();
      set({ holdings: [added, ...get().holdings] });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to add silver holding",
      });
      throw err;
    }
  },

  updateHolding: async (id, updates) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/silver/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update silver holding");
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
          err instanceof Error ? err.message : "Failed to update silver holding",
      });
      throw err;
    }
  },

  deleteHolding: async (id) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/silver/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete silver holding");
      }
      set({ holdings: get().holdings.filter((h) => h.id !== id) });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete silver holding",
      });
      throw err;
    }
  },

  updateAllSilverPrices: async (newPrice) => {
    set({ error: null });
    try {
      const updatedHoldings = get().holdings.map((h) => ({
        ...h,
        currentPricePerGram: newPrice,
      }));

      // Update all holdings in parallel
      await Promise.all(
        get().holdings.map((h) =>
          fetch(`/api/silver/${h.id}`, {
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
          err instanceof Error ? err.message : "Failed to update silver prices",
      });
      throw err;
    }
  },
}));
