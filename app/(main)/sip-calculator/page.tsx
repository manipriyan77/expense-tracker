"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowUpRight,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return fmt(n);
};

// ─── calc ─────────────────────────────────────────────────────────────────────

interface SIPYearRow {
  year: number;
  invested: number;
  value: number;
  gains: number;
}

function calcSIP(monthly: number, annualRate: number, years: number, stepUpPct: number): SIPYearRow[] {
  const rows: SIPYearRow[] = [];
  let totalValue = 0, totalInvested = 0, currentMonthly = monthly;
  const r = annualRate / 12 / 100;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      totalValue = (totalValue + currentMonthly) * (1 + r);
      totalInvested += currentMonthly;
    }
    rows.push({ year: y, invested: Math.round(totalInvested), value: Math.round(totalValue), gains: Math.round(totalValue - totalInvested) });
    currentMonthly *= 1 + stepUpPct / 100;
  }
  return rows;
}

function calcLumpsum(principal: number, annualRate: number, years: number): SIPYearRow[] {
  return Array.from({ length: years }, (_, i) => {
    const y = i + 1;
    const value = principal * Math.pow(1 + annualRate / 100, y);
    return { year: y, invested: principal, value: Math.round(value), gains: Math.round(value - principal) };
  });
}

// Combined: existing lumpsum grows + monthly SIP on top
interface CombinedYearRow extends SIPYearRow {
  lumpsumValue: number;
  sipValue: number;
}

function calcCombined(
  lumpsum: number,
  monthly: number,
  annualRate: number,
  years: number,
  stepUpPct: number,
): CombinedYearRow[] {
  const rows: CombinedYearRow[] = [];
  const r = annualRate / 12 / 100;
  let lumpsumValue = lumpsum;
  let sipValue = 0;
  let totalInvested = lumpsum;
  let currentMonthly = monthly;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      lumpsumValue *= 1 + r;
      sipValue = (sipValue + currentMonthly) * (1 + r);
      if (y > 1 || m > 0) totalInvested += currentMonthly; // first month already counted
    }
    // Invested = lumpsum + all SIP contributions so far
    const sipInvested = currentMonthly > 0 ? monthly * (
      stepUpPct > 0
        ? Array.from({ length: y }, (_, yi) => 12 * Math.pow(1 + stepUpPct / 100, yi)).reduce((a, b) => a + b, 0)
        : y * 12
    ) : 0;
    const invested = lumpsum + sipInvested;
    const value = Math.round(lumpsumValue + sipValue);
    rows.push({
      year: y,
      invested: Math.round(invested),
      value,
      gains: value - Math.round(invested),
      lumpsumValue: Math.round(lumpsumValue),
      sipValue: Math.round(sipValue),
    });
    currentMonthly *= 1 + stepUpPct / 100;
  }
  return rows;
}

interface SWPYearRow {
  year: number;
  withdrawn: number;
  balance: number;
  totalWithdrawn: number;
}

function calcSWP(corpus: number, monthlyWithdrawal: number, annualRate: number, years: number, stepUpPct: number): SWPYearRow[] {
  const rows: SWPYearRow[] = [];
  let balance = corpus, totalWithdrawn = 0, currentWithdrawal = monthlyWithdrawal;
  const r = annualRate / 12 / 100;
  for (let y = 1; y <= years; y++) {
    let yearlyWithdrawn = 0;
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r);
      const w = Math.min(currentWithdrawal, balance);
      balance -= w;
      yearlyWithdrawn += w;
      totalWithdrawn += w;
      if (balance <= 0) break;
    }
    rows.push({ year: y, withdrawn: Math.round(yearlyWithdrawn), balance: Math.round(Math.max(0, balance)), totalWithdrawn: Math.round(totalWithdrawn) });
    if (balance <= 0) break;
    currentWithdrawal *= 1 + stepUpPct / 100;
  }
  return rows;
}

// ─── SliderInput ──────────────────────────────────────────────────────────────

function SliderInput({
  label, value, onChange, min, max, step = 1, prefix, suffix, format, info, accentColor = "#3b82f6",
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number;
  prefix?: string; suffix?: string; format?: (v: number) => string;
  info?: string; accentColor?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const commit = (str: string) => {
    setRaw(null);
    const v = parseFloat(str);
    if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
  };
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium text-foreground/80">{label}</Label>
          {info && <span title={info}><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></span>}
        </div>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-sm font-bold text-muted-foreground">{prefix}</span>}
          <Input
            type="number"
            value={raw ?? value}
            min={min} max={max} step={step}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit((e.target as HTMLInputElement).value); }}
            className="w-28 h-8 text-sm text-right font-bold border-0 bg-muted/60 rounded-lg focus-visible:ring-1"
          />
          {suffix && <span className="text-sm font-semibold text-muted-foreground">{suffix}</span>}
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: accentColor }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all"
          style={{ left: `calc(${pct}% - 8px)`, background: accentColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{prefix}{format ? format(min) : min}{suffix}</span>
        <span>{prefix}{format ? format(max) : max}{suffix}</span>
      </div>
    </div>
  );
}

// ─── SIP Calculator ───────────────────────────────────────────────────────────

function SIPCalculator() {
  const [mode, setMode] = useState<"monthly" | "lumpsum" | "combined">("monthly");
  const [monthly, setMonthly] = useState(10000);
  const [lumpsum, setLumpsum] = useState(500000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo(() => {
    if (mode === "lumpsum") return calcLumpsum(lumpsum, rate, years);
    if (mode === "combined") return calcCombined(lumpsum, monthly, rate, years, stepUp ? stepUpPct : 0);
    return calcSIP(monthly, rate, years, stepUp ? stepUpPct : 0);
  }, [mode, monthly, lumpsum, rate, years, stepUp, stepUpPct]);

  const last = rows[rows.length - 1];
  const totalInvested = last?.invested ?? 0;
  const totalValue = last?.value ?? 0;
  const totalGains = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const multiplier = totalInvested > 0 ? totalValue / totalInvested : 0;
  const investedPct = totalValue > 0 ? (totalInvested / totalValue) * 100 : 50;
  const gainsPct = 100 - investedPct;

  // Combined: lumpsum vs SIP contribution breakdown
  const combinedLast = mode === "combined" ? (rows[rows.length - 1] as CombinedYearRow) : null;
  const lumpsumFinalValue = combinedLast?.lumpsumValue ?? 0;
  const sipFinalValue = combinedLast?.sipValue ?? 0;

  const TOOLTIP_STYLE = {
    backgroundColor: "var(--background, #fff)",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="inline-flex rounded-xl bg-muted p-1 gap-1">
        {([
          { key: "monthly", label: "Monthly SIP" },
          { key: "lumpsum", label: "Lumpsum" },
          { key: "combined", label: "Lumpsum + SIP" },
        ] as const).map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === m.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* Input panel */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30">
            <p className="font-semibold text-sm">Investment Parameters</p>
            <p className="text-xs text-muted-foreground mt-0.5">Adjust sliders or type values directly</p>
          </div>
          <div className="p-5 space-y-6">
            {/* Lumpsum — shown for lumpsum and combined */}
            {(mode === "lumpsum" || mode === "combined") && (
              <SliderInput
                label={mode === "combined" ? "Existing Corpus (Lumpsum)" : "Lumpsum Amount"}
                value={lumpsum} onChange={setLumpsum}
                min={1000} max={100000000} step={10000} prefix="₹"
                format={(v) => fmtShort(v).replace("₹", "")} accentColor="#3b82f6"
                info={mode === "combined" ? "Money you already have invested or available today" : undefined}
              />
            )}

            {/* SIP — shown for monthly and combined */}
            {(mode === "monthly" || mode === "combined") && (
              <SliderInput
                label={mode === "combined" ? "Monthly SIP (additional)" : "Monthly Investment"}
                value={monthly} onChange={setMonthly}
                min={500} max={500000} step={500} prefix="₹"
                format={(v) => fmtShort(v).replace("₹", "")} accentColor={mode === "combined" ? "#8b5cf6" : "#3b82f6"}
                info={mode === "combined" ? "Amount you'll invest additionally every month" : undefined}
              />
            )}

            {/* Combined mode: quick insight */}
            {mode === "combined" && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <p className="font-semibold">How this works</p>
                <p>Your lumpsum of <strong>{fmtShort(lumpsum)}</strong> compounds from day 1.</p>
                <p>Your SIP of <strong>{fmt(monthly)}/mo</strong> is invested on top every month.</p>
                <p>Both grow at <strong>{rate}% p.a.</strong> — total shown is their combined future value.</p>
              </div>
            )}

            <SliderInput label="Expected Return" value={rate} onChange={setRate}
              min={1} max={30} step={0.5} suffix="% p.a." accentColor="#8b5cf6" />
            <SliderInput label="Time Period" value={years} onChange={setYears}
              min={1} max={40} suffix=" yr" accentColor="#06b6d4" />

            {(mode === "monthly" || mode === "combined") && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Annual Step-Up</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Increase SIP amount each year</p>
                  </div>
                  <Switch checked={stepUp} onCheckedChange={setStepUp} />
                </div>
                {stepUp && (
                  <SliderInput label="Step-Up Rate" value={stepUpPct} onChange={setStepUpPct}
                    min={1} max={50} suffix="% /yr" accentColor="#f59e0b"
                    info="SIP amount increases by this % every year" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {/* Hero result card */}
          <div className="rounded-2xl border bg-linear-to-br from-blue-600 to-purple-700 text-white p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-white/70 font-medium">Future Value in {years} yr{years > 1 ? "s" : ""}</p>
                <p className="text-4xl font-bold tracking-tight mt-1">{fmtShort(totalValue)}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-bold">{multiplier.toFixed(2)}x</span>
              </div>
            </div>
            {/* Composition bar */}
            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden flex">
                <div className="h-full bg-white/60 rounded-l-full transition-all duration-700" style={{ width: `${investedPct}%` }} />
                <div className="h-full bg-emerald-300 rounded-r-full transition-all duration-700" style={{ width: `${gainsPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/60 inline-block" />
                  Invested {fmtShort(totalInvested)} ({investedPct.toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
                  Gains {fmtShort(totalGains)} ({gainsPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Stat row */}
          <div className={`grid gap-3 ${mode === "combined" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            {mode === "combined" ? [
              { label: "Total Invested", value: fmtShort(totalInvested), color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900" },
              { label: "Lumpsum grows to", value: fmtShort(lumpsumFinalValue), color: "#06b6d4", bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900" },
              { label: "SIP grows to", value: fmtShort(sipFinalValue), color: "#8b5cf6", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900" },
              { label: "Total Gains", value: fmtShort(totalGains), color: "#22c55e", bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            )) : [
              { label: "Total Invested", value: fmtShort(totalInvested), color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900" },
              { label: "Est. Gains", value: fmtShort(totalGains), color: "#22c55e", bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900" },
              { label: "Absolute Return", value: `${returnPct.toFixed(1)}%`, color: "#8b5cf6", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Combined: stacked composition bar showing lumpsum vs SIP share */}
          {mode === "combined" && totalValue > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Value Composition at Year {years}</p>
              <div className="h-3 rounded-full overflow-hidden flex gap-px">
                <div className="h-full bg-cyan-500 rounded-l-full transition-all duration-700" style={{ width: `${(lumpsumFinalValue / totalValue) * 100}%` }} />
                <div className="h-full bg-purple-500 rounded-r-full transition-all duration-700" style={{ width: `${(sipFinalValue / totalValue) * 100}%` }} />
              </div>
              <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />Lumpsum {((lumpsumFinalValue / totalValue) * 100).toFixed(0)}% → {fmtShort(lumpsumFinalValue)}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />SIP {((sipFinalValue / totalValue) * 100).toFixed(0)}% → {fmtShort(sipFinalValue)}</span>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-semibold mb-4">Wealth Growth Over Time</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sipInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="lumpsumVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="sipOnlyVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => fmtShort(v).replace("₹", "").trim()} tick={{ fontSize: 10 }} stroke="#94a3b8" width={52} />
                <Tooltip contentStyle={TOOLTIP_STYLE} // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string | undefined) => [fmtShort(Number(v)), name ?? ""]} labelFormatter={(l) => `Year ${l}`} />
                <Area type="monotone" dataKey="invested" name="Total Invested" stroke="#3b82f6" strokeWidth={2} fill="url(#sipInvested)" />
                {mode === "combined" && (
                  <Area type="monotone" dataKey="lumpsumValue" name="Lumpsum Growth" stroke="#06b6d4" strokeWidth={2} fill="url(#lumpsumVal)" strokeDasharray="5 3" />
                )}
                {mode === "combined" && (
                  <Area type="monotone" dataKey="sipValue" name="SIP Growth" stroke="#a855f7" strokeWidth={2} fill="url(#sipOnlyVal)" strokeDasharray="5 3" />
                )}
                <Area type="monotone" dataKey="value" name="Total Future Value" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#sipValue)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-5 mt-3">
              {[
                { color: "#3b82f6", label: "Invested" },
                ...(mode === "combined" ? [{ color: "#06b6d4", label: "Lumpsum Growth" }, { color: "#a855f7", label: "SIP Growth" }] : []),
                { color: "#8b5cf6", label: "Total Value" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Summary strip */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {mode === "combined" ? (
                <>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Lumpsum</p>
                    <p className="font-bold text-cyan-600 dark:text-cyan-400">{fmtShort(lumpsum)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Monthly SIP</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">{fmt(monthly)}/mo</p>
                  </div>
                </>
              ) : mode === "monthly" ? (
                <>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Starting SIP</p>
                    <p className="font-bold">{fmt(monthly)}/mo</p>
                  </div>
                  {stepUp && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Final SIP (Y{years})</p>
                      <p className="font-bold">{fmt(Math.round(monthly * Math.pow(1 + stepUpPct / 100, years - 1)))}/mo</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Principal</p>
                  <p className="font-bold">{fmt(lumpsum)}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Return Rate</p>
                <p className="font-bold">{rate}% p.a.</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                <p className="font-bold">{years} years</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Multiplier</p>
                <p className="font-bold text-purple-600 dark:text-purple-400">{multiplier.toFixed(2)}x</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 border-b hover:bg-muted/30 transition-colors"
          onClick={() => setShowTable((s) => !s)}
        >
          <p className="text-sm font-semibold">Year-by-Year Breakdown</p>
          {showTable ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-right">Invested</th>
                  {mode === "combined" && <th className="px-4 py-3 text-right text-cyan-600">Lumpsum Value</th>}
                  {mode === "combined" && <th className="px-4 py-3 text-right text-purple-600">SIP Value</th>}
                  <th className="px-4 py-3 text-right">Gains</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-right">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const ret = r.invested > 0 ? (r.gains / r.invested) * 100 : 0;
                  const cr = r as CombinedYearRow;
                  return (
                    <tr key={r.year} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-semibold">Y{r.year}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtShort(r.invested)}</td>
                      {mode === "combined" && <td className="px-4 py-2.5 text-right text-cyan-600 dark:text-cyan-400 font-medium">{fmtShort(cr.lumpsumValue ?? 0)}</td>}
                      {mode === "combined" && <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400 font-medium">{fmtShort(cr.sipValue ?? 0)}</td>}
                      <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{fmtShort(r.gains)}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{fmtShort(r.value)}</td>
                      <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400 font-semibold">{ret.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SWP Calculator ───────────────────────────────────────────────────────────

function SWPCalculator() {
  const [corpus, setCorpus] = useState(1000000);
  const [withdrawal, setWithdrawal] = useState(10000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(20);
  const [stepUp, setStepUp] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(5);
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo(() => calcSWP(corpus, withdrawal, rate, years, stepUp ? stepUpPct : 0), [corpus, withdrawal, rate, years, stepUp, stepUpPct]);

  const lastRow = rows[rows.length - 1];
  const totalWithdrawn = lastRow?.totalWithdrawn ?? 0;
  const finalBalance = lastRow?.balance ?? 0;
  const corpusExhausted = finalBalance === 0;
  const exhaustedYear = corpusExhausted ? rows.find((r) => r.balance === 0)?.year : null;
  const sustainPct = corpus > 0 ? Math.min(100, (finalBalance / corpus) * 100) : 0;

  const TOOLTIP_STYLE = {
    backgroundColor: "var(--background, #fff)",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* Input panel */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30">
            <p className="font-semibold text-sm">Withdrawal Parameters</p>
            <p className="text-xs text-muted-foreground mt-0.5">Configure your withdrawal plan</p>
          </div>
          <div className="p-5 space-y-6">
            <SliderInput label="Initial Corpus" value={corpus} onChange={setCorpus}
              min={100000} max={500000000} step={100000} prefix="₹"
              format={(v) => fmtShort(v).replace("₹", "")} accentColor="#8b5cf6" />
            <SliderInput label="Monthly Withdrawal" value={withdrawal} onChange={setWithdrawal}
              min={1000} max={500000} step={1000} prefix="₹"
              format={(v) => fmtShort(v).replace("₹", "")} accentColor="#3b82f6" />
            <SliderInput label="Expected Return" value={rate} onChange={setRate}
              min={1} max={20} step={0.5} suffix="% p.a." accentColor="#06b6d4" />
            <SliderInput label="Withdrawal Period" value={years} onChange={setYears}
              min={1} max={40} suffix=" yr" accentColor="#f59e0b" />
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Annual Step-Up</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Increase withdrawal each year</p>
                </div>
                <Switch checked={stepUp} onCheckedChange={setStepUp} />
              </div>
              {stepUp && (
                <SliderInput label="Step-Up Rate" value={stepUpPct} onChange={setStepUpPct}
                  min={1} max={30} suffix="% /yr" accentColor="#f59e0b"
                  info="Withdrawal amount increases by this % every year" />
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Hero result */}
          <div className={`rounded-2xl border p-5 shadow-sm text-white ${corpusExhausted ? "bg-linear-to-br from-red-500 to-orange-600" : "bg-linear-to-br from-emerald-500 to-teal-600"}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-white/70 font-medium">
                  {corpusExhausted ? `Corpus exhausted in Year ${exhaustedYear}` : `Sustains all ${years} years`}
                </p>
                <p className="text-4xl font-bold tracking-tight mt-1">{fmtShort(finalBalance)}</p>
                <p className="text-sm text-white/70 mt-0.5">final balance</p>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${corpusExhausted ? "bg-white/20" : "bg-white/20"}`}>
                {corpusExhausted ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                <span className="text-sm font-bold">{corpusExhausted ? "Depleted" : "Sustainable"}</span>
              </div>
            </div>
            {/* Sustain bar */}
            {!corpusExhausted && (
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full transition-all duration-700" style={{ width: `${sustainPct}%` }} />
                </div>
                <p className="text-xs text-white/70">{sustainPct.toFixed(0)}% of corpus preserved after {years} years</p>
              </div>
            )}
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Initial Corpus", value: fmtShort(corpus), color: "#8b5cf6", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900" },
              { label: "Total Withdrawn", value: fmtShort(totalWithdrawn), color: "#22c55e", bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900" },
              { label: "Monthly Draw", value: `${fmt(withdrawal)}/mo`, color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-semibold mb-4">Balance & Withdrawals Over Time</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="swpBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="swpWithdrawn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => fmtShort(v).replace("₹", "").trim()} tick={{ fontSize: 10 }} stroke="#94a3b8" width={50} />
                <Tooltip contentStyle={TOOLTIP_STYLE} // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string | undefined) => [fmtShort(Number(v)), name ?? ""]} labelFormatter={(l) => `Year ${l}`} />
                <Area type="monotone" dataKey="totalWithdrawn" name="Total Withdrawn" stroke="#22c55e" strokeWidth={2} fill="url(#swpWithdrawn)" />
                <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke="#8b5cf6" strokeWidth={2} fill="url(#swpBalance)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-3">
              {[{ color: "#22c55e", label: "Total Withdrawn" }, { color: "#8b5cf6", label: "Remaining Balance" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Year table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 border-b hover:bg-muted/30 transition-colors"
          onClick={() => setShowTable((s) => !s)}
        >
          <p className="text-sm font-semibold">Year-by-Year Breakdown</p>
          {showTable ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Year</th>
                  <th className="px-5 py-3 text-right">Withdrawn (yr)</th>
                  <th className="px-5 py-3 text-right">Total Withdrawn</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.year} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-semibold">Year {r.year}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{fmtShort(r.withdrawn)}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{fmtShort(r.totalWithdrawn)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${r.balance === 0 ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"}`}>
                      {r.balance === 0 ? "Exhausted" : fmtShort(r.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goal Planner ─────────────────────────────────────────────────────────────

interface GoalYearRow {
  year: number;
  monthlyThisYear: number;
  yearlyInvested: number;        // SIP contributed during this year
  cumulativeInvested: number;    // current savings + all SIP contributed so far
  savingsValue: number;          // future value of current savings at year end
  sipValue: number;              // future value of SIP contributions at year end
  portfolioValue: number;        // savingsValue + sipValue
  yearlyGrowth: number;          // returns earned this year (the compounding effect)
  gains: number;                 // total gains so far
  gainsPct: number;
  progressPct: number;
}

function buildGoalYearBreakdown(
  monthly: number,
  currentSavings: number,
  annualRate: number,
  months: number,
  stepUp: boolean,
  stepUpPct: number,
  target: number,
): GoalYearRow[] {
  const r = annualRate / 12 / 100;
  const rows: GoalYearRow[] = [];
  const totalYears = Math.ceil(months / 12);

  let savingsValue = currentSavings; // FV of the starting lumpsum
  let sipValue = 0;                  // FV of SIP contributions
  let runningInvested = currentSavings;
  let curMonthly = monthly;
  let prevPortfolio = currentSavings;

  for (let y = 1; y <= totalYears; y++) {
    const moStart = (y - 1) * 12;
    let yearlyInvested = 0;
    for (let mo = 0; mo < 12 && moStart + mo < months; mo++) {
      savingsValue *= 1 + r;                       // lumpsum compounds
      sipValue = (sipValue + curMonthly) * (1 + r); // monthly SIP compounds
      runningInvested += curMonthly;
      yearlyInvested += curMonthly;
    }
    const portfolioValue = savingsValue + sipValue;
    const gains = portfolioValue - runningInvested;
    const gainsPct = runningInvested > 0 ? (gains / runningInvested) * 100 : 0;
    const progressPct = target > 0 ? Math.min(100, (portfolioValue / target) * 100) : 0;
    const yearlyGrowth = portfolioValue - prevPortfolio - yearlyInvested;
    rows.push({
      year: y,
      monthlyThisYear: Math.round(curMonthly),
      yearlyInvested: Math.round(yearlyInvested),
      cumulativeInvested: Math.round(runningInvested),
      savingsValue: Math.round(savingsValue),
      sipValue: Math.round(sipValue),
      portfolioValue: Math.round(portfolioValue),
      yearlyGrowth: Math.round(yearlyGrowth),
      gains: Math.round(gains),
      gainsPct,
      progressPct,
    });
    prevPortfolio = portfolioValue;
    if (stepUp) curMonthly *= 1 + stepUpPct / 100;
  }
  return rows;
}

function GoalPlannerCalculator() {
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(12);
  const [stepUp, setStepUp] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Required monthly SIP to reach target (with or without step-up)
  const result = useMemo(() => {
    const r = rate / 12 / 100;
    const savingsGrown = currentSavings * Math.pow(1 + r, months);
    const remaining = Math.max(0, targetAmount - savingsGrown);
    const base = {
      currentSavings,
      savingsGrown: Math.round(savingsGrown),
      savingsGain: Math.round(savingsGrown - currentSavings),
      sipInvested: 0,
      sipFinalValue: 0,
    };
    if (remaining <= 0) return { ...base, monthly: 0, totalInvested: Math.round(currentSavings), totalGains: Math.round(savingsGrown - currentSavings), finalValue: Math.round(savingsGrown) };
    if (r === 0) return { ...base, monthly: months > 0 ? remaining / months : remaining, sipInvested: Math.round(remaining), sipFinalValue: Math.round(remaining), totalInvested: Math.round(remaining + currentSavings), totalGains: 0, finalValue: Math.round(targetAmount) };

    let monthly: number;
    if (!stepUp || stepUpPct === 0) {
      monthly = remaining * r / ((Math.pow(1 + r, months) - 1) * (1 + r));
    } else {
      let lo = 0, hi = remaining;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        let fv = savingsGrown;
        let m = mid;
        for (let y = 0; y < Math.ceil(months / 12); y++) {
          for (let mo = 0; mo < 12 && (y * 12 + mo) < months; mo++) {
            fv = (fv + m) * (1 + r);
          }
          m *= 1 + stepUpPct / 100;
        }
        if (fv < targetAmount) lo = mid;
        else hi = mid;
      }
      monthly = (lo + hi) / 2;
    }

    // Simulate to find actual values, tracking savings and SIP separately
    let savingsValue = currentSavings;
    let sipValue = 0;
    let totalSIPInvested = 0;
    let m = monthly;
    for (let y = 0; y < Math.ceil(months / 12); y++) {
      for (let mo = 0; mo < 12 && (y * 12 + mo) < months; mo++) {
        savingsValue *= 1 + r;
        sipValue = (sipValue + m) * (1 + r);
        totalSIPInvested += m;
      }
      if (stepUp) m *= 1 + stepUpPct / 100;
    }
    const fv = savingsValue + sipValue;

    return {
      currentSavings,
      savingsGrown: Math.round(savingsValue),
      savingsGain: Math.round(savingsValue - currentSavings),
      sipInvested: Math.round(totalSIPInvested),
      sipFinalValue: Math.round(sipValue),
      monthly: Math.ceil(monthly),
      totalInvested: Math.round(totalSIPInvested + currentSavings),
      totalGains: Math.round(fv - totalSIPInvested - currentSavings),
      finalValue: Math.round(fv),
    };
  }, [targetAmount, currentSavings, months, rate, stepUp, stepUpPct]);

  const yearBreakdown = useMemo(() => {
    if (result.monthly <= 0) return [];
    return buildGoalYearBreakdown(result.monthly, currentSavings, rate, months, stepUp, stepUpPct, targetAmount);
  }, [result.monthly, currentSavings, rate, months, stepUp, stepUpPct, targetAmount]);

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const durationLabel = years > 0
    ? `${years} yr${years > 1 ? "s" : ""}${remainingMonths > 0 ? ` ${remainingMonths} mo` : ""}`
    : `${months} months`;

  const alreadyAchieved = result.monthly <= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-5 space-y-5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[11px]">Target</p>
          <SliderInput label="Target Amount" value={targetAmount} onChange={setTargetAmount} min={10000} max={100000000} step={10000} prefix="₹" format={(v) => fmtShort(v)} accentColor="#8b5cf6" />
          <SliderInput label="Current Savings" value={currentSavings} onChange={setCurrentSavings} min={0} max={targetAmount} step={10000} prefix="₹" format={(v) => fmtShort(v)} info="Amount already saved toward this goal" accentColor="#10b981" />
        </div>
        <div className="rounded-2xl border bg-card p-5 space-y-5">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[11px]">Timeline & Returns</p>
          <SliderInput label="Time to Goal" value={months} onChange={setMonths} min={6} max={360} step={6} suffix=" mo" format={(v) => `${Math.floor(v / 12)}yr ${v % 12}mo`} accentColor="#f97316" />
          <SliderInput label="Expected Returns" value={rate} onChange={setRate} min={1} max={30} step={0.5} suffix="%" accentColor="#3b82f6" />
        </div>
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Annual Step-Up</p>
              <p className="text-xs text-muted-foreground mt-0.5">Increase SIP each year</p>
            </div>
            <button
              onClick={() => setStepUp(!stepUp)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stepUp ? "bg-violet-600" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${stepUp ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {stepUp && (
            <SliderInput label="Step-Up Rate" value={stepUpPct} onChange={setStepUpPct} min={1} max={50} step={1} suffix="%" accentColor="#a855f7" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {alreadyAchieved ? (
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 p-6 text-center space-y-3">
            <div className="text-5xl">🎉</div>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Goal Already Achieved!</p>
            <p className="text-sm text-muted-foreground">Your current savings of {fmtShort(currentSavings)} already exceed the target.</p>
          </div>
        ) : (
          <>
          <div className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden">
            <div className="h-1.5 bg-linear-to-r from-violet-500 via-blue-500 to-purple-600" />
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Required Monthly SIP</p>
                <p className="text-4xl font-mono font-bold text-primary">{fmtShort(result.monthly)}</p>
                <p className="text-xs text-muted-foreground mt-1">per month for {durationLabel}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Target", value: fmtShort(targetAmount), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900" },
                  { label: "Total Invested", value: fmtShort(result.totalInvested), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900" },
                  { label: "Est. Gains", value: fmtShort(result.totalGains), color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Segmented composition bar — current savings · SIP · gains */}
              {(() => {
                const fv = result.finalValue || 1;
                const savingsPct = (result.currentSavings / fv) * 100;
                const sipPct = (result.sipInvested / fv) * 100;
                const gainsPct = (result.totalGains / fv) * 100;
                const seg = [
                  { key: "savings", label: "Current Savings", value: result.currentSavings, pct: savingsPct, bar: "bg-emerald-500", dot: "bg-emerald-500" },
                  { key: "sip", label: "SIP Invested", value: result.sipInvested, pct: sipPct, bar: "bg-blue-500", dot: "bg-blue-500" },
                  { key: "gains", label: "Gains", value: result.totalGains, pct: gainsPct, bar: "bg-violet-500", dot: "bg-violet-500" },
                ].filter((s) => s.value > 0);
                return (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>How your goal is funded</span>
                      <span className="font-mono">{gainsPct.toFixed(1)}% from growth</span>
                    </div>
                    <div className="h-3.5 rounded-full overflow-hidden flex gap-0.5 bg-muted">
                      {seg.map((s, i) => (
                        <div
                          key={s.key}
                          className={`h-full ${s.bar} ${i === 0 ? "rounded-l-full" : ""} ${i === seg.length - 1 ? "rounded-r-full" : ""} transition-all duration-700`}
                          style={{ width: `${s.pct}%` }}
                          title={`${s.label}: ${fmtShort(s.value)}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {seg.map((s) => (
                        <div key={s.key} className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className={`w-2 h-2 rounded-full ${s.dot} inline-block`} />{s.label}
                          </span>
                          <span className="text-xs font-semibold pl-3">{fmtShort(s.value)}</span>
                          <span className="text-[9px] text-muted-foreground pl-3">{s.pct.toFixed(0)}% of corpus</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Where the money comes from — savings vs SIP detail */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Money breakdown at goal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Current savings */}
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <PiggyBank className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-semibold">Current Savings</p>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">You start with</span>
                  <span className="font-mono font-semibold">{fmtShort(result.currentSavings)}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Compounds to</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtShort(result.savingsGrown)}</span>
                </div>
                {result.savingsGain > 0 && (
                  <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-emerald-100 dark:border-emerald-900/60">
                    <span className="text-muted-foreground">Growth earned</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">+{fmtShort(result.savingsGain)}</span>
                  </div>
                )}
              </div>
              {/* SIP */}
              <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-semibold">Monthly SIP</p>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">You invest</span>
                  <span className="font-mono font-semibold">{fmtShort(result.sipInvested)}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Compounds to</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{fmtShort(result.sipFinalValue)}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-blue-100 dark:border-blue-900/60">
                  <span className="text-muted-foreground">Growth earned</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">+{fmtShort(result.sipFinalValue - result.sipInvested)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                Total compounding gains
              </span>
              <span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400">+{fmtShort(result.totalGains)}</span>
            </div>
          </div>
          </>
        )}

        {/* Quick scenarios */}
        {!alreadyAchieved && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">How rate changes the required SIP</p>
            <div className="space-y-2">
              {[8, 10, 12, 15, 18].map((r) => {
                const rr = r / 12 / 100;
                const rem = Math.max(0, targetAmount - currentSavings * Math.pow(1 + rr, months));
                const m = rem * rr / ((Math.pow(1 + rr, months) - 1) * (1 + rr));
                const highlight = Math.abs(r - rate) < 0.5;
                return (
                  <div key={r} className={`flex items-center justify-between py-2 px-3 rounded-lg ${highlight ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}>
                    <span className={`text-sm ${highlight ? "font-bold text-primary" : "text-muted-foreground"}`}>{r}% p.a.{highlight ? " ← current" : ""}</span>
                    <span className={`font-mono text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{fmtShort(Math.ceil(m))}/mo</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Year-by-year breakdown — full width below the 2-col grid */}
      {!alreadyAchieved && yearBreakdown.length > 0 && (
        <div className="col-span-full rounded-2xl border bg-card overflow-hidden">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                <ChevronDown className={`h-4 w-4 text-violet-600 transition-transform duration-200 ${showBreakdown ? "rotate-180" : ""}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Year-by-Year Breakdown</p>
                <p className="text-xs text-muted-foreground">{yearBreakdown.length} years · watch your wealth grow</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{showBreakdown ? "Hide" : "Show"} details</span>
          </button>

          {showBreakdown && (
            <div className="border-t">
              {/* Stacked area chart — savings value + SIP value, with invested baseline */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                  {[
                    { color: "#10b981", label: "Current Savings (grown)" },
                    { color: "#3b82f6", label: "SIP (grown)" },
                    { color: "#94a3b8", label: "Total Invested", dashed: true },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="w-3 rounded-full" style={{ height: l.dashed ? 0 : 8, background: l.dashed ? "transparent" : l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : undefined }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={yearBreakdown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goalSavingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="goalSipGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `Y${v}`} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={48} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 11 }}
                      formatter={(v: unknown, name: string | undefined) => [fmtShort(v as number), name ?? ""]}
                      labelFormatter={(l) => `Year ${l}`}
                    />
                    <Area type="monotone" dataKey="savingsValue" name="Current Savings (grown)" stackId="v" stroke="#10b981" strokeWidth={1.5} fill="url(#goalSavingsGrad)" dot={false} />
                    <Area type="monotone" dataKey="sipValue" name="SIP (grown)" stackId="v" stroke="#3b82f6" strokeWidth={1.5} fill="url(#goalSipGrad)" dot={false} />
                    <Area type="monotone" dataKey="cumulativeInvested" name="Total Invested" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" fill="none" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-t border-b bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">Year</th>
                      {stepUp && <th className="px-3 py-3 text-right font-medium">Monthly SIP</th>}
                      <th className="px-3 py-3 text-right font-medium">Invested (yr)</th>
                      <th className="px-3 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">Savings Value</th>
                      <th className="px-3 py-3 text-right font-medium text-blue-600 dark:text-blue-400">SIP Value</th>
                      <th className="px-3 py-3 text-right font-medium text-amber-600 dark:text-amber-400">Growth (yr)</th>
                      <th className="px-3 py-3 text-right font-medium">Portfolio Value</th>
                      <th className="px-3 py-3 text-right font-medium">Total Gains</th>
                      <th className="px-4 py-3 text-right font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearBreakdown.map((row) => {
                      const isGoalYear = row.progressPct >= 99.5;
                      return (
                        <tr
                          key={row.year}
                          className={`border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20 ${isGoalYear ? "bg-violet-50 dark:bg-violet-950/20" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Year {row.year}</span>
                              {isGoalYear && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 font-semibold">🎯 Goal</span>
                              )}
                            </div>
                          </td>
                          {stepUp && (
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                              {fmtShort(row.monthlyThisYear)}/mo
                            </td>
                          )}
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">{fmtShort(row.yearlyInvested)}</td>
                          <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{row.savingsValue > 0 ? fmtShort(row.savingsValue) : "—"}</td>
                          <td className="px-3 py-3 text-right font-mono text-blue-600 dark:text-blue-400">{fmtShort(row.sipValue)}</td>
                          <td className="px-3 py-3 text-right font-mono text-amber-600 dark:text-amber-400">+{fmtShort(row.yearlyGrowth)}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold text-violet-600 dark:text-violet-400">{fmtShort(row.portfolioValue)}</td>
                          <td className="px-3 py-3 text-right font-mono text-green-600 dark:text-green-400">
                            +{fmtShort(row.gains)}
                            <span className="text-[10px] text-muted-foreground ml-1">({row.gainsPct.toFixed(0)}%)</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${row.progressPct >= 100 ? "bg-violet-500" : row.progressPct >= 75 ? "bg-emerald-500" : row.progressPct >= 50 ? "bg-blue-500" : "bg-amber-400"}`}
                                  style={{ width: `${row.progressPct}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-semibold w-8 text-right">{row.progressPct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-semibold">
                      <td className="px-4 py-3 text-sm">Final</td>
                      {stepUp && <td className="px-3 py-3" />}
                      <td className="px-3 py-3 text-right font-mono text-sm text-muted-foreground">{fmtShort(result.totalInvested)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">{result.savingsGrown > 0 ? fmtShort(result.savingsGrown) : "—"}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-blue-600 dark:text-blue-400">{fmtShort(result.sipFinalValue)}</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right font-mono text-sm text-violet-600 dark:text-violet-400">{fmtShort(result.finalValue)}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-green-600 dark:text-green-400">+{fmtShort(result.totalGains)}</td>
                      <td className="px-4 py-3 text-right text-sm text-violet-600 dark:text-violet-400 font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SIPCalculatorPage() {
  const [tab, setTab] = useState<"sip" | "swp" | "goal">("sip");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 text-white shadow-sm">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">SIP / SWP Calculator</h1>
          <p className="text-sm text-muted-foreground">Plan investments and withdrawals with step-up support</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-2xl border bg-card p-1.5 gap-1.5 shadow-sm flex-wrap">
        <button
          onClick={() => setTab("sip")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "sip"
              ? "bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          SIP — Invest
        </button>
        <button
          onClick={() => setTab("swp")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "swp"
              ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-4 w-4" />
          SWP — Withdraw
        </button>
        <button
          onClick={() => setTab("goal")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "goal"
              ? "bg-linear-to-r from-violet-600 to-pink-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Goal Planner
        </button>
      </div>

      {tab === "sip" && <SIPCalculator />}
      {tab === "swp" && <SWPCalculator />}
      {tab === "goal" && <GoalPlannerCalculator />}
    </div>
  );
}
