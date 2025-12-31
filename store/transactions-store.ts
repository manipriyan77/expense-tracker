import { create } from "zustand";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      set({ transactions: data, loading: false });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      set({ error: error instanceof Error ? error.message : "Failed to fetch transactions", loading: false });
    }
  },

  addTransaction: async (transactionData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add transaction");
      }

      const data = await response.json();
      set((state) => ({
        transactions: [data, ...state.transactions],
        loading: false,
      }));
    } catch (error) {
      console.error("Error adding transaction:", error);
      set({ error: error instanceof Error ? error.message : "Failed to add transaction", loading: false });
    }
  },

  updateTransaction: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transaction");
      }

      const data = await response.json();
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          transaction.id === id ? data : transaction
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Error updating transaction:", error);
      set({ error: error instanceof Error ? error.message : "Failed to update transaction", loading: false });
    }
  },

  deleteTransaction: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transaction");
      }

      set((state) => ({
        transactions: state.transactions.filter((transaction) => transaction.id !== id),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      set({ error: error instanceof Error ? error.message : "Failed to delete transaction", loading: false });
    }
  },
}));
