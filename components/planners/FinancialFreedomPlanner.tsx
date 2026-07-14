"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Flag,
  TrendingUp,
  Wallet,
  RefreshCw,
  RotateCcw,
  Info,
  Target,
  CalendarClock,
  PiggyBank,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  useFinancialFreedomStore,
  DEFAULT_FI_CONFIG,
} from "@/store/financial-freedom-store";
import {
  projectFI,
  requiredStartingSIP,
  type FIInputs,
} from "@/lib/utils/financial-freedom";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useTransactionsStore } from "@/store/transactions-store";

// ─── heatmap helper: red (0%) → amber (~50%) → green (100%+) ─────────────────
function fiCellStyle(pct: number): React.CSSProperties {
  const p = Math.max(0, Math.min(pct, 120)) / 100; // 0..1.2
  const hue = Math.min(p, 1) * 130; // 0=red → 130=green
  const alpha = 0.1 + Math.min(p, 1) * 0.28;
  return { backgroundColor: `hsla(${hue}, 70%, 45%, ${alpha})` };
}

// ─── labeled numeric input ───────────────────────────────────────────────────
function NumField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-9 pr-9"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function FinancialFreedomPlanner() {
  const { format, formatCompact } = useFormatCurrency();
  const { config, setConfig, resetConfig, hydrateFromStorage } =
    useFinancialFreedomStore();
  const { snapshots, fetchSnapshots } = useNetWorthStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const set = (patch: Partial<FIInputs>) => setConfig(patch);

  const projection = useMemo(() => projectFI(config), [config]);
  const { rows, fiAge, yearsToFI, fiRow, swrPct } = projection;

  const currentRow = rows[0];
  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        age: r.age,
        target: Math.round(r.fiTarget),
        corpus: Math.round(r.corpus),
      })),
    [rows],
  );

  // ── Sync starting corpus + monthly expense from the user's real data ──
  const syncFromData = async () => {
    setSyncing(true);
    try {
      await Promise.all([fetchSnapshots(), fetchTransactions()]);
      const s = useNetWorthStore.getState().snapshots;
      const txns = useTransactionsStore.getState().transactions;

      const latestNetWorth = s.length ? s[s.length - 1].net_worth : undefined;

      // Average monthly expense over the trailing 3 calendar months.
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const recentExpenses = txns.filter(
        (t) => t.type === "expense" && new Date(t.date) >= cutoff,
      );
      const totalExpense = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
      const monthsSpan = 3;
      const avgMonthly = totalExpense / monthsSpan;

      const patch: Partial<FIInputs> = {};
      if (typeof latestNetWorth === "number" && latestNetWorth > 0) {
        patch.startingCorpus = Math.round(latestNetWorth);
      }
      if (avgMonthly > 0) {
        patch.monthlyExpense = Math.round(avgMonthly);
      }

      if (Object.keys(patch).length === 0) {
        toast.info("No net-worth snapshots or recent expenses found to sync.");
      } else {
        set(patch);
        toast.success("Synced from your finances.");
      }
    } catch {
      toast.error("Couldn't sync from your data.");
    } finally {
      setSyncing(false);
    }
  };

  // ── "Starting SIP required" matrix: expense × timeframe → SIP needed ──
  const MATRIX_YEARS = [15, 20, 25, 30, 35];
  const EXPENSE_LADDER = [20000, 30000, 40000, 50000, 75000, 100000];

  const matrix = useMemo(() => {
    const opts = {
      inflationPct: config.inflationPct,
      returnPct: config.returnPct,
      fiMultiplier: config.fiMultiplier,
      stepUpPct: config.stepUpPct,
    };
    // Include the user's own expense as a row if it's not already close to one.
    const expenses = EXPENSE_LADDER.some(
      (e) => Math.abs(e - config.monthlyExpense) < 2500,
    )
      ? EXPENSE_LADDER
      : [...EXPENSE_LADDER, config.monthlyExpense].sort((a, b) => a - b);

    return expenses.map((expense) => ({
      expense,
      cells: MATRIX_YEARS.map((years) => ({
        years,
        sip: requiredStartingSIP(expense, years, opts),
      })),
    }));
  }, [config.inflationPct, config.returnPct, config.fiMultiplier, config.stepUpPct, config.monthlyExpense]);

  // Which cell matches the user's situation (nearest expense row + FI timeframe)?
  const highlightExpense = useMemo(
    () =>
      matrix.reduce((best, r) =>
        Math.abs(r.expense - config.monthlyExpense) <
        Math.abs(best.expense - config.monthlyExpense)
          ? r
          : best,
      ).expense,
    [matrix, config.monthlyExpense],
  );
  const highlightYears =
    yearsToFI === null
      ? null
      : MATRIX_YEARS.reduce((best, y) =>
          Math.abs(y - yearsToFI) < Math.abs(best - yearsToFI) ? y : best,
        );

  const paramStrip = [
    `${formatCompact(config.startingSIP)} SIP`,
    `${config.stepUpPct}% step-up`,
    `${formatCompact(config.monthlyExpense)} expense today`,
    `${config.inflationPct}% inflation`,
    `${config.returnPct}% return`,
    `${config.fiMultiplier}× FI`,
  ].join("  ·  ");

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Your FI target rises with inflation. When does your corpus catch it?
        </p>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={syncFromData}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync from my finances</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConfig}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Headline verdict ─────────────────────────────────────────── */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-6">
            {fiAge !== null && fiRow ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      You reach financial freedom at
                    </p>
                    <p className="text-3xl font-bold text-foreground leading-tight">
                      Age {fiAge}
                      <span className="text-base font-medium text-muted-foreground ml-2">
                        in {yearsToFI} {yearsToFI === 1 ? "year" : "years"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8 sm:ml-auto">
                  <Metric
                    label="Corpus at FI"
                    value={formatCompact(fiRow.corpus)}
                  />
                  <Metric
                    label="FI number then"
                    value={formatCompact(fiRow.fiTarget)}
                  />
                  <Metric
                    label="Safe monthly draw"
                    value={format(fiRow.corpus * (swrPct / 100) / 12, {
                      decimalPlaces: 0,
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Info className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    The corpus doesn&apos;t catch the FI target by age{" "}
                    {config.endAge}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try a higher SIP or step-up, a longer horizon, or a lower FI
                    multiplier.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Today snapshot cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Target}
            label="FI number today"
            value={formatCompact(currentRow.fiTarget)}
            sub={`${config.fiMultiplier}× annual expenses`}
          />
          <StatCard
            icon={Wallet}
            label="Current corpus"
            value={formatCompact(config.startingCorpus)}
            sub={`${currentRow.pctOfFI.toFixed(1)}% of FI`}
          />
          <StatCard
            icon={PiggyBank}
            label="Monthly SIP"
            value={formatCompact(config.startingSIP)}
            sub={`+${config.stepUpPct}% a year`}
          />
          <StatCard
            icon={CalendarClock}
            label="Safe withdrawal"
            value={`${swrPct.toFixed(1)}%`}
            sub={`${config.fiMultiplier}× rule`}
          />
        </div>

        {/* ── Inputs ───────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="py-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <NumField
                label="Current age"
                value={config.currentAge}
                onChange={(v) => set({ currentAge: v })}
              />
              <NumField
                label="Project until age"
                value={config.endAge}
                onChange={(v) => set({ endAge: v })}
              />
              <NumField
                label="Monthly expense today"
                value={config.monthlyExpense}
                onChange={(v) => set({ monthlyExpense: v })}
                step={1000}
                suffix="₹"
              />
              <NumField
                label="FI multiplier"
                value={config.fiMultiplier}
                onChange={(v) => set({ fiMultiplier: v })}
                suffix="×"
              />
              <NumField
                label="Current corpus"
                value={config.startingCorpus}
                onChange={(v) => set({ startingCorpus: v })}
                step={10000}
                suffix="₹"
              />
              <NumField
                label="Monthly SIP"
                value={config.startingSIP}
                onChange={(v) => set({ startingSIP: v })}
                step={1000}
                suffix="₹"
              />
              <NumField
                label="SIP step-up"
                value={config.stepUpPct}
                onChange={(v) => set({ stepUpPct: v })}
                suffix="%"
              />
              <NumField
                label="Expected return"
                value={config.returnPct}
                onChange={(v) => set({ returnPct: v })}
                suffix="%"
              />
              <NumField
                label="Inflation"
                value={config.inflationPct}
                onChange={(v) => set({ inflationPct: v })}
                suffix="%"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── The chase chart ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                The chase: corpus vs. running FI target
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 tabular-nums">
              {paramStrip}
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fiCorpus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      format(Number(v) || 0, { decimalPlaces: 0 }),
                      name === "target" ? "FI target" : "Corpus",
                    ]}
                    labelFormatter={(l) => `Age ${l}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="corpus"
                    stroke="hsl(142 71% 40%)"
                    strokeWidth={2.5}
                    fill="url(#fiCorpus)"
                    name="corpus"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="hsl(0 72% 55%)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    name="target"
                  />
                  {fiAge !== null && (
                    <ReferenceLine
                      x={fiAge}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="2 2"
                      label={{ value: `FI · ${fiAge}`, fontSize: 11, fill: "hsl(var(--primary))", position: "top" }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Year-by-year table ───────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="text-left font-semibold px-3 py-2.5">Age</th>
                    <th className="text-right font-semibold px-3 py-2.5">Monthly exp</th>
                    <th className="text-right font-semibold px-3 py-2.5">FI target</th>
                    <th className="text-right font-semibold px-3 py-2.5">Corpus</th>
                    <th className="text-right font-semibold px-3 py-2.5">SIP / month</th>
                    <th className="text-right font-semibold px-3 py-2.5">% of FI</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isFI = fiAge !== null && r.age === fiAge;
                    return (
                      <tr
                        key={r.age}
                        className={`border-b border-border/50 last:border-0 tabular-nums ${
                          isFI ? "bg-primary/10 font-semibold" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-left font-medium">
                          {r.age}
                          {isFI && (
                            <Flag className="inline h-3.5 w-3.5 ml-1.5 text-primary -translate-y-px" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatCompact(r.monthlyExpense)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCompact(r.fiTarget)}
                        </td>
                        <td
                          className="px-3 py-2 text-right"
                          style={r.reached ? fiCellStyle(100) : undefined}
                        >
                          {formatCompact(r.corpus)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatCompact(r.sipPerMonth)}
                        </td>
                        <td
                          className="px-3 py-2 text-right font-medium"
                          style={fiCellStyle(r.pctOfFI)}
                        >
                          {r.pctOfFI.toFixed(0)}%
                          {r.reached && " ✓"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Starting SIP required matrix ─────────────────────────────── */}
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Starting SIP required to be financially free
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Find your expense row, pick a timeframe. Assumes {config.stepUpPct}%
              step-up · {config.returnPct}% return · {config.inflationPct}%
              inflation · {config.fiMultiplier}× FI.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[520px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-semibold px-3 py-2.5">
                      Expense / mo
                    </th>
                    {MATRIX_YEARS.map((y) => (
                      <th
                        key={y}
                        className={`text-right font-semibold px-3 py-2.5 ${
                          y === highlightYears ? "text-primary" : ""
                        }`}
                      >
                        Free in {y} yrs
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => {
                    const isUserRow = row.expense === highlightExpense;
                    return (
                      <tr
                        key={row.expense}
                        className="border-t border-border/50 tabular-nums"
                      >
                        <td
                          className={`px-3 py-2.5 text-left font-semibold ${
                            isUserRow ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {formatCompact(row.expense)}
                        </td>
                        {row.cells.map((c) => {
                          const isTarget =
                            isUserRow && c.years === highlightYears;
                          return (
                            <td
                              key={c.years}
                              className={`px-3 py-2.5 text-right ${
                                isTarget
                                  ? "bg-primary/15 font-bold text-foreground rounded"
                                  : ""
                              }`}
                            >
                              {formatCompact(c.sip)}
                              {isTarget && (
                                <span className="ml-1.5 text-[10px] font-semibold text-primary uppercase">
                                  you
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground leading-relaxed">
          The <strong>{config.fiMultiplier}× rule</strong> assumes a{" "}
          {swrPct.toFixed(1)}% safe withdrawal rate — your FI number is{" "}
          {config.fiMultiplier} years of annual expenses. Expenses are inflated
          at {config.inflationPct}% a year, so the target keeps moving. This is a
          projection, not financial advice.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
          <Icon className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
