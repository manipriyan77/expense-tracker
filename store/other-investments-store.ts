import { create } from "zustand";

export type OtherInvestmentType =
  | "ppf"
  | "epf"
  | "nps"
  | "postal"
  | "lic"
  | "fd"
  | "rd"
  | "other";

export type PremiumFrequency = "monthly" | "quarterly" | "semi-annual" | "annual";

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
  premiumAmount?: number;
  premiumFrequency?: PremiumFrequency;
  sumAssured?: number;
}

export interface OtherInvestmentSnapshot {
  id: string;
  investmentId: string;
  month: string; // "YYYY-MM-01"
  currentValue: number;
}

interface OtherInvestmentsState {
  investments: OtherInvestment[];
  snapshots: OtherInvestmentSnapshot[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addInvestment: (payload: Omit<OtherInvestment, "id">) => Promise<void>;
  updateInvestment: (
    id: string,
    updates: Partial<OtherInvestment>,
  ) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  fetchSnapshots: () => Promise<void>;
  recordValue: (
    investmentId: string,
    month: string,
    value: number,
  ) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
}

function rowToSnapshot(row: Record<string, unknown>): OtherInvestmentSnapshot {
  return {
    id: row.id as string,
    investmentId: row.investment_id as string,
    month: (row.snapshot_month as string)?.toString().split("T")[0] ?? "",
    currentValue: Number(row.current_value ?? 0),
  };
}

export const useOtherInvestmentsStore = create<OtherInvestmentsState>(
  (set, get) => ({
    investments: [],
    snapshots: [],
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
          // Snapshots cascade-delete in the DB; drop them locally too.
          snapshots: get().snapshots.filter((s) => s.investmentId !== id),
        });
      } catch (err) {
        set({
          error:
            err instanceof Error ? err.message : "Failed to delete investment",
        });
        throw err;
      }
    },

    fetchSnapshots: async () => {
      try {
        const res = await fetch("/api/other-investments/snapshots");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load history");
        }
        const rows = await res.json();
        set({ snapshots: (rows ?? []).map(rowToSnapshot) });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to load history",
        });
      }
    },

    recordValue: async (investmentId, month, value) => {
      set({ error: null });
      try {
        const res = await fetch("/api/other-investments/snapshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ investmentId, month, value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to record value");
        }
        const { snapshot, latestValue } = await res.json();
        const snap = rowToSnapshot(snapshot);
        set({
          // Replace any existing snapshot for this investment+month.
          snapshots: [
            ...get().snapshots.filter(
              (s) => !(s.investmentId === snap.investmentId && s.month === snap.month),
            ),
            snap,
          ].sort((a, b) => a.month.localeCompare(b.month)),
          // Keep the parent card's current value in sync with the latest month.
          investments: get().investments.map((inv) =>
            inv.id === investmentId
              ? { ...inv, currentValue: Number(latestValue) }
              : inv,
          ),
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to record value",
        });
        throw err;
      }
    },

    deleteSnapshot: async (id) => {
      set({ error: null });
      const removed = get().snapshots.find((s) => s.id === id);
      try {
        const res = await fetch(`/api/other-investments/snapshots/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to delete entry");
        }
        set({ snapshots: get().snapshots.filter((s) => s.id !== id) });
        // Re-sync the parent to whatever latest month remains locally.
        if (removed) {
          const remaining = get()
            .snapshots.filter((s) => s.investmentId === removed.investmentId)
            .sort((a, b) => b.month.localeCompare(a.month));
          if (remaining.length > 0) {
            set({
              investments: get().investments.map((inv) =>
                inv.id === removed.investmentId
                  ? { ...inv, currentValue: remaining[0].currentValue }
                  : inv,
              ),
            });
          }
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to delete entry",
        });
        throw err;
      }
    },
  }),
);
