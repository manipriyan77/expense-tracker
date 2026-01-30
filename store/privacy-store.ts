import { create } from "zustand";

const STORAGE_KEY = "expense-tracker-privacy";

function loadAmountsHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function persistAmountsHidden(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to persist privacy preference", e);
  }
}

interface PrivacyState {
  amountsHidden: boolean;
  toggleAmountsHidden: () => void;
  hydrateFromStorage: () => void;
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  amountsHidden: false,

  toggleAmountsHidden: () => {
    set((s) => {
      const next = !s.amountsHidden;
      persistAmountsHidden(next);
      return { amountsHidden: next };
    });
  },

  hydrateFromStorage: () => {
    set({ amountsHidden: loadAmountsHidden() });
  },
}));
