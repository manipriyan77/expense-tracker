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

export function useKeyboardShortcut(config: ShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

      const isMatch =
        key.toLowerCase() === config.key.toLowerCase() &&
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
      for (const config of shortcuts) {
        const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

        const isMatch =
          key.toLowerCase() === config.key.toLowerCase() &&
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
