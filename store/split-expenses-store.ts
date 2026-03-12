import { create } from "zustand";

export interface SplitParticipant {
  name: string;
  amount: number;
  paid: boolean;
}

export interface SplitExpense {
  id: string;
  description: string;
  totalAmount: number;
  date: string;
  participants: SplitParticipant[];
  settled: boolean;
  notes?: string;
  createdAt: string;
}

interface SplitExpensesState {
  splits: SplitExpense[];
  addSplit: (split: Omit<SplitExpense, "id" | "createdAt">) => void;
  updateSplit: (id: string, updates: Partial<SplitExpense>) => void;
  deleteSplit: (id: string) => void;
  markParticipantPaid: (splitId: string, participantName: string) => void;
  markSettled: (splitId: string) => void;
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = "split-expenses";

function persist(splits: SplitExpense[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(splits));
  } catch {}
}

export const useSplitExpensesStore = create<SplitExpensesState>((set, get) => ({
  splits: [],

  addSplit: (split) => {
    const newSplit: SplitExpense = {
      ...split,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const next = [newSplit, ...get().splits];
    set({ splits: next });
    persist(next);
  },

  updateSplit: (id, updates) => {
    const next = get().splits.map((s) => (s.id === id ? { ...s, ...updates } : s));
    set({ splits: next });
    persist(next);
  },

  deleteSplit: (id) => {
    const next = get().splits.filter((s) => s.id !== id);
    set({ splits: next });
    persist(next);
  },

  markParticipantPaid: (splitId, participantName) => {
    const next = get().splits.map((s) => {
      if (s.id !== splitId) return s;
      return {
        ...s,
        participants: s.participants.map((p) =>
          p.name === participantName ? { ...p, paid: true } : p
        ),
      };
    });
    set({ splits: next });
    persist(next);
  },

  markSettled: (splitId) => {
    const next = get().splits.map((s) =>
      s.id === splitId
        ? {
            ...s,
            settled: true,
            participants: s.participants.map((p) => ({ ...p, paid: true })),
          }
        : s
    );
    set({ splits: next });
    persist(next);
  },

  hydrateFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ splits: JSON.parse(stored) });
      }
    } catch {}
  },
}));
