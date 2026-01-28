import { create } from "zustand";

export type Compounding = "monthly" | "quarterly" | "semiannual" | "annual";
export type Payout = "reinvest" | "payout";

export interface FixedDeposit {
  id: string;
  institution: string;
  principal: number;
  rate: number; // annual %
  compounding: Compounding;
  payout: Payout;
  startDate: string;
  maturityDate: string;
  tenureMonths: number;
  notes?: string;
}

interface FDState {
  deposits: FixedDeposit[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (payload: Omit<FixedDeposit, "id">) => Promise<void>;
  update: (id: string, updates: Partial<FixedDeposit>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = "fd_list_v1";

const persist = (data: FixedDeposit[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to persist FDs", err);
  }
};

const read = (): FixedDeposit[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FixedDeposit[]) : [];
  } catch (err) {
    console.error("Failed to read FDs", err);
    return [];
  }
};

export const useFixedDepositsStore = create<FDState>((set, get) => ({
  deposits: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    const data = read();
    set({ deposits: data, loading: false });
  },

  add: async (payload) => {
    const deposit: FixedDeposit = {
      id: crypto.randomUUID(),
      ...payload,
    };
    const updated = [deposit, ...get().deposits];
    set({ deposits: updated });
    persist(updated);
  },

  update: async (id, updates) => {
    const updated = get().deposits.map((d) =>
      d.id === id ? { ...d, ...updates, id: d.id } : d
    );
    set({ deposits: updated });
    persist(updated);
  },

  remove: async (id) => {
    const updated = get().deposits.filter((d) => d.id !== id);
    set({ deposits: updated });
    persist(updated);
  },
}));
