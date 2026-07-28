import { create } from "zustand";

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: string;
  subtype: string | null;
  priority: number;
  enabled: boolean;
  user_id: string;
  created_at: string;
}

interface RulesState {
  rules: CategorizationRule[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  addRule: (rule: Omit<CategorizationRule, "id" | "user_id" | "created_at" | "enabled">) => Promise<void>;
  updateRule: (id: string, updates: Partial<Pick<CategorizationRule, "keyword" | "category" | "subtype" | "enabled">>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  matchRule: (description: string) => { category: string; subtype: string | null } | null;
  /** Teach the system: maps a keyword to a category/subtype, replacing any
   *  existing rule for the same keyword so the latest correction always wins. */
  learnRule: (keyword: string, category: string, subtype: string | null) => Promise<void>;
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

  updateRule: async (id, updates) => {
    const res = await fetch(`/api/categorization-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update rule");
    const data: CategorizationRule = await res.json();
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? data : r)) }));
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
    const sorted = [...rules].filter((r) => r.enabled !== false).sort((a, b) => b.priority - a.priority);
    for (const rule of sorted) {
      if (lower.includes(rule.keyword.toLowerCase())) {
        return { category: rule.category, subtype: rule.subtype };
      }
    }
    return null;
  },

  learnRule: async (keyword, category, subtype) => {
    const kw = keyword.trim();
    if (!kw) return;
    // Remove any prior rule for the same keyword so corrections override cleanly.
    const existing = get().rules.filter(
      (r) => r.keyword.toLowerCase() === kw.toLowerCase(),
    );
    for (const r of existing) {
      try {
        await get().deleteRule(r.id);
      } catch {
        // ignore — best effort
      }
    }
    // Learned rules outrank built-in matches via a high priority.
    await get().addRule({
      keyword: kw,
      category,
      subtype: subtype || null,
      priority: 100,
    });
  },
}));
