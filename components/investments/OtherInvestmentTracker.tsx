"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Trash2, Plus } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useOtherInvestmentsStore,
  type OtherInvestment,
} from "@/store/other-investments-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface Props {
  investment: OtherInvestment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const currentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (isoMonth: string) => {
  const d = new Date(isoMonth);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

export function OtherInvestmentTracker({ investment, open, onOpenChange }: Props) {
  const { format } = useFormatCurrency();
  const { snapshots, fetchSnapshots, recordValue, deleteSnapshot } =
    useOtherInvestmentsStore();

  const [month, setMonth] = useState(currentMonthValue());
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMonth(currentMonthValue());
    setValue("");
    fetchSnapshots().finally(() => setLoadedOnce(true));
  }, [open, fetchSnapshots]);

  const rows = useMemo(() => {
    if (!investment) return [];
    return snapshots
      .filter((s) => s.investmentId === investment.id)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((s) => ({ ...s, label: monthLabel(s.month) }));
  }, [snapshots, investment]);

  const stats = useMemo(() => {
    if (rows.length === 0 || !investment) return null;
    const first = rows[0].currentValue;
    const last = rows[rows.length - 1].currentValue;
    const growth = last - first;
    const growthPct = first > 0 ? (growth / first) * 100 : 0;
    const gain = last - investment.investedAmount;
    return { first, last, growth, growthPct, gain };
  }, [rows, investment]);

  const handleRecord = async () => {
    if (!investment) return;
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Enter a valid value.");
      return;
    }
    setSaving(true);
    try {
      await recordValue(investment.id, month, num);
      toast.success(`Recorded ${monthLabel(`${month}-01`)} value.`);
      setValue("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSnapshot(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {investment?.name ?? "Value tracker"}
          </DialogTitle>
          <DialogDescription>
            Record this investment&apos;s value each month to build a history and
            see how it grows.
          </DialogDescription>
        </DialogHeader>

        {/* Record a new month's value */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg border p-3 bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Month</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Value on that date</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRecord();
              }}
            />
          </div>
          <Button onClick={handleRecord} disabled={saving} className="h-9 gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Record
          </Button>
        </div>

        {/* Growth summary */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Latest value" value={format(stats.last)} />
            <StatTile
              label="Growth tracked"
              value={`${stats.growth >= 0 ? "+" : ""}${format(stats.growth)}`}
              accent={stats.growth >= 0 ? "up" : "down"}
              sub={`${stats.growthPct >= 0 ? "+" : ""}${stats.growthPct.toFixed(1)}%`}
            />
            <StatTile
              label="Gain vs invested"
              value={`${stats.gain >= 0 ? "+" : ""}${format(stats.gain)}`}
              accent={stats.gain >= 0 ? "up" : "down"}
            />
          </div>
        )}

        {/* Chart */}
        {rows.length >= 2 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="oiGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => format(v as number)}
                />
                <Tooltip
                  formatter={(v) => [format(Number(v) || 0), "Value"]}
                  labelFormatter={(l) => `Month: ${l}`}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="currentValue"
                  stroke="hsl(262 83% 58%)"
                  strokeWidth={2.5}
                  fill="url(#oiGrowth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : loadedOnce ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            {rows.length === 1
              ? "One month recorded. Add next month's value to see the trend."
              : "No history yet. Record this month's value to start tracking."}
          </p>
        ) : (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {/* History table */}
        {rows.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <div>Month</div>
              <div className="text-right">Value</div>
              <div className="w-8" />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {[...rows].reverse().map((r, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? r.currentValue - prev.currentValue : 0;
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2 text-sm items-center border-b border-border/50 last:border-0"
                  >
                    <div className="font-medium">{r.label}</div>
                    <div className="text-right font-mono tabular-nums">
                      {format(r.currentValue)}
                      {prev && (
                        <span className={`ml-2 text-[10px] ${delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {delta >= 0 ? "▲" : "▼"} {format(Math.abs(delta))}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-muted-foreground hover:text-red-500 justify-self-end"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down";
}) {
  const color =
    accent === "up"
      ? "text-green-600 dark:text-green-400"
      : accent === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-mono text-sm font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className={`text-[10px] font-mono ${color}`}>{sub}</p>}
    </div>
  );
}
