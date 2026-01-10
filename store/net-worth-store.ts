"use client";

import { create } from "zustand";

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: "cash" | "bank" | "investment" | "property" | "vehicle" | "other";
  value: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: "credit_card" | "loan" | "mortgage" | "other";
  balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  due_date?: string;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at: string;
}

interface NetWorthState {
  assets: Asset[];
  liabilities: Liability[];
  snapshots: NetWorthSnapshot[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAssets: () => Promise<void>;
  fetchLiabilities: () => Promise<void>;
  fetchSnapshots: () => Promise<void>;
  addAsset: (asset: Omit<Asset, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  addLiability: (liability: Omit<Liability, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  updateLiability: (id: string, updates: Partial<Liability>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  createSnapshot: () => Promise<void>;
}

export const useNetWorthStore = create<NetWorthState>((set, get) => ({
  assets: [],
  liabilities: [],
  snapshots: [],
  loading: false,
  error: null,

  fetchAssets: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/net-worth/assets");
      if (!response.ok) throw new Error("Failed to fetch assets");
      const data = await response.json();
      set({ assets: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchLiabilities: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/net-worth/liabilities");
      if (!response.ok) throw new Error("Failed to fetch liabilities");
      const data = await response.json();
      set({ liabilities: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchSnapshots: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/net-worth/snapshots");
      if (!response.ok) throw new Error("Failed to fetch snapshots");
      const data = await response.json();
      set({ snapshots: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addAsset: async (asset) => {
    try {
      const response = await fetch("/api/net-worth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      });
      if (!response.ok) throw new Error("Failed to add asset");
      const newAsset = await response.json();
      set({ assets: [...get().assets, newAsset] });
      // Auto-create snapshot after adding asset
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addLiability: async (liability) => {
    try {
      const response = await fetch("/api/net-worth/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(liability),
      });
      if (!response.ok) throw new Error("Failed to add liability");
      const newLiability = await response.json();
      set({ liabilities: [...get().liabilities, newLiability] });
      // Auto-create snapshot after adding liability
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateAsset: async (id, updates) => {
    try {
      const response = await fetch(`/api/net-worth/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update asset");
      const updatedAsset = await response.json();
      set({
        assets: get().assets.map((a) => (a.id === id ? updatedAsset : a)),
      });
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateLiability: async (id, updates) => {
    try {
      const response = await fetch(`/api/net-worth/liabilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update liability");
      const updatedLiability = await response.json();
      set({
        liabilities: get().liabilities.map((l) => (l.id === id ? updatedLiability : l)),
      });
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteAsset: async (id) => {
    try {
      const response = await fetch(`/api/net-worth/assets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete asset");
      set({ assets: get().assets.filter((a) => a.id !== id) });
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteLiability: async (id) => {
    try {
      const response = await fetch(`/api/net-worth/liabilities/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete liability");
      set({ liabilities: get().liabilities.filter((l) => l.id !== id) });
      await get().createSnapshot();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createSnapshot: async () => {
    try {
      const response = await fetch("/api/net-worth/snapshots", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to create snapshot");
      const snapshot = await response.json();
      set({ snapshots: [...get().snapshots, snapshot] });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
