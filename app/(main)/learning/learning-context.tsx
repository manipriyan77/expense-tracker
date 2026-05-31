"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearningTopic {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  created_at: string;
}

export interface LearningSession {
  id: string;
  topic_id: string | null;
  topic_name: string;
  date: string;
  duration_minutes: number | null;
  notes: string | null;
  resource: string | null;
  created_at: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LearningContextValue {
  topics: LearningTopic[];
  sessions: LearningSession[];
  loadingTopics: boolean;
  loadingSessions: boolean;
  fetchTopics: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  addTopic: (data: Omit<LearningTopic, "id" | "created_at">) => Promise<LearningTopic | null>;
  updateTopic: (id: string, data: Partial<Omit<LearningTopic, "id" | "created_at">>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  addSession: (data: Omit<LearningSession, "id" | "created_at">) => Promise<LearningSession | null>;
  deleteSession: (id: string) => Promise<void>;
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error("useLearning must be used within LearningProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LearningProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const supabase = createClient();

  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchTopics = useCallback(async () => {
    if (!user) return;
    setLoadingTopics(true);
    const { data } = await supabase
      .from("learning_topics")
      .select("*")
      .order("name");
    setTopics(data ?? []);
    setLoadingTopics(false);
  }, [user]);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);
    const { data } = await supabase
      .from("learning_sessions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setSessions(data ?? []);
    setLoadingSessions(false);
  }, [user]);

  useEffect(() => {
    fetchTopics();
    fetchSessions();
  }, [fetchTopics, fetchSessions]);

  const addTopic = useCallback(async (data: Omit<LearningTopic, "id" | "created_at">) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from("learning_topics")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error || !row) return null;
    setTopics((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }, [user]);

  const updateTopic = useCallback(async (id: string, data: Partial<Omit<LearningTopic, "id" | "created_at">>) => {
    await supabase.from("learning_topics").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }, []);

  const deleteTopic = useCallback(async (id: string) => {
    await supabase.from("learning_topics").delete().eq("id", id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addSession = useCallback(async (data: Omit<LearningSession, "id" | "created_at">) => {
    if (!user) return null;
    const { data: row, error } = await supabase
      .from("learning_sessions")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();
    if (error || !row) return null;
    setSessions((prev) => [row, ...prev]);
    return row;
  }, [user]);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from("learning_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <LearningContext.Provider value={{
      topics, sessions, loadingTopics, loadingSessions,
      fetchTopics, fetchSessions,
      addTopic, updateTopic, deleteTopic,
      addSession, deleteSession,
    }}>
      {children}
    </LearningContext.Provider>
  );
}
