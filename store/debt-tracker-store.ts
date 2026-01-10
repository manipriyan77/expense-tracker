"use client";

import { create } from "zustand";

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: "credit_card" | "loan" | "mortgage" | "other";
  balance: number;
  original_amount: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: string | null; // Date field from database
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  user_id: string;
  liability_id: string;
  amount: number;
  payment_date: string;
  principal_amount?: number;
  interest_amount?: number;
  notes?: string;
  created_at: string;
}

interface DebtTrackerState {
  debts: Debt[];
  payments: DebtPayment[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDebts: () => Promise<void>;
  fetchPayments: (debtId: string) => Promise<void>;
  fetchAllPayments: () => Promise<void>;
  addDebt: (debt: Omit<Debt, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  addPayment: (payment: Omit<DebtPayment, "id" | "user_id" | "created_at">) => Promise<void>;
  updateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
}

export const useDebtTrackerStore = create<DebtTrackerState>((set, get) => ({
  debts: [],
  payments: [],
  loading: false,
  error: null,

  fetchDebts: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/debt-tracker");
      if (!response.ok) throw new Error("Failed to fetch debts");
      const data = await response.json();
      set({ debts: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchPayments: async (debtId) => {
    try {
      const response = await fetch(`/api/debt-tracker/${debtId}/payments`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      set({ payments: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchAllPayments: async () => {
    try {
      const debts = get().debts;
      console.log('Fetching payments for', debts.length, 'debts');
      const allPayments: DebtPayment[] = [];
      
      // Fetch payments for each debt
      for (const debt of debts) {
        const response = await fetch(`/api/debt-tracker/${debt.id}/payments`);
        if (response.ok) {
          const payments = await response.json();
          console.log(`Fetched ${payments.length} payments for debt ${debt.name}`);
          allPayments.push(...payments);
        } else {
          console.error(`Failed to fetch payments for debt ${debt.id}:`, response.statusText);
        }
      }
      
      // Sort by payment date (most recent first)
      allPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      
      console.log('Total payments fetched:', allPayments.length);
      set({ payments: allPayments });
    } catch (error) {
      console.error('Error fetching all payments:', error);
      set({ error: (error as Error).message });
    }
  },

  addDebt: async (debt) => {
    try {
      const response = await fetch("/api/debt-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(debt),
      });
      if (!response.ok) throw new Error("Failed to add debt");
      const newDebt = await response.json();
      set({ debts: [...get().debts, newDebt] });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addPayment: async (payment) => {
    try {
      const response = await fetch(`/api/debt-tracker/${payment.liability_id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      if (!response.ok) throw new Error("Failed to add payment");
      const newPayment = await response.json();
      
      // Update debt balance
      set({
        payments: [...get().payments, newPayment],
        debts: get().debts.map((d) =>
          d.id === payment.liability_id
            ? { ...d, balance: Math.max(0, d.balance - payment.amount) }
            : d
        ),
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateDebt: async (id, updates) => {
    try {
      const response = await fetch(`/api/debt-tracker/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update debt");
      const updatedDebt = await response.json();
      set({
        debts: get().debts.map((d) => (d.id === id ? updatedDebt : d)),
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteDebt: async (id) => {
    try {
      const response = await fetch(`/api/debt-tracker/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete debt");
      set({ debts: get().debts.filter((d) => d.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
