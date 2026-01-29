import { create } from "zustand";

export interface RecurringPattern {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string | null;
  next_date: string;
  is_active: boolean;
  auto_create: boolean;
  tags?: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface RecurringPatternsState {
  patterns: RecurringPattern[];
  loading: boolean;
  error: string | null;
  fetchPatterns: () => Promise<void>;
  addPattern: (pattern: Omit<RecurringPattern, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updatePattern: (id: string, updates: Partial<RecurringPattern>) => Promise<void>;
  deletePattern: (id: string) => Promise<void>;
  createTransaction: (id: string) => Promise<{ transaction: any; nextDate: string }>;
}

export const useRecurringPatternsStore = create<RecurringPatternsState>((set, get) => ({
  patterns: [],
  loading: false,
  error: null,

  fetchPatterns: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/recurring-patterns");
      if (!response.ok) throw new Error("Failed to fetch recurring patterns");
      const data = await response.json();
      set({ patterns: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addPattern: async (patternData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/recurring-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patternData),
      });
      if (!response.ok) throw new Error("Failed to add recurring pattern");
      const newPattern = await response.json();
      set({ patterns: [...get().patterns, newPattern], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updatePattern: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/recurring-patterns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update recurring pattern");
      const updatedPattern = await response.json();
      set({
        patterns: get().patterns.map((p) => (p.id === id ? updatedPattern : p)),
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deletePattern: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/recurring-patterns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete recurring pattern");
      set({ patterns: get().patterns.filter((p) => p.id !== id), loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createTransaction: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/recurring-patterns/${id}/create-transaction`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }
      const result = await response.json();
      // Update the pattern's next_date
      set({
        patterns: get().patterns.map((p) =>
          p.id === id ? { ...p, next_date: result.nextDate } : p
        ),
        loading: false,
      });
      return result;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));
