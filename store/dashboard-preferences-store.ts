import { create } from "zustand";

export interface WidgetConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

export const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: "financial-health", label: "Financial Health Score", defaultVisible: true },
  { id: "spending-summary", label: "Monthly Spending", defaultVisible: true },
  { id: "net-worth-chart", label: "Net Worth Chart", defaultVisible: true },
  { id: "investments", label: "Investments Overview", defaultVisible: true },
  { id: "goal-etas", label: "Goal ETAs", defaultVisible: true },
  { id: "recent-transactions", label: "Recent Transactions", defaultVisible: true },
];

const DEFAULT_ORDER = WIDGET_REGISTRY.map((w) => w.id);
const STORAGE_KEY = "dashboard-preferences";

interface DashboardPreferencesState {
  widgetOrder: string[];
  hiddenWidgets: string[];
  toggleWidget: (id: string) => void;
  moveWidget: (id: string, direction: "up" | "down") => void;
  resetToDefault: () => void;
  hydrateFromStorage: () => void;
  isVisible: (id: string) => boolean;
}

function persist(state: { widgetOrder: string[]; hiddenWidgets: string[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>((set, get) => ({
  widgetOrder: DEFAULT_ORDER,
  hiddenWidgets: [],

  isVisible: (id: string) => !get().hiddenWidgets.includes(id),

  toggleWidget: (id: string) => {
    const { hiddenWidgets, widgetOrder } = get();
    const next = hiddenWidgets.includes(id)
      ? hiddenWidgets.filter((w) => w !== id)
      : [...hiddenWidgets, id];
    set({ hiddenWidgets: next });
    persist({ widgetOrder, hiddenWidgets: next });
  },

  moveWidget: (id: string, direction: "up" | "down") => {
    const { widgetOrder, hiddenWidgets } = get();
    const idx = widgetOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...widgetOrder];
    if (direction === "up" && idx > 0) {
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    } else if (direction === "down" && idx < newOrder.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    }
    set({ widgetOrder: newOrder });
    persist({ widgetOrder: newOrder, hiddenWidgets });
  },

  resetToDefault: () => {
    const state = { widgetOrder: DEFAULT_ORDER, hiddenWidgets: [] };
    set(state);
    persist(state);
  },

  hydrateFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          widgetOrder: parsed.widgetOrder ?? DEFAULT_ORDER,
          hiddenWidgets: parsed.hiddenWidgets ?? [],
        });
      }
    } catch {}
  },
}));
