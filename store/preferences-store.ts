import { create } from "zustand";

export type SelectedPeriod =
  | "all-time"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year";

interface PreferencesState {
  selectedPeriod: SelectedPeriod;
  loaded: boolean;
  loading: boolean;
  fetchPreferences: () => Promise<void>;
  setSelectedPeriod: (period: SelectedPeriod) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  selectedPeriod: "all-time",
  loaded: false,
  loading: false,

  fetchPreferences: async () => {
    if (get().loaded) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/preferences");
      if (!res.ok) return;
      const data = await res.json();
      set({ selectedPeriod: data.selectedPeriod ?? "all-time", loaded: true });
    } catch {
      // silently fail — default to all-time
    } finally {
      set({ loading: false });
    }
  },

  setSelectedPeriod: async (period) => {
    const previous = get().selectedPeriod;
    set({ selectedPeriod: period });
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPeriod: period }),
      });
      if (!res.ok) throw new Error("Failed to save period");
    } catch {
      set({ selectedPeriod: previous });
      throw new Error("Could not save your selected period");
    }
  },
}));
