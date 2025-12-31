import { create } from "zustand";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData?: { name?: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      set({ user: data.user, loading: false });
      return {};
    } catch (error) {
      set({ loading: false });
      return { error: error instanceof Error ? error.message : "Sign in failed" };
    }
  },

  signUp: async (email: string, password: string, userData) => {
    set({ loading: true });
    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        set({ loading: false });
        return { error: error.message };
      }

      set({ user: data.user, loading: false });
      return {};
    } catch (error) {
      set({ loading: false });
      return { error: error instanceof Error ? error.message : "Sign up failed" };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      set({ user: null, loading: false });
    } catch (error) {
      console.error("Sign out error:", error);
      set({ loading: false });
    }
  },

  initializeAuth: async () => {
    if (get().initialized) return;

    try {
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();

      set({
        user: session?.user || null,
        initialized: true,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        set({ user: session?.user || null });
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      set({ initialized: true });
    }
  },
}));
