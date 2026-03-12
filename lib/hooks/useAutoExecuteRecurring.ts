"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

/**
 * Runs once per session after login to auto-create any overdue recurring transactions.
 */
export function useAutoExecuteRecurring() {
  const { user } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    fetch("/api/recurring-patterns/auto-execute", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.created > 0) {
          toast.success(
            `Auto-created ${data.created} recurring transaction${data.created > 1 ? "s" : ""}`,
            { description: data.patterns.map((p: { name: string }) => p.name).join(", ") }
          );
        }
      })
      .catch(() => {
        // silently fail — non-critical background task
      });
  }, [user]);
}
