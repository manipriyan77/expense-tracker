import { create } from "zustand";

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  avgPurchasePrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  sector: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface StocksState {
  stocks: Stock[];
  loading: boolean;
  error: string | null;
  fetchStocks: () => Promise<void>;
  addStock: (stock: Omit<Stock, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateStock: (id: string, updates: Partial<Stock>) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
}

export const useStocksStore = create<StocksState>((set) => ({
  stocks: [],
  loading: false,
  error: null,

  fetchStocks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/stocks");

      if (!response.ok) {
        throw new Error("Failed to fetch stocks");
      }

      const data = await response.json();
      set({ stocks: data, loading: false });
    } catch (error) {
      console.error("Error fetching stocks:", error);
      set({ error: error instanceof Error ? error.message : "Failed to fetch stocks", loading: false });
    }
  },

  addStock: async (stockData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add stock");
      }

      const data = await response.json();
      set((state) => ({
        stocks: [data, ...state.stocks],
        loading: false,
      }));
    } catch (error) {
      console.error("Error adding stock:", error);
      set({ error: error instanceof Error ? error.message : "Failed to add stock", loading: false });
    }
  },

  updateStock: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update stock");
      }

      const data = await response.json();
      set((state) => ({
        stocks: state.stocks.map((stock) =>
          stock.id === id ? data : stock
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating stock:", error);
      set({ error: error instanceof Error ? error.message : "Failed to update stock", loading: false });
    }
  },

  deleteStock: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete stock");
      }

      set((state) => ({
        stocks: state.stocks.filter((stock) => stock.id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting stock:", error);
      set({ error: error instanceof Error ? error.message : "Failed to delete stock", loading: false });
    }
  },
}));
