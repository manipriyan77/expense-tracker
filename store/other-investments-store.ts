import { create } from "zustand";

export type OtherInvestmentType =
  | "ppf"
  | "epf"
  | "nps"
  | "postal"
  | "lic"
  | "other";

export interface OtherInvestment {
  id: string;
  name: string;
  type: OtherInvestmentType;
  investedAmount: number;
  currentValue: number;
  startDate: string;
  maturityDate?: string;
  interestRate?: number;
  notes?: string;
}

interface OtherInvestmentsState {
  investments: OtherInvestment[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addInvestment: (payload: Omit<OtherInvestment, "id">) => Promise<void>;
  updateInvestment: (
    id: string,
    updates: Partial<OtherInvestment>,
  ) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
}

export const useOtherInvestmentsStore = create<OtherInvestmentsState>(
  (set, get) => ({
    investments: [],
    loading: false,
    error: null,

    load: async () => {
      set({ loading: true, error: null });
      try {
        const res = await fetch("/api/other-investments");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load investments");
        }
        const data = await res.json();
        set({ investments: data ?? [], loading: false });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to load investments",
          investments: [],
          loading: false,
        });
      }
    },

    addInvestment: async (payload) => {
      set({ error: null });
      try {
        const res = await fetch("/api/other-investments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to add investment");
        }
        const added = await res.json();
        set({ investments: [added, ...get().investments] });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to add investment",
        });
        throw err;
      }
    },

    updateInvestment: async (id, updates) => {
      set({ error: null });
      try {
        const res = await fetch(`/api/other-investments/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update investment");
        }
        const updated = await res.json();
        set({
          investments: get().investments.map((inv) =>
            inv.id === id ? { ...inv, ...updated, id: inv.id } : inv,
          ),
        });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to update investment",
        });
        throw err;
      }
    },

    deleteInvestment: async (id) => {
      set({ error: null });
      try {
        const res = await fetch(`/api/other-investments/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to delete investment");
        }
        set({
          investments: get().investments.filter((inv) => inv.id !== id),
        });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to delete investment",
        });
        throw err;
      }
    },
  }),
);
