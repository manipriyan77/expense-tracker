import { create } from "zustand";

export interface Budget {
  id: string;
  category: string;
  subtype: string | null;
  limit_amount: number;
  spent_amount: number;
  period: "monthly" | "weekly" | "yearly";
  month: number;
  year: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface BudgetsState {
  budgets: Budget[];
  currentMonth: number;
  currentYear: number;
  loading: boolean;
  error: string | null;
  fetchBudgets: (month?: number, year?: number) => Promise<void>;
  setMonth: (month: number, year: number) => void;
  addBudget: (budget: Omit<Budget, "id" | "user_id" | "created_at" | "updated_at" | "spent_amount" | "month" | "year">) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<{ success: boolean; deletedTransactions: number } | void>;
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  loading: false,
  error: null,

  setMonth: (month: number, year: number) => {
    set({ currentMonth: month, currentYear: year });
    get().fetchBudgets(month, year);
  },

  fetchBudgets: async (month?: number, year?: number) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const targetMonth = month ?? state.currentMonth;
      const targetYear = year ?? state.currentYear;

      const response = await fetch(`/api/budgets?month=${targetMonth}&year=${targetYear}`);

      if (!response.ok) {
        throw new Error("Failed to fetch budgets");
      }

      const data = await response.json();
      set({ budgets: data, loading: false, currentMonth: targetMonth, currentYear: targetYear });
    } catch (error) {
      console.error("Error fetching budgets:", error);
      set({ error: error instanceof Error ? error.message : "Failed to fetch budgets", loading: false });
    }
  },

  addBudget: async (budgetData) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...budgetData,
          month: state.currentMonth,
          year: state.currentYear,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add budget");
      }

      const data = await response.json();
      
      set((state) => ({
        budgets: [data, ...state.budgets],
        loading: false,
      }));
    } catch (error) {
      console.error("Error adding budget:", error);
      set({ error: error instanceof Error ? error.message : "Failed to add budget", loading: false });
      throw error;
    }
  },

  updateBudget: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update budget");
      }

      const data = await response.json();
      
      set((state) => ({
        budgets: state.budgets.map((budget) =>
          budget.id === id ? data : budget
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating budget:", error);
      set({ error: error instanceof Error ? error.message : "Failed to update budget", loading: false });
    }
  },

  deleteBudget: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete budget");
      }

      const result = await response.json();

      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== id),
        loading: false,
      }));

      return result;
    } catch (error) {
      console.error("Error deleting budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete budget";
      set({ error: errorMessage, loading: false });
      // Re-throw to let the UI handle it
      throw error;
    }
  },
}));

