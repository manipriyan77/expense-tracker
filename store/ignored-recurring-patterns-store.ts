import { create } from "zustand";

interface IgnoredRecurringPatternsState {
  ignoredKeys: string[];
  loading: boolean;
  fetchIgnored: () => Promise<void>;
  ignorePattern: (patternKey: string) => Promise<void>;
  restoreAll: () => Promise<void>;
}

export const useIgnoredRecurringPatternsStore = create<IgnoredRecurringPatternsState>((set, get) => ({
  ignoredKeys: [],
  loading: false,

  fetchIgnored: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/ignored-recurring-patterns");
      if (!res.ok) return;
      const data: string[] = await res.json();
      set({ ignoredKeys: data });
    } catch {
      // silently fail — user may be unauthenticated yet
    } finally {
      set({ loading: false });
    }
  },

  ignorePattern: async (patternKey) => {
    if (get().ignoredKeys.includes(patternKey)) return;
    set((s) => ({ ignoredKeys: [...s.ignoredKeys, patternKey] }));
    const res = await fetch("/api/ignored-recurring-patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternKey }),
    });
    if (!res.ok) {
      set((s) => ({ ignoredKeys: s.ignoredKeys.filter((k) => k !== patternKey) }));
      throw new Error("Failed to ignore suggestion");
    }
  },

  restoreAll: async () => {
    const previous = get().ignoredKeys;
    set({ ignoredKeys: [] });
    const res = await fetch("/api/ignored-recurring-patterns", { method: "DELETE" });
    if (!res.ok) {
      set({ ignoredKeys: previous });
      throw new Error("Failed to restore ignored suggestions");
    }
  },
}));
