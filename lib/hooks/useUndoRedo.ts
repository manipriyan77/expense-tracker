"use client";

import { useState, useCallback } from "react";

interface Action<T> {
  type: string;
  data: T;
  undo: () => void;
  redo: () => void;
}

export function useUndoRedo<T>(maxHistorySize = 50) {
  const [history, setHistory] = useState<Action<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  const addAction = useCallback(
    (action: Action<T>) => {
      // Remove any actions after current index
      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(action);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
      } else {
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
      }
    },
    [history, currentIndex, maxHistorySize]
  );

  const undo = useCallback(() => {
    if (canUndo) {
      const action = history[currentIndex];
      action.undo();
      setCurrentIndex(currentIndex - 1);
    }
  }, [canUndo, history, currentIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      const action = history[currentIndex + 1];
      action.redo();
      setCurrentIndex(currentIndex + 1);
    }
  }, [canRedo, history, currentIndex]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    addAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    history,
  };
}
