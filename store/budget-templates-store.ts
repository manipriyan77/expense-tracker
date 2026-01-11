"use client";

import { create } from "zustand";

export interface BudgetTemplateCategory {
  category: string;
  subtype: string;
  amount: number;
  period: string;
}

export interface BudgetTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  categories: BudgetTemplateCategory[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to calculate total budget from categories
export const calculateTotalBudget = (categories: readonly { amount: number }[] | { amount: number }[]): number => {
  let total = 0;
  for (const cat of categories) {
    total += cat.amount;
  }
  return total;
};

interface BudgetTemplatesState {
  templates: BudgetTemplate[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTemplates: () => Promise<void>;
  addTemplate: (template: Omit<BudgetTemplate, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<BudgetTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useBudgetTemplatesStore = create<BudgetTemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/budget-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      set({ templates: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addTemplate: async (template) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/budget-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to add template";
        const hint = errorData.hint;
        
        // Provide helpful error message with hint if available
        const fullError = hint ? `${errorMessage}\n\n${hint}` : errorMessage;
        throw new Error(fullError);
      }
      
      const newTemplate = await response.json();
      set({ 
        templates: [...get().templates, newTemplate],
        loading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateTemplate: async (id, updates) => {
    try {
      const response = await fetch(`/api/budget-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update template");
      const updatedTemplate = await response.json();
      set({
        templates: get().templates.map((t) => (t.id === id ? updatedTemplate : t)),
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteTemplate: async (id) => {
    try {
      const response = await fetch(`/api/budget-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      set({ templates: get().templates.filter((t) => t.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
