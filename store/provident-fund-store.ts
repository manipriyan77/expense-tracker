import { create } from "zustand";

export type PFType = "EPF" | "PPF" | "VPF" | "Other";

export interface ProvidentFund {
  id: string;
  name: string;
  type: PFType;
  balance: number;
  annualInterestRate: number;
  employeeContribution: number;
  employerContribution: number;
  lastInterestCredit?: string;
  startDate?: string;
  notes?: string;
}

interface PFState {
  funds: ProvidentFund[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (payload: Omit<ProvidentFund, "id">) => Promise<void>;
  update: (id: string, updates: Partial<ProvidentFund>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = "pf_list_v1";

const persist = (data: ProvidentFund[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to persist PF data", err);
  }
};

const read = (): ProvidentFund[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProvidentFund[]) : [];
  } catch (err) {
    console.error("Failed to read PF data", err);
    return [];
  }
};

export const useProvidentFundStore = create<PFState>((set, get) => ({
  funds: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    const data = read();
    set({ funds: data, loading: false });
  },

  add: async (payload) => {
    const fund: ProvidentFund = {
      id: crypto.randomUUID(),
      ...payload,
    };
    const updated = [fund, ...get().funds];
    set({ funds: updated });
    persist(updated);
  },

  update: async (id, updates) => {
    const updated = get().funds.map((f) =>
      f.id === id ? { ...f, ...updates, id: f.id } : f
    );
    set({ funds: updated });
    persist(updated);
  },

  remove: async (id) => {
    const updated = get().funds.filter((f) => f.id !== id);
    set({ funds: updated });
    persist(updated);
  },
}));
