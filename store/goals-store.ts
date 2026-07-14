import { create } from "zustand";

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  status: "active" | "completed" | "overdue";
  priority: "high" | "medium" | "low";
  monthlyContribution?: number;
  /** Tracking unit: money ("amount") or metal weight in grams ("grams"). */
  unit: "amount" | "grams";
  user_id: string;
  created_at: string;
  updated_at: string;
  /** Live total of linked investments, in the goal's unit (₹ or grams). */
  linkedValue?: number;
  /** Number of investment holdings linked to this goal. */
  linkedCount?: number;
  /** True when progress is driven by linked investments (linkedCount > 0). */
  autoTracked?: boolean;
  /** Manually entered current amount, preserved even while auto-tracked. */
  manualAmount?: number;
}

export type LinkSelection = { type: string; id: string };

export interface HoldingOption {
  type: "mutual_fund" | "stock" | "gold" | "silver" | "other";
  id: string;
  name: string;
  currentValue: number;
  /** Weight in grams, present for metal holdings (gold, silver). */
  grams?: number;
  linkedGoalId: string | null;
}

interface GoalsState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (
    goal: Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string, options?: { unlink?: boolean }) => Promise<void>;
  fetchHoldings: () => Promise<HoldingOption[]>;
  setGoalLinks: (goalId: string, selections: LinkSelection[]) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/goals");

      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }

      const data = await response.json();

      // Transform snake_case to camelCase
      const transformedGoals = data.map((goal: Record<string, unknown>) => {
        const manualAmount = parseFloat((goal.current_amount as string) || "0");
        const linkedCount = Number(goal.linked_count ?? 0);
        const linkedValue = parseFloat(String(goal.linked_value ?? "0"));
        const autoTracked = linkedCount > 0;
        return {
          id: goal.id as string,
          title: goal.title as string,
          targetAmount: parseFloat((goal.target_amount as string) || "0"),
          // When linked to investments, progress is driven by their live value.
          currentAmount: autoTracked ? linkedValue : manualAmount,
          manualAmount,
          linkedValue,
          linkedCount,
          autoTracked,
          targetDate: goal.target_date as string,
          category: goal.category as string,
          status: goal.status as "active" | "completed" | "overdue",
          priority: (goal.priority as "high" | "medium" | "low") ?? "medium",
          unit: (goal.unit as "amount" | "grams") ?? "amount",
          monthlyContribution:
            goal.monthly_contribution != null
              ? parseFloat(String(goal.monthly_contribution))
              : undefined,
          user_id: goal.user_id as string,
          created_at: goal.created_at as string,
          updated_at: goal.updated_at as string,
        };
      });

      set({ goals: transformedGoals, loading: false });
    } catch (error) {
      console.error("Error fetching goals:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to fetch goals",
        loading: false,
      });
    }
  },

  addGoal: async (goalData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add goal");
      }

      const data = await response.json();

      // Refetch so unit + linked investment values are always consistent.
      await get().fetchGoals();
    } catch (error) {
      console.error("Error adding goal:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to add goal",
        loading: false,
      });
    }
  },

  updateGoal: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update goal");
      }

      await response.json();

      // Refetch so unit + linked investment values are always consistent.
      await get().fetchGoals();
    } catch (error) {
      console.error("Error updating goal:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to update goal",
        loading: false,
      });
    }
  },

  deleteGoal: async (id, options) => {
    set({ loading: true, error: null });
    try {
      const url = options?.unlink
        ? `/api/goals/${id}?unlink=true`
        : `/api/goals/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || "Failed to delete goal") as Error & {
          hasTransactions?: boolean;
        };
        err.hasTransactions = errorData.hasTransactions === true;
        throw err;
      }

      set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting goal:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete goal";
      set({ error: errorMessage, loading: false });
      // Re-throw to let the UI handle it
      throw error;
    }
  },

  fetchHoldings: async () => {
    const response = await fetch("/api/goals/links");
    if (!response.ok) throw new Error("Failed to fetch investments");
    const data = await response.json();
    return (data.holdings ?? []) as HoldingOption[];
  },

  setGoalLinks: async (goalId, selections) => {
    const response = await fetch(`/api/goals/${goalId}/links`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update linked investments");
    }
    // Refresh goals so linked values reflect the new mapping.
    await get().fetchGoals();
  },
}));
