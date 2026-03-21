"use client";

import { useEffect } from "react";

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

/** KeyboardEvent.key can be missing with IME, some mobile/WebView quirks, or non-standard events. */
function safeKeyLower(e: KeyboardEvent): string | null {
  const k = e.key;
  if (k == null || typeof k !== "string") return null;
  const t = k.trim();
  if (t === "") return null;
  return t.toLowerCase();
}

function configKeyLower(config: ShortcutConfig): string | null {
  const k = config.key;
  if (k == null || typeof k !== "string") return null;
  return k.toLowerCase();
}

export function useKeyboardShortcut(config: ShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const eventKey = safeKeyLower(event);
      const wantedKey = configKeyLower(config);
      if (eventKey == null || wantedKey == null) return;

      const { ctrlKey, shiftKey, altKey, metaKey } = event;

      const isMatch =
        eventKey === wantedKey &&
        (config.ctrlKey === undefined || ctrlKey === config.ctrlKey) &&
        (config.shiftKey === undefined || shiftKey === config.shiftKey) &&
        (config.altKey === undefined || altKey === config.altKey) &&
        (config.metaKey === undefined || metaKey === config.metaKey);

      if (isMatch) {
        event.preventDefault();
        config.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config]);
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const eventKey = safeKeyLower(event);
      if (eventKey == null) return;

      const { ctrlKey, shiftKey, altKey, metaKey } = event;

      for (const config of shortcuts) {
        const wantedKey = configKeyLower(config);
        if (wantedKey == null) continue;

        const isMatch =
          eventKey === wantedKey &&
          (config.ctrlKey === undefined || ctrlKey === config.ctrlKey) &&
          (config.shiftKey === undefined || shiftKey === config.shiftKey) &&
          (config.altKey === undefined || altKey === config.altKey) &&
          (config.metaKey === undefined || metaKey === config.metaKey);

        if (isMatch) {
          event.preventDefault();
          config.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Global shortcuts configuration
export const GLOBAL_SHORTCUTS = {
  ADD_TRANSACTION: { key: "n", ctrlKey: true, description: "Add new transaction" },
  SEARCH: { key: "k", ctrlKey: true, description: "Search transactions" },
  DASHBOARD: { key: "d", ctrlKey: true, description: "Go to dashboard" },
  ANALYTICS: { key: "a", ctrlKey: true, description: "Go to analytics" },
  BUDGETS: { key: "b", ctrlKey: true, description: "Go to budgets" },
  GOALS: { key: "g", ctrlKey: true, description: "Go to goals" },
  SETTINGS: { key: ",", ctrlKey: true, description: "Open settings" },
  HELP: { key: "?", shiftKey: true, description: "Show keyboard shortcuts" },
  UNDO: { key: "z", ctrlKey: true, description: "Undo last action" },
  REDO: { key: "z", ctrlKey: true, shiftKey: true, description: "Redo last action" },
} as const;
