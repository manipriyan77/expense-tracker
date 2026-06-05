"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Activity, Zap, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

// ── Data ──────────────────────────────────────────────────────────────────────
export const MF_HOLDINGS = [
  { name: "HDFC ELSS Tax Saver", amc: "HDFC", category: "Equity", subCategory: "ELSS", plan: "Direct", nav: 1422.13, units: 1.27, invested: 1998.85, current: 1798.99, weight: 0.24, pnl: -199.86, pnlPct: -10.0, xirr: -15.55, since: "2025-09-17" },
  { name: "HDFC Liquid Fund", amc: "HDFC", category: "Debt", subCategory: "Liquid Fund", plan: "Direct", nav: 5476.95, units: 3.86, invested: 21141.69, current: 21146.51, weight: 2.78, pnl: 4.82, pnlPct: 0.02, xirr: 6.2, since: "2024-09-22" },
  { name: "HDFC Retirement Savings-Equity", amc: "HDFC", category: "Other", subCategory: "Retirement Fund", plan: "Direct", nav: 53.58, units: 44.54, invested: 2499.86, current: 2386.74, weight: 0.31, pnl: -113.12, pnlPct: -4.53, xirr: -4.54, since: "2025-05-07" },
  { name: "HDFC Focused Fund", amc: "HDFC", category: "Equity", subCategory: "Focused Fund", plan: "Standard", nav: 219.81, units: 313.56, invested: 70996.51, current: 68925.32, weight: 9.07, pnl: -2071.19, pnlPct: -2.92, xirr: -11.62, since: "2025-11-07" },
  { name: "HDFC Pharma and Healthcare Fund", amc: "HDFC", category: "Equity", subCategory: "Sectoral - Pharma", plan: "Standard", nav: 19.38, units: 2912.51, invested: 49997.48, current: 56435.71, weight: 7.43, pnl: 6438.23, pnlPct: 12.88, xirr: 17.68, since: "2025-07-07" },
  { name: "Kotak Multicap Fund", amc: "Kotak", category: "Equity", subCategory: "Multi Cap", plan: "Standard", nav: 19.37, units: 2594.97, invested: 49997.51, current: 50262.03, weight: 6.61, pnl: 264.52, pnlPct: 0.53, xirr: 1.93, since: "2025-11-07" },
  { name: "SBI Liquid Fund", amc: "SBI", category: "Debt", subCategory: "Liquid Fund", plan: "Direct", nav: 4359.95, units: 3.29, invested: 14299.78, current: 14339.87, weight: 1.89, pnl: 40.09, pnlPct: 0.28, xirr: 6.12, since: "2024-06-10" },
  { name: "SBI Contra Fund", amc: "SBI", category: "Equity", subCategory: "Contra Fund", plan: "Standard", nav: 368.33, units: 130.51, invested: 49997.65, current: 48071.93, weight: 6.33, pnl: -1925.72, pnlPct: -3.85, xirr: -5.15, since: "2025-07-07" },
  { name: "ICICI Pru Equity Min Variance", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 10.25, units: 1416.47, invested: 14999.25, current: 14518.84, weight: 1.91, pnl: -480.41, pnlPct: -3.2, xirr: -4.82, since: "2025-09-08" },
  { name: "ICICI Pru India Opp Fund", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 35.26, units: 1976.41, invested: 70996.44, current: 69688.39, weight: 9.17, pnl: -1308.05, pnlPct: -1.84, xirr: -7.45, since: "2026-02-09" },
  { name: "ICICI Pru Innovation Fund", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 18.35, units: 529.91, invested: 9999.5, current: 9723.94, weight: 1.28, pnl: -275.56, pnlPct: -2.76, xirr: -4.74, since: "2025-11-07" },
  { name: "Tata Business Cycle Fund", amc: "Tata", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 18.51, units: 526.34, invested: 9999.5, current: 9743.96, weight: 1.28, pnl: -255.54, pnlPct: -2.56, xirr: -4.4, since: "2025-11-07" },
  { name: "Tata Income Plus Arbitrage FOF", amc: "Tata", category: "Other", subCategory: "FoFs Hybrid", plan: "Standard", nav: 10.43, units: 958.94, invested: 9999.5, current: 10005.92, weight: 1.32, pnl: 6.42, pnlPct: 0.06, xirr: 0.81, since: "2026-05-07" },
  { name: "Tata Resources & Energy Fund", amc: "Tata", category: "Equity", subCategory: "Sectoral - Energy", plan: "Standard", nav: 48.92, units: 907.2, invested: 41997.88, current: 44382.16, weight: 5.84, pnl: 2384.28, pnlPct: 5.68, xirr: 40.77, since: "2026-03-09" },
  { name: "Tata Small Cap Fund", amc: "Tata", category: "Equity", subCategory: "Small Cap", plan: "Standard", nav: 36.11, units: 2815.94, invested: 100994.94, current: 101683.52, weight: 13.38, pnl: 688.58, pnlPct: 0.68, xirr: 1.75, since: "2025-08-07" },
  { name: "ITI Bharat Consumption Fund", amc: "ITI", category: "Equity", subCategory: "Sectoral - Consumption", plan: "Standard", nav: 10.82, units: 868.21, invested: 9999.5, current: 9390.71, weight: 1.24, pnl: -608.79, pnlPct: -6.09, xirr: -10.34, since: "2025-11-07" },
  { name: "Nippon India Banking & FS Fund", amc: "Nippon", category: "Equity", subCategory: "Sectoral - Banking", plan: "Standard", nav: 609.0, units: 113.13, invested: 70995.61, current: 68898.36, weight: 9.07, pnl: -2097.26, pnlPct: -2.95, xirr: -11.76, since: "2025-11-07" },
  { name: "Nippon India Flexi Cap Fund", amc: "Nippon", category: "Equity", subCategory: "Flexi Cap", plan: "Standard", nav: 15.91, units: 8068.53, invested: 129756.52, current: 128408.19, weight: 16.9, pnl: -1348.33, pnlPct: -1.04, xirr: -2.35, since: "2025-07-07" },
  { name: "Nippon India Conservative Hybrid", amc: "Nippon", category: "Hybrid", subCategory: "Conservative Hybrid", plan: "Standard", nav: 60.61, units: 495.17, invested: 29438.28, current: 30012.78, weight: 3.95, pnl: 574.5, pnlPct: 1.95, xirr: 2.24, since: "2025-10-27" },
] as const;

export const STOCK_HOLDINGS = [
  { name: "GOLDBEES", type: "ETF", qty: 55, avgCost: 127.47, ltp: 127.78, portfolioWeight: 27.23, invested: 7010.85, current: 7027.90, pnl: 17.05, pnlPct: 0.24, dailyChange: -0.72, dailyChangePct: -0.56 },
  { name: "HDFCBANK", type: "Stock", qty: 10, avgCost: 756.40, ltp: 747.05, portfolioWeight: 28.94, invested: 7564.00, current: 7470.50, pnl: -93.50, pnlPct: -1.24, dailyChange: -7.15, dailyChangePct: -0.95 },
  { name: "RPOWER", type: "Stock", qty: 55, avgCost: 27.49, ltp: 28.59, portfolioWeight: 6.09, invested: 1511.95, current: 1572.45, pnl: 60.50, pnlPct: 4.0, dailyChange: 1.20, dailyChangePct: 4.38 },
  { name: "SILVERBEES", type: "ETF", qty: 40, avgCost: 246.08, ltp: 243.58, portfolioWeight: 37.74, invested: 9843.20, current: 9743.20, pnl: -100.00, pnlPct: -1.02, dailyChange: -2.98, dailyChangePct: -1.21 },
  { name: "Equity & Gold Allocation", type: "Smallcase", qty: null, avgCost: null, ltp: null, portfolioWeight: 2.02, invested: 403.14, current: 520.92, pnl: 117.78, pnlPct: 29.22, dailyChange: null, dailyChangePct: null },
] as const;

export function shortAmount(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

type SortKey = "name" | "invested" | "current" | "pnl" | "pnlPct" | "xirr" | "weight";

function SortIcon({ active, dir }: { active: boolean; dir: 1 | -1 }) {
  if (!active) return <span className="text-muted-foreground/30 text-[10px]">⇅</span>;
  return <span className="text-[10px]">{dir === -1 ? "↓" : "↑"}</span>;
}

// Ring progress for health score
function RingMeter({ value, size = 80, stroke = 7, color = "#6366f1" }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// XIRR bullet bar — shows negative left, positive right from center
function XIRRBar({ xirr, max = 45 }: { xirr: number; max?: number }) {
  const pct = Math.min(100, (Math.abs(xirr) / max) * 100);
  const isPos = xirr >= 0;
  return (
    <div className="flex items-center gap-1 w-full">
      <div className="flex-1 flex justify-end h-2 bg-muted rounded-l-full overflow-hidden">
        {!isPos && <div className="h-full rounded-l-full bg-red-500" style={{ width: `${pct}%` }} />}
      </div>
      <div className="h-3 w-px bg-border shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-r-full overflow-hidden">
        {isPos && <div className="h-full rounded-r-full bg-green-500" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

// AMC color map
const AMC_COLORS: Record<string, string> = {
  HDFC: "#e11d48", Kotak: "#f97316", SBI: "#3b82f6",
  ICICI: "#8b5cf6", Tata: "#14b8a6", Nippon: "#22c55e", ITI: "#eab308",
};
function amcColor(amc: string) { return AMC_COLORS[amc] ?? "#94a3b8"; }

const CAT_COLORS: Record<string, string> = {
  Equity: "#6366f1", Debt: "#22c55e", Hybrid: "#f97316", Other: "#a855f7", "Stocks/ETFs": "#3b82f6",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PortfolioSnapshot() {
  const { format } = useFormatCurrency();
  const [activeView, setActiveView] = useState<"overview" | "mf" | "stocks">("overview");
  const [mfSort, setMfSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "weight", dir: -1 });
  const [mfFilter, setMfFilter] = useState<string>("All");
  const [expandedFund, setExpandedFund] = useState<string | null>(null);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [mfGroupBy, setMfGroupBy] = useState<"none" | "amc" | "category">("none");

  // ── Totals ──────────────────────────────────────────────────────────────────
  const mfInvested  = MF_HOLDINGS.reduce((s, f) => s + f.invested, 0);
  const mfCurrent   = MF_HOLDINGS.reduce((s, f) => s + f.current, 0);
  const mfPnl       = mfCurrent - mfInvested;
  const stInvested  = STOCK_HOLDINGS.reduce((s, f) => s + f.invested, 0);
  const stCurrent   = STOCK_HOLDINGS.reduce((s, f) => s + f.current, 0);
  const stPnl       = stCurrent - stInvested;
  const totalInvested = mfInvested + stInvested;
  const totalCurrent  = mfCurrent + stCurrent;
  const totalPnl      = totalCurrent - totalInvested;
  const totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // ── Allocation ───────────────────────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  MF_HOLDINGS.forEach((f) => { catMap[f.category] = (catMap[f.category] ?? 0) + f.current; });
  catMap["Stocks/ETFs"] = stCurrent;
  const allocItems = Object.entries(catMap)
    .map(([cat, val]) => ({ cat, val, pct: totalCurrent > 0 ? (val / totalCurrent) * 100 : 0, color: CAT_COLORS[cat] ?? "#94a3b8" }))
    .sort((a, b) => b.val - a.val);

  // Pie data
  const pieData = allocItems.map((a) => ({ name: a.cat, value: parseFloat(a.pct.toFixed(1)), color: a.color }));

  // ── AMC ─────────────────────────────────────────────────────────────────────
  const amcMap: Record<string, { invested: number; current: number; count: number }> = {};
  MF_HOLDINGS.forEach((f) => {
    if (!amcMap[f.amc]) amcMap[f.amc] = { invested: 0, current: 0, count: 0 };
    amcMap[f.amc].invested += f.invested; amcMap[f.amc].current += f.current; amcMap[f.amc].count += 1;
  });
  const amcItems = Object.entries(amcMap)
    .map(([amc, v]) => ({ amc, ...v, pct: mfCurrent > 0 ? (v.current / mfCurrent) * 100 : 0, pnlPct: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0, color: amcColor(amc) }))
    .sort((a, b) => b.current - a.current);

  // AMC bar chart data
  const amcBarData = amcItems.map((a) => ({
    name: a.amc, Invested: Math.round(a.invested / 1000), Current: Math.round(a.current / 1000),
    pnlPct: parseFloat(a.pnlPct.toFixed(2)),
  }));

  // ── Sectors ─────────────────────────────────────────────────────────────────
  const SECTOR_COLORS = ["#6366f1","#3b82f6","#22c55e","#f97316","#ec4899","#eab308","#14b8a6","#a855f7","#ef4444","#64748b","#0ea5e9","#84cc16","#f43f5e","#8b5cf6","#06b6d4"];
  type SectorEntry = { sector: string; current: number; invested: number; count: number; pct: number; pnlPct: number; color: string; funds: { name: string; current: number; invested: number; pnl: number; xirr: number }[] };
  const sectorMap: Record<string, { current: number; invested: number; count: number; funds: { name: string; current: number; invested: number; pnl: number; xirr: number }[] }> = {};
  MF_HOLDINGS.forEach((f) => {
    if (!sectorMap[f.subCategory]) sectorMap[f.subCategory] = { current: 0, invested: 0, count: 0, funds: [] };
    sectorMap[f.subCategory].current += f.current; sectorMap[f.subCategory].invested += f.invested; sectorMap[f.subCategory].count += 1;
    sectorMap[f.subCategory].funds.push({ name: f.name, current: f.current, invested: f.invested, pnl: f.pnl, xirr: f.xirr });
  });
  STOCK_HOLDINGS.forEach((s) => {
    if (!sectorMap[s.type]) sectorMap[s.type] = { current: 0, invested: 0, count: 0, funds: [] };
    sectorMap[s.type].current += s.current; sectorMap[s.type].invested += s.invested; sectorMap[s.type].count += 1;
    sectorMap[s.type].funds.push({ name: s.name, current: s.current, invested: s.invested, pnl: s.pnl, xirr: s.pnlPct });
  });
  const sectorItems: SectorEntry[] = Object.entries(sectorMap)
    .map(([sector, v], i) => ({ sector, ...v, pct: totalCurrent > 0 ? (v.current / totalCurrent) * 100 : 0, pnlPct: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))
    .sort((a, b) => b.current - a.current);

  // ── XIRR chart ───────────────────────────────────────────────────────────────
  const xirrBarData = [...MF_HOLDINGS]
    .sort((a, b) => b.xirr - a.xirr)
    .map((f) => ({ name: f.name.split(" ").slice(0, 2).join(" "), xirr: f.xirr, fill: f.xirr >= 0 ? "#22c55e" : "#ef4444" }));

  // ── Health ───────────────────────────────────────────────────────────────────
  const greenFunds   = MF_HOLDINGS.filter((f) => f.xirr > 0).length;
  const directPct    = (MF_HOLDINGS.filter((f) => f.plan === "Direct").length / MF_HOLDINGS.length) * 100;
  const avgXirr      = MF_HOLDINGS.reduce((s, f) => s + f.xirr, 0) / MF_HOLDINGS.length;
  const maxSectorPct = Math.max(...sectorItems.map((s) => s.pct));
  const diversScore  = Math.round(Math.max(0, 100 - maxSectorPct));
  const profitPct    = (greenFunds / MF_HOLDINGS.length) * 100;
  const healthScore  = Math.round((profitPct * 0.6) + (diversScore * 0.4));
  const healthColor  = healthScore >= 70 ? "#22c55e" : healthScore >= 45 ? "#f59e0b" : "#ef4444";

  // ── MF table ─────────────────────────────────────────────────────────────────
  const categories = ["All", ...Array.from(new Set(MF_HOLDINGS.map((f) => f.category)))];
  const filteredMF = [...MF_HOLDINGS]
    .filter((f) => mfFilter === "All" || f.category === mfFilter)
    .sort((a, b) => (a[mfSort.key] as number) > (b[mfSort.key] as number) ? mfSort.dir : -mfSort.dir);

  // Grouped MF
  const mfGrouped = mfGroupBy === "none" ? { "All Funds": filteredMF } :
    filteredMF.reduce<Record<string, typeof filteredMF>>((acc, f) => {
      const key = mfGroupBy === "amc" ? f.amc : f.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {});

  function toggleSort(key: SortKey) {
    setMfSort((prev) => prev.key === key ? { key, dir: prev.dir === -1 ? 1 : -1 } : { key, dir: -1 });
  }

  // ── Hero always-visible ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* HERO */}
      <div className="rounded-xl bg-slate-900 dark:bg-black overflow-hidden">
        <div className="flex h-1.5 w-full">
          {allocItems.map((item) => <div key={item.cat} style={{ width: `${item.pct}%`, backgroundColor: item.color }} />)}
        </div>
        <div className="px-5 py-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: "Value", val: format(totalCurrent), sub: "05 Jun 2026", cls: "text-white" },
            { label: "Invested", val: format(totalInvested), sub: `${MF_HOLDINGS.length} MF · ${STOCK_HOLDINGS.length} stocks`, cls: "text-white" },
            { label: "P&L", val: `${totalPnl >= 0 ? "+" : ""}${format(Math.abs(totalPnl))}`, sub: `${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(3)}%`, cls: totalPnl >= 0 ? "text-green-400" : "text-red-400" },
            { label: "Avg XIRR", val: `${avgXirr >= 0 ? "+" : ""}${avgXirr.toFixed(2)}%`, sub: "across MF", cls: avgXirr >= 0 ? "text-green-400" : "text-red-400" },
            { label: "Profitable", val: `${greenFunds}/${MF_HOLDINGS.length}`, sub: "funds in green", cls: "text-white" },
            { label: "Health", val: `${healthScore}/100`, sub: healthScore >= 70 ? "Diversified" : "Review needed", cls: healthScore >= 70 ? "text-green-400" : healthScore >= 45 ? "text-yellow-400" : "text-red-400" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">{s.label}</p>
              <p className={`font-mono font-bold text-base ${s.cls}`}>{s.val}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-3 flex gap-4 flex-wrap border-t border-slate-800 pt-2">
          {allocItems.map((item) => (
            <div key={item.cat} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-400">{item.cat}</span>
              <span className="text-[10px] font-mono text-slate-500">{item.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* TAB NAV */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {(["overview", "mf", "stocks"] as const).map((v) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${activeView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {v === "overview" ? "Overview" : v === "mf" ? `Mutual Funds (${MF_HOLDINGS.length})` : `Stocks & ETFs (${STOCK_HOLDINGS.length})`}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════ */}
      {activeView === "overview" && (
        <div className="space-y-4">

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "MF Portfolio", val: format(mfCurrent), sub: `${mfPnl >= 0 ? "+" : ""}${format(Math.abs(mfPnl))} P&L`, pos: mfPnl >= 0, bar: (mfCurrent / totalCurrent) * 100, color: "bg-indigo-500" },
              { label: "Stocks / ETFs", val: format(stCurrent), sub: `${stPnl >= 0 ? "+" : ""}${format(Math.abs(stPnl))} P&L`, pos: stPnl >= 0, bar: (stCurrent / totalCurrent) * 100, color: "bg-blue-500" },
              { label: "Best XIRR", val: `+${[...MF_HOLDINGS].sort((a, b) => b.xirr - a.xirr)[0].xirr.toFixed(2)}%`, sub: [...MF_HOLDINGS].sort((a, b) => b.xirr - a.xirr)[0].name.split(" ").slice(0, 3).join(" "), pos: true, bar: 100, color: "bg-green-500" },
              { label: "Worst XIRR", val: `${[...MF_HOLDINGS].sort((a, b) => a.xirr - b.xirr)[0].xirr.toFixed(2)}%`, sub: [...MF_HOLDINGS].sort((a, b) => a.xirr - b.xirr)[0].name.split(" ").slice(0, 3).join(" "), pos: false, bar: Math.min(100, Math.abs([...MF_HOLDINGS].sort((a, b) => a.xirr - b.xirr)[0].xirr) * 5), color: "bg-red-500" },
              { label: "Direct Plans", val: `${MF_HOLDINGS.filter((f) => f.plan === "Direct").length}/${MF_HOLDINGS.length}`, sub: `${directPct.toFixed(0)}% are direct`, pos: directPct > 50, bar: directPct, color: "bg-violet-500" },
              { label: "Profitable Funds", val: `${greenFunds}/${MF_HOLDINGS.length}`, sub: `${profitPct.toFixed(0)}% in green`, pos: greenFunds > MF_HOLDINGS.length / 2, bar: profitPct, color: "bg-emerald-500" },
            ].map((s) => (
              <Card key={s.label} className="relative overflow-hidden">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                  <p className={`font-mono font-bold text-base ${s.pos ? "" : "text-red-500"}`}>{s.val}</p>
                  <p className={`text-[10px] mt-0.5 truncate font-mono ${s.pos ? "text-muted-foreground" : "text-red-400"}`}>{s.sub}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-0.5 ${s.color}`} style={{ width: `${s.bar}%` }} />
              </Card>
            ))}
          </div>

          {/* Charts row: Pie + XIRR waterfall */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Asset allocation donut */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Asset Allocation</p>
              </CardHeader>
              <CardContent className="pt-3 pb-2 px-2">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(v: unknown) => [`${v}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="font-mono font-bold text-sm">{shortAmount(totalCurrent)}</p>
                    <p className="text-[10px] text-muted-foreground">total</p>
                  </div>
                </div>
                <div className="space-y-1.5 px-2 pb-1">
                  {allocItems.map((a) => (
                    <div key={a.cat} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="text-[11px] flex-1">{a.cat}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{shortAmount(a.val)}</span>
                      <span className="text-[10px] font-mono font-semibold w-10 text-right">{a.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* XIRR waterfall — all MF funds */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">XIRR Across All Funds</p>
                  <span className="text-[10px] font-mono text-muted-foreground">0% = break-even</span>
                </div>
              </CardHeader>
              <CardContent className="px-1 pt-2 pb-1">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={xirrBarData} layout="vertical" barSize={9} margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${v}%`} domain={["auto", "auto"]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v: unknown) => [`${v}%`, "XIRR"]}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                    <Bar dataKey="xirr" radius={[0, 3, 3, 0]}>
                      {xirrBarData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AMC invested vs current bar + Health gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* AMC bar chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">AMC Invested vs Current (₹K)</p>
              </CardHeader>
              <CardContent className="px-2 pt-3 pb-2">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={amcBarData} barCategoryGap="30%" barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}K`} width={38} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v: unknown, name: unknown) => [`₹${v}K`, name as string] as [string, string]}
                    />
                    <Bar dataKey="Invested" fill="#6366f1" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Current" radius={[3, 3, 0, 0]}>
                      {amcBarData.map((entry, i) => <Cell key={i} fill={amcColor(entry.name)} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Health score gauge */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Portfolio Health</p>
              </CardHeader>
              <CardContent className="px-4 py-3 flex flex-col items-center gap-4">
                <div className="relative">
                  <RingMeter value={healthScore} size={96} stroke={8} color={healthColor} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-mono font-bold text-xl" style={{ color: healthColor }}>{healthScore}</p>
                    <p className="text-[9px] text-muted-foreground">/100</p>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {[
                    { label: "Profitable funds", val: `${profitPct.toFixed(0)}%`, score: profitPct, color: "#22c55e", icon: <Zap className="h-3 w-3" /> },
                    { label: "Diversification", val: `${diversScore}/100`, score: diversScore, color: "#3b82f6", icon: <Activity className="h-3 w-3" /> },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{m.icon}{m.label}</div>
                        <span className="text-[10px] font-mono font-semibold">{m.val}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sector tile grid */}
          <Card>
            <CardHeader className="pb-0 px-4 pt-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sector / Sub-Category Allocation</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Tap a tile · detail expands inline below its row</p>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{sectorItems.length} sectors</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden mt-3 mb-0.5 rounded-sm">
                {sectorItems.map((s) => (
                  <div key={s.sector} style={{ width: `${s.pct}%`, backgroundColor: s.color, cursor: "pointer" }}
                    title={`${s.sector}: ${s.pct.toFixed(1)}%`}
                    onClick={() => setExpandedSector(expandedSector === s.sector ? null : s.sector)} />
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-3 pb-4 space-y-1.5">
              {(() => {
                const COLS = 4;
                const rows: (typeof sectorItems[number])[][] = [];
                for (let i = 0; i < sectorItems.length; i += COLS) rows.push(sectorItems.slice(i, i + COLS));
                const selItem = sectorItems.find((s) => s.sector === expandedSector) ?? null;
                return rows.map((row, rowIdx) => {
                  const rowHasSel = row.some((s) => s.sector === expandedSector);
                  return (
                    <div key={rowIdx} className="space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {row.map((s) => {
                          const isSelected = expandedSector === s.sector;
                          const pnlAmt = s.current - s.invested;
                          return (
                            <button key={s.sector} onClick={() => setExpandedSector(isSelected ? null : s.sector)}
                              className={`relative rounded-lg border p-3 text-left transition-all ${isSelected ? "border-foreground/30 shadow-sm ring-1 ring-foreground/10 bg-muted/40" : "border-border hover:border-foreground/20 hover:bg-muted/20"}`}>
                              <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <div className="pl-2.5">
                                <p className="font-mono font-bold text-base leading-none mb-1" style={{ color: s.color }}>{s.pct.toFixed(1)}%</p>
                                <p className="text-[11px] font-semibold truncate leading-tight mb-0.5">{s.sector}</p>
                                <p className="text-[9px] text-muted-foreground mb-2">{s.count} holding{s.count !== 1 ? "s" : ""}</p>
                                <div className="h-1 rounded-full bg-muted overflow-hidden mb-2">
                                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${s.pnlPct >= 0 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                                    {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%
                                  </span>
                                  <span className={`text-[9px] font-mono ${pnlAmt >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {pnlAmt >= 0 ? "+" : ""}{shortAmount(Math.abs(pnlAmt))}
                                  </span>
                                </div>
                              </div>
                              {isSelected && <div className="absolute -bottom-1.75 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-foreground/20 bg-card z-10" />}
                            </button>
                          );
                        })}
                        {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => <div key={`ph-${i}`} className="hidden sm:block" />)}
                      </div>
                      {rowHasSel && selItem && (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border" style={{ backgroundColor: selItem.color + "15" }}>
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: selItem.color }} />
                              <p className="text-xs font-bold">{selItem.sector}</p>
                              <span className="text-[10px] text-muted-foreground">{selItem.count} holding{selItem.count !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono">
                              <span className="text-muted-foreground hidden sm:inline">{format(selItem.current)}</span>
                              <span className={selItem.pnlPct >= 0 ? "text-green-500" : "text-red-500"}>{selItem.pnlPct >= 0 ? "+" : ""}{selItem.pnlPct.toFixed(2)}%</span>
                              <button onClick={() => setExpandedSector(null)} className="ml-1 h-5 w-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                          </div>
                          <div className="divide-y divide-border/60">
                            {selItem.funds.map((fund) => {
                              const fundPct = selItem.current > 0 ? (fund.current / selItem.current) * 100 : 0;
                              return (
                                <div key={fund.name} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{fund.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${fundPct}%`, backgroundColor: selItem.color }} />
                                      </div>
                                      <span className="text-[9px] font-mono text-muted-foreground">{fundPct.toFixed(1)}% of sector</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-mono font-semibold">{format(fund.current)}</p>
                                    <p className={`text-[10px] font-mono ${fund.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>{fund.pnl >= 0 ? "+" : ""}{format(Math.abs(fund.pnl))}</p>
                                  </div>
                                  <div className="text-right w-16 shrink-0">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${fund.xirr >= 10 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : fund.xirr >= 0 ? "bg-muted text-muted-foreground" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                                      {fund.xirr >= 0 ? "+" : ""}{fund.xirr.toFixed(2)}%
                                    </span>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">XIRR</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          MUTUAL FUNDS TAB
      ══════════════════════════════════════ */}
      {activeView === "mf" && (
        <div className="space-y-4">
          {/* MF summary bar */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Invested", val: shortAmount(mfInvested) },
              { label: "Current", val: shortAmount(mfCurrent) },
              { label: "P&L", val: `${mfPnl >= 0 ? "+" : ""}${shortAmount(Math.abs(mfPnl))}`, cls: mfPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
              { label: "Avg XIRR", val: `${avgXirr >= 0 ? "+" : ""}${avgXirr.toFixed(2)}%`, cls: avgXirr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
              { label: "Funds", val: `${MF_HOLDINGS.length}` },
              { label: "Profitable", val: `${greenFunds}/${MF_HOLDINGS.length}`, cls: greenFunds >= MF_HOLDINGS.length / 2 ? "text-green-600 dark:text-green-400" : "text-red-500" },
            ].map((s) => (
              <div key={s.label} className="bg-muted/40 rounded-lg px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">{s.label}</p>
                <p className={`font-mono font-bold text-sm ${s.cls ?? ""}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Controls: filter pills + group by */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setMfFilter(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${mfFilter === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>Group:</span>
              {(["none", "amc", "category"] as const).map((g) => (
                <button key={g} onClick={() => setMfGroupBy(g)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mfGroupBy === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {g === "none" ? "None" : g === "amc" ? "AMC" : "Category"}
                </button>
              ))}
            </div>
          </div>

          {/* Fund table — expandable rows */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-6"></th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("name")}>Fund <SortIcon active={mfSort.key === "name"} dir={mfSort.dir} /></th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Sub-Cat</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("invested")}>Invested <SortIcon active={mfSort.key === "invested"} dir={mfSort.dir} /></th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("current")}>Current <SortIcon active={mfSort.key === "current"} dir={mfSort.dir} /></th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer whitespace-nowrap hidden sm:table-cell" onClick={() => toggleSort("pnl")}>P&L <SortIcon active={mfSort.key === "pnl"} dir={mfSort.dir} /></th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground cursor-pointer min-w-32" onClick={() => toggleSort("xirr")}>XIRR <SortIcon active={mfSort.key === "xirr"} dir={mfSort.dir} /></th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hidden md:table-cell" onClick={() => toggleSort("weight")}>Wt% <SortIcon active={mfSort.key === "weight"} dir={mfSort.dir} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mfGrouped).map(([groupName, funds]) => (
                      <>
                        {mfGroupBy !== "none" && (
                          <tr key={`hdr-${groupName}`} className="bg-muted/30 border-b border-border">
                            <td colSpan={8} className="px-4 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mfGroupBy === "amc" ? amcColor(groupName) : CAT_COLORS[groupName] ?? "#94a3b8" }} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{groupName}</span>
                                <span className="text-[9px] text-muted-foreground">· {funds.length} funds · {shortAmount(funds.reduce((s, f) => s + f.current, 0))}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        {funds.map((f) => {
                          const isExpanded = expandedFund === f.name;
                          const rowBg = f.xirr > 10 ? "bg-green-50/30 dark:bg-green-950/10" : f.xirr < -8 ? "bg-red-50/30 dark:bg-red-950/10" : "";
                          const sinceDate = new Date(f.since);
                          const monthsHeld = Math.round((new Date("2026-06-05").getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                          return (
                            <>
                              <tr key={f.name} className={`border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${rowBg}`} onClick={() => setExpandedFund(isExpanded ? null : f.name)}>
                                {/* Expand toggle */}
                                <td className="px-4 py-2.5 text-muted-foreground">
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </td>
                                {/* Fund name */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: amcColor(f.amc) }} />
                                    <div className="min-w-0">
                                      <p className="font-medium truncate max-w-40">{f.name}</p>
                                      <p className="text-[9px] text-muted-foreground">{f.amc} · {f.plan}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 hidden lg:table-cell text-[10px] text-muted-foreground">{f.subCategory}</td>
                                <td className="px-3 py-2.5 text-right font-mono">{format(f.invested)}</td>
                                <td className="px-3 py-2.5 text-right font-mono">{format(f.current)}</td>
                                <td className={`px-3 py-2.5 text-right font-mono font-semibold hidden sm:table-cell ${f.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                  {f.pnl >= 0 ? "+" : ""}{format(Math.abs(f.pnl))}
                                </td>
                                {/* XIRR bullet bar */}
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <XIRRBar xirr={f.xirr} />
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold w-14 text-right shrink-0 ${f.xirr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                      {f.xirr >= 0 ? "+" : ""}{f.xirr.toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 hidden md:table-cell">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, f.weight / 0.17 * 100)}%` }} />
                                    </div>
                                    <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{f.weight.toFixed(1)}%</span>
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded detail row */}
                              {isExpanded && (
                                <tr key={`exp-${f.name}`} className="border-b border-border bg-muted/20">
                                  <td colSpan={8} className="px-6 py-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">NAV</p>
                                        <p className="font-mono text-sm font-semibold">₹{f.nav.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Units</p>
                                        <p className="font-mono text-sm font-semibold">{f.units.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">P&L %</p>
                                        <p className={`font-mono text-sm font-semibold ${f.pnlPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                          {f.pnlPct >= 0 ? "+" : ""}{f.pnlPct.toFixed(2)}%
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Holding Period</p>
                                        <p className="font-mono text-sm font-semibold">{monthsHeld} mo</p>
                                        <p className="text-[9px] text-muted-foreground">since {f.since}</p>
                                      </div>
                                    </div>
                                    {/* Visual: cost basis vs current */}
                                    <div className="mt-3">
                                      <div className="flex items-center gap-3 text-[9px] text-muted-foreground mb-1">
                                        <span>Cost basis {format(f.invested)}</span>
                                        <span>→</span>
                                        <span className={f.pnl >= 0 ? "text-green-500" : "text-red-500"}>Current {format(f.current)}</span>
                                      </div>
                                      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                                        <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20" style={{ width: "100%" }} />
                                        <div className={`absolute inset-y-0 left-0 rounded-full ${f.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                                          style={{ width: `${Math.min(100, (f.current / (f.invested * 1.5)) * 100)}%` }} />
                                        <div className="absolute inset-y-0 rounded-full bg-foreground/40 w-0.5"
                                          style={{ left: `${Math.min(99, (f.invested / (f.invested * 1.5)) * 100)}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40">
                      <td className="px-4 py-2.5" colSpan={3}>
                        <span className="text-xs font-semibold">Total · {filteredMF.length} funds</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{format(filteredMF.reduce((s, f) => s + f.invested, 0))}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{format(filteredMF.reduce((s, f) => s + f.current, 0))}</td>
                      <td className={`px-3 py-2.5 text-right font-mono text-xs font-semibold hidden sm:table-cell ${filteredMF.reduce((s, f) => s + f.pnl, 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {(() => { const t = filteredMF.reduce((s, f) => s + f.pnl, 0); return `${t >= 0 ? "+" : ""}${format(Math.abs(t))}`; })()}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[10px] text-muted-foreground">
                        avg {(filteredMF.reduce((s, f) => s + f.xirr, 0) / filteredMF.length).toFixed(2)}% XIRR
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          STOCKS & ETFs TAB
      ══════════════════════════════════════ */}
      {activeView === "stocks" && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Value", val: format(stCurrent), sub: `${format(stInvested)} invested` },
              { label: "P&L", val: `${stPnl >= 0 ? "+" : ""}${format(Math.abs(stPnl))}`, sub: `${(stPnl / stInvested * 100).toFixed(2)}% return`, cls: stPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
              { label: "Best Return", val: `+${[...STOCK_HOLDINGS].sort((a, b) => b.pnlPct - a.pnlPct)[0].pnlPct.toFixed(2)}%`, sub: [...STOCK_HOLDINGS].sort((a, b) => b.pnlPct - a.pnlPct)[0].name },
              { label: "Holdings", val: `${STOCK_HOLDINGS.length}`, sub: `${STOCK_HOLDINGS.filter((s) => s.pnl >= 0).length} profitable` },
            ].map((s) => (
              <Card key={s.label} className="relative overflow-hidden">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                  <p className={`font-mono font-bold text-base ${s.cls ?? ""}`}>{s.val}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Portfolio weight bar */}
          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Portfolio Weight Distribution</p>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <div className="flex h-6 w-full rounded-lg overflow-hidden gap-0.5">
                {[...STOCK_HOLDINGS].sort((a, b) => b.portfolioWeight - a.portfolioWeight).map((s, i) => {
                  const COLORS = ["#3b82f6","#6366f1","#22c55e","#f97316","#a855f7"];
                  return (
                    <div key={s.name} style={{ width: `${s.portfolioWeight}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      className="flex items-center justify-center" title={`${s.name}: ${s.portfolioWeight}%`}>
                      {s.portfolioWeight > 10 && <span className="text-[9px] font-bold text-white truncate px-1">{s.name}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 flex-wrap mt-2">
                {[...STOCK_HOLDINGS].sort((a, b) => b.portfolioWeight - a.portfolioWeight).map((s, i) => {
                  const COLORS = ["#3b82f6","#6366f1","#22c55e","#f97316","#a855f7"];
                  return (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-muted-foreground">{s.name}</span>
                      <span className="text-[10px] font-mono">{s.portfolioWeight.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Individual stock cards */}
          <div className="space-y-3">
            {[...STOCK_HOLDINGS].sort((a, b) => b.current - a.current).map((s, si) => {
              const priceDiff = s.ltp != null && s.avgCost != null ? s.ltp - s.avgCost : null;
              const priceDiffPct = priceDiff != null && s.avgCost != null ? (priceDiff / s.avgCost) * 100 : null;
              const CARD_COLORS = ["#3b82f6","#6366f1","#22c55e","#f97316","#a855f7"];
              const cardColor = CARD_COLORS[si % CARD_COLORS.length];
              const gainPct = Math.min(100, Math.abs(s.pnlPct) * 3);
              return (
                <Card key={s.name} className="overflow-hidden">
                  <div className="h-0.5 w-full" style={{ backgroundColor: cardColor }} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: cardColor }}>
                        {s.name.slice(0, 2)}
                      </div>
                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-sm">{s.name}</p>
                              <Badge variant="outline" className="text-[9px] px-1.5">{s.type}</Badge>
                              {s.dailyChangePct != null && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.dailyChangePct >= 0 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                                  {s.dailyChangePct >= 0 ? "▲" : "▼"} {Math.abs(s.dailyChangePct).toFixed(2)}% today
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {s.qty != null ? `${s.qty} units` : ""}
                              {s.avgCost != null ? ` · Avg cost ₹${s.avgCost.toFixed(2)}` : ""}
                              {s.ltp != null ? ` · LTP ₹${s.ltp.toFixed(2)}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-base">{format(s.current)}</p>
                            <p className={`text-xs font-mono font-semibold ${s.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              {s.pnl >= 0 ? "+" : ""}{format(Math.abs(s.pnl))}
                              <span className="text-[10px] ml-1">({s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%)</span>
                            </p>
                          </div>
                        </div>

                        {/* Metric grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
                            <p className="text-[9px] text-muted-foreground mb-0.5">Invested</p>
                            <p className="font-mono text-xs font-semibold">{format(s.invested)}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
                            <p className="text-[9px] text-muted-foreground mb-0.5">Portfolio Wt</p>
                            <p className="font-mono text-xs font-semibold">{s.portfolioWeight.toFixed(2)}%</p>
                          </div>
                          {priceDiff != null && (
                            <div className="bg-muted/40 rounded-lg px-2.5 py-2">
                              <p className="text-[9px] text-muted-foreground mb-0.5">Price change/unit</p>
                              <p className={`font-mono text-xs font-semibold ${priceDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                {priceDiff >= 0 ? "+" : ""}₹{priceDiff.toFixed(2)}
                              </p>
                            </div>
                          )}
                          {priceDiffPct != null && (
                            <div className="bg-muted/40 rounded-lg px-2.5 py-2">
                              <p className="text-[9px] text-muted-foreground mb-0.5">Price chg %</p>
                              <p className={`font-mono text-xs font-semibold ${priceDiffPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                {priceDiffPct >= 0 ? "+" : ""}{priceDiffPct.toFixed(2)}%
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Cost vs current visual */}
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
                            <span>Cost basis: {format(s.invested)}</span>
                            <span className={s.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                              {s.pnl >= 0 ? "Gain" : "Loss"}: {format(Math.abs(s.pnl))}
                            </span>
                          </div>
                          <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                            {/* cost bar */}
                            <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: "100%", backgroundColor: cardColor }} />
                            {/* gain/loss overlay */}
                            <div className={`absolute inset-y-0 left-0 rounded-full ${s.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                              style={{ width: `${gainPct}%`, opacity: 0.85 }} />
                            {/* cost marker line */}
                            <div className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: "33%" }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 font-mono">
                            <span>₹0</span>
                            <span className="opacity-50">cost ←→ gain</span>
                            <span>{format(s.current)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stocks total footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border border-border rounded-xl">
            <div>
              <p className="text-xs font-semibold">Total · {STOCK_HOLDINGS.length} holdings</p>
              <p className="text-[10px] text-muted-foreground font-mono">Invested {format(stInvested)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-bold">{format(stCurrent)}</p>
              <p className={`text-xs font-mono font-semibold ${stPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {stPnl >= 0 ? "+" : ""}{format(Math.abs(stPnl))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
