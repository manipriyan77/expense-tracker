import { create } from "zustand";

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  stockType: "large_cap" | "mid_cap" | "small_cap" | "etf" | "other";
  shares: number;
  avgPurchasePrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  sector: string;
  subSector?: string;
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
      
      // Transform snake_case to camelCase
      const transformedStocks = data.map((stock: any) => ({
        id: stock.id,
        name: stock.name,
        symbol: stock.symbol,
        stockType: (stock.stock_type as Stock["stockType"]) ?? "other",
        shares: parseFloat(stock.shares || 0),
        avgPurchasePrice: parseFloat(stock.avg_purchase_price || 0),
        currentPrice: parseFloat(stock.current_price || 0),
        investedAmount: parseFloat(stock.invested_amount || 0),
        currentValue: parseFloat(stock.current_value || 0),
        purchaseDate: stock.purchase_date,
        sector: stock.sector,
        subSector: stock.sub_sector,
        user_id: stock.user_id,
        created_at: stock.created_at,
        updated_at: stock.updated_at,
      }));
      
      set({ stocks: transformedStocks, loading: false });
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
      
      // Transform snake_case to camelCase
      const transformedStock = {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        stockType: (data.stock_type as Stock["stockType"]) ?? "other",
        shares: parseFloat(data.shares || 0),
        avgPurchasePrice: parseFloat(data.avg_purchase_price || 0),
        currentPrice: parseFloat(data.current_price || 0),
        investedAmount: parseFloat(data.invested_amount || 0),
        currentValue: parseFloat(data.current_value || 0),
        purchaseDate: data.purchase_date,
        sector: data.sector,
        subSector: data.sub_sector,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        stocks: [transformedStock, ...state.stocks],
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
      
      // Transform snake_case to camelCase
      const transformedStock = {
        id: data.id,
        name: data.name,
        symbol: data.symbol,
        stockType: (data.stock_type as Stock["stockType"]) ?? "other",
        shares: parseFloat(data.shares || 0),
        avgPurchasePrice: parseFloat(data.avg_purchase_price || 0),
        currentPrice: parseFloat(data.current_price || 0),
        investedAmount: parseFloat(data.invested_amount || 0),
        currentValue: parseFloat(data.current_value || 0),
        purchaseDate: data.purchase_date,
        sector: data.sector,
        subSector: data.sub_sector,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        stocks: state.stocks.map((stock) =>
          stock.id === id ? transformedStock : stock
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
