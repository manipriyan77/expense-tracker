"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, TrendingUp, CandlestickChart, Coins, Landmark } from "lucide-react";
import {
  useGoalsStore,
  type HoldingOption,
} from "@/store/goals-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const TYPE_META: Record<
  HoldingOption["type"],
  { label: string; icon: typeof TrendingUp }
> = {
  mutual_fund: { label: "Mutual Funds", icon: TrendingUp },
  stock: { label: "Stocks", icon: CandlestickChart },
  gold: { label: "Gold", icon: Coins },
  silver: { label: "Silver", icon: Coins },
  other: { label: "Other Investments", icon: Landmark },
};

const TYPE_ORDER: HoldingOption["type"][] = ["mutual_fund", "stock", "gold", "silver", "other"];

const keyOf = (h: { type: string; id: string }) => `${h.type}:${h.id}`;

interface Props {
  goalId: string | null;
  goalTitle: string;
  /** Goal tracking unit — grams goals only link gold/silver, shown by weight. */
  unit?: "amount" | "grams";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METAL_TYPES = new Set<HoldingOption["type"]>(["gold", "silver"]);

export function LinkInvestmentsDialog({ goalId, goalTitle, unit = "amount", open, onOpenChange }: Props) {
  const { format } = useFormatCurrency();
  const isGrams = unit === "grams";
  const fmtHolding = (h: HoldingOption) =>
    isGrams
      ? `${(h.grams ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} g`
      : format(h.currentValue);
  const { fetchHoldings, setGoalLinks, goals } = useGoalsStore();

  const [holdings, setHoldings] = useState<HoldingOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const goalTitleById = useMemo(
    () => new Map(goals.map((g) => [g.id, g.title])),
    [goals],
  );

  useEffect(() => {
    if (!open || !goalId) return;
    let cancelled = false;
    setLoading(true);
    fetchHoldings()
      .then((all) => {
        if (cancelled) return;
        // Grams goals can only be backed by gold/silver holdings.
        const data = isGrams ? all.filter((h) => METAL_TYPES.has(h.type)) : all;
        setHoldings(data);
        setSelected(
          new Set(
            data.filter((h) => h.linkedGoalId === goalId).map((h) => keyOf(h)),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your investments.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, goalId, fetchHoldings]);

  const grouped = useMemo(() => {
    const map = new Map<HoldingOption["type"], HoldingOption[]>();
    for (const h of holdings) {
      const arr = map.get(h.type) ?? [];
      arr.push(h);
      map.set(h.type, arr);
    }
    return map;
  }, [holdings]);

  const toggle = (h: HoldingOption) => {
    const k = keyOf(h);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectedTotal = useMemo(
    () =>
      holdings
        .filter((h) => selected.has(keyOf(h)))
        .reduce((sum, h) => sum + (isGrams ? h.grams ?? 0 : h.currentValue), 0),
    [holdings, selected, isGrams],
  );

  const handleSave = async () => {
    if (!goalId) return;
    setSaving(true);
    try {
      const selections = holdings
        .filter((h) => selected.has(keyOf(h)))
        .map((h) => ({ type: h.type, id: h.id }));
      await setGoalLinks(goalId, selections);
      toast.success(
        selections.length > 0
          ? `Linked ${selections.length} investment${selections.length === 1 ? "" : "s"} to "${goalTitle}".`
          : `Cleared linked investments for "${goalTitle}".`,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save links.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link investments to {goalTitle}</DialogTitle>
          <DialogDescription>
            Pick the holdings that fund this goal. Its progress will track their
            live value automatically — no manual updates needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {isGrams
                ? "No gold or silver holdings found. Add some to track this goal by weight."
                : "No investments found. Add mutual funds, stocks, gold or other investments first."}
            </p>
          ) : (
            <div className="space-y-4">
              {TYPE_ORDER.filter((t) => grouped.has(t)).map((type) => {
                const Icon = TYPE_META[type].icon;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {TYPE_META[type].label}
                    </div>
                    <div className="space-y-1">
                      {grouped.get(type)!.map((h) => {
                        const k = keyOf(h);
                        const isChecked = selected.has(k);
                        const linkedElsewhere =
                          h.linkedGoalId != null && h.linkedGoalId !== goalId;
                        return (
                          <label
                            key={k}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                              linkedElsewhere
                                ? "border-border opacity-60 cursor-not-allowed"
                                : isChecked
                                  ? "border-primary/50 bg-primary/5 cursor-pointer"
                                  : "border-border hover:bg-muted/40 cursor-pointer"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={linkedElsewhere}
                              onCheckedChange={() => {
                                if (!linkedElsewhere) toggle(h);
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{h.name}</p>
                              {linkedElsewhere && (
                                <p className="text-[10px] text-muted-foreground">
                                  Already linked to “{goalTitleById.get(h.linkedGoalId!) ?? "another goal"}”
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
                              {fmtHolding(h)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 sm:justify-between items-center gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Linked total: </span>
            <span className="font-mono font-semibold tabular-nums">
              {isGrams
                ? `${selectedTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })} g`
                : format(selectedTotal)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save links
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
