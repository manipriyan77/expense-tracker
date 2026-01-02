import { create } from "zustand";

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  status: "active" | "completed" | "overdue";
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface GoalsState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set) => ({
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
      const transformedGoals = data.map((goal: Record<string, unknown>) => ({
        id: goal.id as string,
        title: goal.title as string,
        targetAmount: parseFloat((goal.target_amount as string) || "0"),
        currentAmount: parseFloat((goal.current_amount as string) || "0"),
        targetDate: goal.target_date as string,
        category: goal.category as string,
        status: goal.status as "active" | "completed" | "overdue",
        user_id: goal.user_id as string,
        created_at: goal.created_at as string,
        updated_at: goal.updated_at as string,
      }));
      
      set({ goals: transformedGoals, loading: false });
    } catch (error) {
      console.error("Error fetching goals:", error);
      set({ error: error instanceof Error ? error.message : "Failed to fetch goals", loading: false });
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
      
      // Transform snake_case to camelCase
      const transformedGoal = {
        id: data.id,
        title: data.title,
        targetAmount: parseFloat(data.target_amount || 0),
        currentAmount: parseFloat(data.current_amount || 0),
        targetDate: data.target_date,
        category: data.category,
        status: data.status,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        goals: [transformedGoal, ...state.goals],
        loading: false,
      }));
    } catch (error) {
      console.error("Error adding goal:", error);
      set({ error: error instanceof Error ? error.message : "Failed to add goal", loading: false });
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

      const data = await response.json();
      
      // Transform snake_case to camelCase
      const transformedGoal = {
        id: data.id,
        title: data.title,
        targetAmount: parseFloat(data.target_amount || 0),
        currentAmount: parseFloat(data.current_amount || 0),
        targetDate: data.target_date,
        category: data.category,
        status: data.status,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? transformedGoal : goal
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating goal:", error);
      set({ error: error instanceof Error ? error.message : "Failed to update goal", loading: false });
    }
  },

  deleteGoal: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete goal");
      }

      set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting goal:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete goal";
      set({ error: errorMessage, loading: false });
      // Re-throw to let the UI handle it
      throw error;
    }
  },
}));
