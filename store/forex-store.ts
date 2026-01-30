import { create } from "zustand";

export type ForexEntryType = "deposit" | "withdrawal" | "pnl";

export interface ForexEntry {
  id: string;
  type: ForexEntryType;
  month: string; // YYYY-MM format
  amount: number; // deposit/withdrawal amount, or P&L (positive=profit, negative=loss)
  handler_share_percentage: number; // only for withdrawal, e.g. 20 for 20%
  notes?: string;
  created_at: string;
}

interface ForexState {
  entries: ForexEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (payload: Omit<ForexEntry, "id" | "created_at">) => Promise<void>;
  updateEntry: (id: string, updates: Partial<ForexEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  load: () => Promise<void>;
}

function fromApi(row: Record<string, unknown>): ForexEntry {
  return {
    id: row.id as string,
    type: row.type as ForexEntryType,
    month: row.month as string,
    amount: parseFloat(String(row.amount ?? 0)),
    handler_share_percentage: parseFloat(
      String(row.handler_share_percentage ?? 0),
    ),
    notes: (row.notes as string) || undefined,
    created_at: row.created_at as string,
  };
}

export const useForexStore = create<ForexState>((set) => ({
  entries: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/forex");
      if (!response.ok) {
        throw new Error("Failed to fetch forex entries");
      }
      const data = (await response.json()) as Record<string, unknown>[];
      const entries = (data ?? []).map(fromApi);
      set({ entries, loading: false });
    } catch (err) {
      console.error("Failed to load forex entries:", err);
      set({
        entries: [],
        loading: false,
        error:
          err instanceof Error ? err.message : "Failed to load forex entries",
      });
    }
  },

  addEntry: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/forex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          month: payload.month,
          amount: payload.amount,
          handlerSharePercentage: payload.handler_share_percentage ?? 0,
          notes: payload.notes || undefined,
        }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || "Failed to add forex entry");
      }
      const data = (await response.json()) as Record<string, unknown>;
      const entry = fromApi(data);
      set((s) => ({
        entries: [entry, ...s.entries],
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to add forex entry:", err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to add forex entry",
      });
      throw err;
    }
  },

  updateEntry: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const body: Record<string, unknown> = {};
      if (updates.type !== undefined) body.type = updates.type;
      if (updates.month !== undefined) body.month = updates.month;
      if (updates.amount !== undefined) body.amount = updates.amount;
      if (updates.handler_share_percentage !== undefined)
        body.handlerSharePercentage = updates.handler_share_percentage;
      if (updates.notes !== undefined) body.notes = updates.notes;

      const response = await fetch(`/api/forex/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || "Failed to update forex entry");
      }
      const data = (await response.json()) as Record<string, unknown>;
      const entry = fromApi(data);
      set((s) => ({
        entries: s.entries.map((e) => (e.id === id ? entry : e)),
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to update forex entry:", err);
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : "Failed to update forex entry",
      });
      throw err;
    }
  },

  deleteEntry: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/forex/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || "Failed to delete forex entry");
      }
      set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to delete forex entry:", err);
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : "Failed to delete forex entry",
      });
      throw err;
    }
  },
}));
