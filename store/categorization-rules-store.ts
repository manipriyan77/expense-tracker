import { create } from "zustand";

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: string;
  subtype: string | null;
  priority: number;
  user_id: string;
  created_at: string;
}

interface RulesState {
  rules: CategorizationRule[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  addRule: (rule: Omit<CategorizationRule, "id" | "user_id" | "created_at">) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  matchRule: (description: string) => { category: string; subtype: string | null } | null;
}

export const useCategorizationRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,

  fetchRules: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/categorization-rules");
      if (!res.ok) return;
      const data: CategorizationRule[] = await res.json();
      set({ rules: data });
    } catch {
      // silently fail — table may not exist yet or user may be unauthenticated
    } finally {
      set({ loading: false });
    }
  },

  addRule: async (rule) => {
    const res = await fetch("/api/categorization-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error("Failed to add rule");
    const data: CategorizationRule = await res.json();
    set((s) => ({ rules: [data, ...s.rules] }));
  },

  deleteRule: async (id) => {
    const res = await fetch(`/api/categorization-rules/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete rule");
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  matchRule: (description) => {
    const { rules } = get();
    const lower = description.toLowerCase();
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    for (const rule of sorted) {
      if (lower.includes(rule.keyword.toLowerCase())) {
        return { category: rule.category, subtype: rule.subtype };
      }
    }
    return null;
  },
}));
