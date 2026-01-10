"use client";

import { create } from "zustand";

export interface SavingsChallenge {
  id: string;
  user_id: string;
  name: string;
  type: "52_week" | "daily_dollar" | "custom" | "percentage";
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  frequency: "daily" | "weekly" | "monthly";
  status: "active" | "completed" | "paused";
  created_at: string;
  updated_at: string;
}

export interface ChallengeContribution {
  id: string;
  user_id: string;
  challenge_id: string;
  amount: number;
  contribution_date: string;
  notes?: string;
  created_at: string;
}

interface SavingsChallengesState {
  challenges: SavingsChallenge[];
  contributions: ChallengeContribution[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchChallenges: () => Promise<void>;
  fetchContributions: (challengeId: string) => Promise<void>;
  addChallenge: (challenge: Omit<SavingsChallenge, "id" | "user_id" | "created_at" | "updated_at" | "current_amount">) => Promise<void>;
  addContribution: (contribution: Omit<ChallengeContribution, "id" | "user_id" | "created_at">) => Promise<void>;
  updateChallenge: (id: string, updates: Partial<SavingsChallenge>) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  completeChallenge: (id: string) => Promise<void>;
  pauseChallenge: (id: string) => Promise<void>;
  resumeChallenge: (id: string) => Promise<void>;
}

export const useSavingsChallengesStore = create<SavingsChallengesState>((set, get) => ({
  challenges: [],
  contributions: [],
  loading: false,
  error: null,

  fetchChallenges: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch("/api/savings-challenges");
      if (!response.ok) throw new Error("Failed to fetch challenges");
      const data = await response.json();
      set({ challenges: data, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchContributions: async (challengeId) => {
    try {
      const response = await fetch(`/api/savings-challenges/${challengeId}/contributions`);
      if (!response.ok) throw new Error("Failed to fetch contributions");
      const data = await response.json();
      set({ contributions: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addChallenge: async (challenge) => {
    try {
      const response = await fetch("/api/savings-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(challenge),
      });
      if (!response.ok) throw new Error("Failed to add challenge");
      const newChallenge = await response.json();
      set({ challenges: [...get().challenges, newChallenge] });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addContribution: async (contribution) => {
    try {
      const response = await fetch(`/api/savings-challenges/${contribution.challenge_id}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contribution),
      });
      if (!response.ok) throw new Error("Failed to add contribution");
      const newContribution = await response.json();
      
      // Update challenge current_amount
      set({
        contributions: [...get().contributions, newContribution],
        challenges: get().challenges.map((c) =>
          c.id === contribution.challenge_id
            ? { ...c, current_amount: c.current_amount + contribution.amount }
            : c
        ),
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateChallenge: async (id, updates) => {
    try {
      const response = await fetch(`/api/savings-challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update challenge");
      const updatedChallenge = await response.json();
      set({
        challenges: get().challenges.map((c) => (c.id === id ? updatedChallenge : c)),
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteChallenge: async (id) => {
    try {
      const response = await fetch(`/api/savings-challenges/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete challenge");
      set({ challenges: get().challenges.filter((c) => c.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  completeChallenge: async (id) => {
    await get().updateChallenge(id, { status: "completed" });
  },

  pauseChallenge: async (id) => {
    await get().updateChallenge(id, { status: "paused" });
  },

  resumeChallenge: async (id) => {
    await get().updateChallenge(id, { status: "active" });
  },
}));
