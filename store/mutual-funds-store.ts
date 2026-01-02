import { create } from "zustand";

export interface MutualFund {
  id: string;
  name: string;
  symbol: string;
  investedAmount: number;
  currentValue: number;
  units: number;
  nav: number;
  purchaseDate: string;
  category: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface MutualFundsState {
  mutualFunds: MutualFund[];
  loading: boolean;
  error: string | null;
  fetchMutualFunds: () => Promise<void>;
  addMutualFund: (fund: Omit<MutualFund, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateMutualFund: (id: string, updates: Partial<MutualFund>) => Promise<void>;
  deleteMutualFund: (id: string) => Promise<void>;
}

export const useMutualFundsStore = create<MutualFundsState>((set) => ({
  mutualFunds: [],
  loading: false,
  error: null,

  fetchMutualFunds: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/mutual-funds");

      if (!response.ok) {
        throw new Error("Failed to fetch mutual funds");
      }

      const data = await response.json();
      
      // Transform snake_case to camelCase
      const transformedFunds = data.map((fund: any) => ({
        id: fund.id,
        name: fund.name,
        symbol: fund.symbol,
        investedAmount: parseFloat(fund.invested_amount || 0),
        currentValue: parseFloat(fund.current_value || 0),
        units: parseFloat(fund.units || 0),
        nav: parseFloat(fund.nav || 0),
        purchaseDate: fund.purchase_date,
        category: fund.category,
        user_id: fund.user_id,
        created_at: fund.created_at,
        updated_at: fund.updated_at,
      }));
      
      set({ mutualFunds: transformedFunds, loading: false });
    } catch (error) {
      console.error("Error fetching mutual funds:", error);
      set({ error: error instanceof Error ? error.message : "Failed to fetch mutual funds", loading: false });
    }
  },

  addMutualFund: async (fundData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/mutual-funds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fundData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add mutual fund");
      }

      const data = await response.json();
      
      // Transform snake_case to camelCase
      const transformedFund = {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        investedAmount: parseFloat(data.invested_amount || 0),
        currentValue: parseFloat(data.current_value || 0),
        units: parseFloat(data.units || 0),
        nav: parseFloat(data.nav || 0),
        purchaseDate: data.purchase_date,
        category: data.category,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        mutualFunds: [transformedFund, ...state.mutualFunds],
        loading: false,
      }));
    } catch (error) {
      console.error("Error adding mutual fund:", error);
      set({ error: error instanceof Error ? error.message : "Failed to add mutual fund", loading: false });
    }
  },

  updateMutualFund: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/mutual-funds/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update mutual fund");
      }

      const data = await response.json();
      
      // Transform snake_case to camelCase
      const transformedFund = {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        investedAmount: parseFloat(data.invested_amount || 0),
        currentValue: parseFloat(data.current_value || 0),
        units: parseFloat(data.units || 0),
        nav: parseFloat(data.nav || 0),
        purchaseDate: data.purchase_date,
        category: data.category,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        mutualFunds: state.mutualFunds.map((fund) =>
          fund.id === id ? transformedFund : fund
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating mutual fund:", error);
      set({ error: error instanceof Error ? error.message : "Failed to update mutual fund", loading: false });
    }
  },

  deleteMutualFund: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/mutual-funds/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete mutual fund");
      }

      set((state) => ({
        mutualFunds: state.mutualFunds.filter((fund) => fund.id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting mutual fund:", error);
      set({ error: error instanceof Error ? error.message : "Failed to delete mutual fund", loading: false });
    }
  },
}));
