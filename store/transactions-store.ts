import { create } from "zustand";

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  subtype: string;
  budget_id: string;
  goal_id?: string | null;
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
      
      // Transform data if needed (Supabase returns lowercase)
      const transformedTransactions = data.map((transaction: any) => ({
        id: transaction.id,
        amount: parseFloat(transaction.amount || 0),
        description: transaction.description,
        category: transaction.category,
        subtype: transaction.subtype || 'Other',
        budget_id: transaction.budget_id,
        goal_id: transaction.goal_id,
        date: transaction.date,
        type: transaction.type,
        user_id: transaction.user_id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      }));
      
      set({ transactions: transformedTransactions, loading: false });
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
      
      // Transform data
      const transformedTransaction = {
        id: data.id,
        amount: parseFloat(data.amount || 0),
        description: data.description,
        category: data.category,
        subtype: data.subtype || 'Other',
        budget_id: data.budget_id,
        goal_id: data.goal_id,
        date: data.date,
        type: data.type,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        transactions: [transformedTransaction, ...state.transactions],
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
      
      // Transform data
      const transformedTransaction = {
        id: data.id,
        amount: parseFloat(data.amount || 0),
        description: data.description,
        category: data.category,
        subtype: data.subtype || 'Other',
        budget_id: data.budget_id,
        goal_id: data.goal_id,
        date: data.date,
        type: data.type,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      set((state) => ({
        transactions: state.transactions.map((transaction) =>
          transaction.id === id ? transformedTransaction : transaction
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
