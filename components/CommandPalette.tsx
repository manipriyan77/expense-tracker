"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Wallet,
  Target,
  BarChart3,
  RefreshCw,
  CreditCard,
  Scale,
  Calendar,
  Settings,
  Search,
  ArrowRight,
  HeartPulse,
  Lightbulb,
  Coins,
  HandCoins,
  CandlestickChart,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTransactionsStore } from "@/store/transactions-store";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  type: "page" | "action" | "transaction";
  action: () => void;
}

const NAV_COMMANDS = (router: ReturnType<typeof useRouter>): Command[] => [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, type: "page", action: () => router.push("/dashboard") },
  { id: "analytics", label: "Analytics", icon: BarChart3, type: "page", action: () => router.push("/analytics") },
  { id: "transactions", label: "Transactions", icon: Receipt, type: "page", action: () => router.push("/transactions") },
  { id: "budgets", label: "Budgets", icon: Wallet, type: "page", action: () => router.push("/budgets") },
  { id: "goals", label: "Goals", icon: Target, type: "page", action: () => router.push("/goals") },
  { id: "health-score", label: "Health Score", icon: HeartPulse, type: "page", action: () => router.push("/health-score") },
  { id: "insights", label: "Insights", icon: Lightbulb, type: "page", action: () => router.push("/insights") },
  { id: "recurring", label: "Recurring", icon: RefreshCw, type: "page", action: () => router.push("/recurring") },
  { id: "investments", label: "Investments", icon: TrendingUp, type: "page", action: () => router.push("/investments") },
  { id: "stocks", label: "Stocks", icon: CandlestickChart, type: "page", action: () => router.push("/stocks") },
  { id: "mutual-funds", label: "Mutual Funds", icon: Coins, type: "page", action: () => router.push("/mutual-funds") },
  { id: "gold", label: "Gold", icon: Coins, type: "page", action: () => router.push("/gold") },
  { id: "net-worth", label: "Net Worth", icon: Scale, type: "page", action: () => router.push("/net-worth") },
  { id: "debt-tracker", label: "Debt Tracker", icon: CreditCard, type: "page", action: () => router.push("/debt-tracker") },
  { id: "cashflow", label: "Cash Flow Planning", icon: HandCoins, type: "page", action: () => router.push("/cashflow-planning") },
  { id: "calendar", label: "Calendar", icon: Calendar, type: "page", action: () => router.push("/calendar") },
  { id: "settings", label: "Settings", icon: Settings, type: "page", action: () => router.push("/settings") },
];

export default function CommandPalette() {
  const { isOpen, close } = useCommandPaletteStore();
  const { transactions } = useTransactionsStore();
  const { format } = useFormatCurrency();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navCommands = NAV_COMMANDS(router);

  const filteredCommands: Command[] = query.trim() === ""
    ? navCommands.slice(0, 8)
    : [
        ...navCommands.filter((c) =>
          c.label.toLowerCase().includes(query.toLowerCase())
        ),
        ...transactions
          .filter(
            (t) =>
              t.description.toLowerCase().includes(query.toLowerCase()) ||
              t.category.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
          .map((t): Command => ({
            id: `tx-${t.id}`,
            label: t.description,
            description: `${t.category} · ${t.date} · ${format(t.amount)}`,
            icon: Receipt,
            type: "transaction",
            action: () => router.push("/transactions"),
          })),
      ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          close();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, filteredCommands, selectedIndex, close]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const groupedCommands = filteredCommands.reduce<Record<string, Command[]>>(
    (acc, cmd) => {
      const group = cmd.type === "transaction" ? "Transactions" : "Pages";
      if (!acc[group]) acc[group] = [];
      acc[group].push(cmd);
      return acc;
    },
    {}
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="p-0 gap-0 max-w-lg overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, transactions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, cmds]) => (
              <div key={group}>
                <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/40">
                  {group}
                </p>
                {cmds.map((cmd) => {
                  const globalIdx = filteredCommands.indexOf(cmd);
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        globalIdx === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => {
                        cmd.action();
                        close();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cmd.label}</p>
                        {cmd.description && (
                          <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                        )}
                      </div>
                      {globalIdx === selectedIndex && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
