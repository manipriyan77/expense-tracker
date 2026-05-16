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
  const [mode, setMode] = useState<"monthly" | "lumpsum">("monthly");
  const [monthly, setMonthly] = useState(10000);
  const [lumpsum, setLumpsum] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo(() => {
    if (mode === "lumpsum") return calcLumpsum(lumpsum, rate, years);
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
        {(["monthly", "lumpsum"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "monthly" ? "Monthly SIP" : "Lumpsum"}
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
            {mode === "monthly" ? (
              <SliderInput label="Monthly Investment" value={monthly} onChange={setMonthly}
                min={500} max={500000} step={500} prefix="₹"
                format={(v) => fmtShort(v).replace("₹", "")} accentColor="#3b82f6" />
            ) : (
              <SliderInput label="Lumpsum Amount" value={lumpsum} onChange={setLumpsum}
                min={1000} max={100000000} step={10000} prefix="₹"
                format={(v) => fmtShort(v).replace("₹", "")} accentColor="#3b82f6" />
            )}
            <SliderInput label="Expected Return" value={rate} onChange={setRate}
              min={1} max={30} step={0.5} suffix="% p.a." accentColor="#8b5cf6" />
            <SliderInput label="Time Period" value={years} onChange={setYears}
              min={1} max={40} suffix=" yr" accentColor="#06b6d4" />

            {mode === "monthly" && (
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
          <div className="grid grid-cols-3 gap-3">
            {[
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

          {/* Chart */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-semibold mb-4">Wealth Growth Over Time</p>
            <ResponsiveContainer width="100%" height={200}>
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="year" tickFormatter={(v) => `Y${v}`} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => fmtShort(v).replace("₹", "").trim()} tick={{ fontSize: 10 }} stroke="#94a3b8" width={50} />
                <Tooltip contentStyle={TOOLTIP_STYLE} // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string) => [fmtShort(Number(v)), name]} labelFormatter={(l) => `Year ${l}`} />
                <Area type="monotone" dataKey="invested" name="Invested" stroke="#3b82f6" strokeWidth={2} fill="url(#sipInvested)" />
                <Area type="monotone" dataKey="value" name="Future Value" stroke="#8b5cf6" strokeWidth={2} fill="url(#sipValue)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-3">
              {[{ color: "#3b82f6", label: "Invested" }, { color: "#8b5cf6", label: "Future Value" }].map((l) => (
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
              {mode === "monthly" ? (
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
                  <th className="px-5 py-3 text-left">Year</th>
                  <th className="px-5 py-3 text-right">Invested</th>
                  <th className="px-5 py-3 text-right">Gains</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3 text-right">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const ret = r.invested > 0 ? (r.gains / r.invested) * 100 : 0;
                  return (
                    <tr key={r.year} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-semibold">Year {r.year}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{fmtShort(r.invested)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">+{fmtShort(r.gains)}</td>
                      <td className="px-5 py-3 text-right font-bold">{fmtShort(r.value)}</td>
                      <td className="px-5 py-3 text-right text-purple-600 dark:text-purple-400 font-semibold">{ret.toFixed(1)}%</td>
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
                  formatter={(v: any, name: string) => [fmtShort(Number(v)), name]} labelFormatter={(l) => `Year ${l}`} />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SIPCalculatorPage() {
  const [tab, setTab] = useState<"sip" | "swp">("sip");

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
      <div className="inline-flex rounded-2xl border bg-card p-1.5 gap-1.5 shadow-sm">
        <button
          onClick={() => setTab("sip")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
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
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === "swp"
              ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="h-4 w-4" />
          SWP — Withdraw
        </button>
      </div>

      {tab === "sip" ? <SIPCalculator /> : <SWPCalculator />}
    </div>
  );
}
