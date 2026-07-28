import { create } from "zustand";

export type LookupKind = "category" | "account" | "tag";

export interface Lookup {
  id: string;
  user_id: string;
  kind: LookupKind;
  name: string;
  created_at: string;
}

interface LookupsState {
  categories: Lookup[];
  accounts: Lookup[];
  tags: Lookup[];
  loading: boolean;
  fetched: boolean;
  fetchLookups: () => Promise<void>;
  addLookup: (kind: LookupKind, name: string) => Promise<Lookup | null>;
  deleteLookup: (id: string) => Promise<void>;
}

function bucketFor(state: LookupsState, kind: LookupKind) {
  if (kind === "category") return state.categories;
  if (kind === "account") return state.accounts;
  return state.tags;
}

export const useLookupsStore = create<LookupsState>((set, get) => ({
  categories: [],
  accounts: [],
  tags: [],
  loading: false,
  fetched: false,

  fetchLookups: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/lookups");
      if (!res.ok) return;
      const data: Lookup[] = await res.json();
      set({
        categories: data.filter((l) => l.kind === "category"),
        accounts: data.filter((l) => l.kind === "account"),
        tags: data.filter((l) => l.kind === "tag"),
        fetched: true,
      });
    } catch {
      // silently fail — user may be unauthenticated yet
    } finally {
      set({ loading: false });
    }
  },

  addLookup: async (kind, name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = bucketFor(get(), kind).find(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;

    const res = await fetch("/api/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: trimmed }),
    });
    if (!res.ok) throw new Error("Failed to add");
    const data: Lookup = await res.json();
    set((s) => {
      if (kind === "category") return { categories: [...s.categories, data].sort((a, b) => a.name.localeCompare(b.name)) };
      if (kind === "account") return { accounts: [...s.accounts, data].sort((a, b) => a.name.localeCompare(b.name)) };
      return { tags: [...s.tags, data].sort((a, b) => a.name.localeCompare(b.name)) };
    });
    return data;
  },

  deleteLookup: async (id) => {
    const res = await fetch(`/api/lookups/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    set((s) => ({
      categories: s.categories.filter((l) => l.id !== id),
      accounts: s.accounts.filter((l) => l.id !== id),
      tags: s.tags.filter((l) => l.id !== id),
    }));
  },
}));
