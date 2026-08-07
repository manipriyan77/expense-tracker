"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown, ChevronUp,
  Activity, Zap, BarChart3,
  Search, X, Layers,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { useStocksStore } from "@/store/stocks-store";
import {
  calculateXIRR,
  buildPortfolioCashFlows,
} from "@/lib/utils/investment-returns";

// ── Types ─────────────────────────────────────────────────────────────────────
type MFHolding = {
  name: string; amc: string; category: string; subCategory: string; plan: string;
  nav: number; units: number; invested: number; current: number; weight: number;
  pnl: number; pnlPct: number; xirr: number; since: string;
};
type StockHolding = {
  name: string; type: string; qty: number | null; avgCost: number | null; ltp: number | null;
  portfolioWeight: number; invested: number; current: number; pnl: number; pnlPct: number;
  dailyChange: number | null; dailyChangePct: number | null; xirr: number; since: string;
};

// ── Label maps (enum values → display labels) ──────────────────────────────────
const MF_CATEGORY_LABELS: Record<string, string> = {
  equity: "Equity", debt: "Debt", hybrid: "Hybrid",
  index: "Index", international: "International", other: "Other",
};
const STOCK_TYPE_LABELS: Record<string, string> = {
  large_cap: "Large Cap", mid_cap: "Mid Cap", small_cap: "Small Cap",
  etf: "ETF", other: "Stock",
};
const SUBCAT_ACRONYMS = new Set(["elss", "psu", "fof", "fofs", "etf", "mnc"]);

function prettyCategory(cat?: string): string {
  if (!cat) return "Other";
  return MF_CATEGORY_LABELS[cat] ?? "Other";
}
function prettySubCategory(sub?: string): string {
  if (!sub) return "Other";
  return sub
    .split("_")
    .map((w) => (SUBCAT_ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
// Annualized return (%) for a single holding via XIRR, falling back to absolute return %.
// XIRR annualizes, so over a very short (or unknown) holding period it explodes to
// meaningless values — in that case we fall back to the simple return, and we clamp
// the result to a sane display band regardless.
function holdingReturnPct(invested: number, current: number, purchaseDate: string, pnlPct: number): number {
  if (invested <= 0) return 0;
  const d = purchaseDate ? new Date(purchaseDate) : null;
  const years = d && !isNaN(d.getTime())
    ? (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;
  // Under ~3 months, annualizing is too noisy to be useful — show the absolute return.
  if (years < 0.25) return pnlPct;
  const rate = calculateXIRR(
    buildPortfolioCashFlows([{ investedAmount: invested, currentValue: current, purchaseDate }]),
  );
  if (rate === null || !Number.isFinite(rate)) return pnlPct;
  return Math.max(-99, Math.min(1000, rate * 100));
}

// Palette for distribution bars (warm → cool, mirrors the reference design)
const DIST_PALETTE = ["#f43f5e", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#14b8a6", "#ec4899", "#6366f1", "#64748b"];

type DistGroup = {
  name: string; val: number; pct: number; color: string;
  holdings: { id: string; name: string; kind: "MF" | "Stock"; current: number; pnl: number; pnlPct: number; weight: number }[];
};

export function shortAmount(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

type SortKey = "name" | "invested" | "current" | "pnl" | "pnlPct" | "xirr" | "weight";
type StockSortKey = "name" | "invested" | "current" | "pnl" | "pnlPct" | "portfolioWeight";

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
  Index: "#14b8a6", International: "#ec4899",
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
  const [stockSort, setStockSort] = useState<{ key: StockSortKey; dir: 1 | -1 }>({ key: "current", dir: -1 });
  const [stockTypeFilter, setStockTypeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStock, setExpandedStock] = useState<string | null>(null);

  const { mutualFunds } = useMutualFundsStore();
  const { stocks } = useStocksStore();

  // ── Live holdings (mapped from stores to the display shape) ───────────────────
  const MF_HOLDINGS = useMemo<MFHolding[]>(() => {
    const totalCur = mutualFunds.reduce((s, f) => s + f.currentValue, 0);
    return mutualFunds.map((f) => {
      const pnl = f.currentValue - f.investedAmount;
      const pnlPct = f.investedAmount > 0 ? (pnl / f.investedAmount) * 100 : 0;
      return {
        name: f.name,
        amc: (f.name?.trim().split(/\s+/)[0]) || f.symbol || "—",
        category: prettyCategory(f.category),
        subCategory: prettySubCategory(f.subCategory),
        plan: "Direct", // plan type is not tracked on the record
        nav: f.nav,
        units: f.units,
        invested: f.investedAmount,
        current: f.currentValue,
        weight: totalCur > 0 ? (f.currentValue / totalCur) * 100 : 0,
        pnl,
        pnlPct,
        xirr: holdingReturnPct(f.investedAmount, f.currentValue, f.purchaseDate, pnlPct),
        since: f.purchaseDate,
      };
    });
  }, [mutualFunds]);

  const STOCK_HOLDINGS = useMemo<StockHolding[]>(() => {
    const totalCur = stocks.reduce((s, x) => s + x.currentValue, 0);
    return stocks.map((s) => {
      const pnl = s.currentValue - s.investedAmount;
      const pnlPct = s.investedAmount > 0 ? (pnl / s.investedAmount) * 100 : 0;
      return {
        name: s.symbol || s.name,
        type: STOCK_TYPE_LABELS[s.stockType ?? "other"] ?? "Stock",
        qty: s.shares ?? null,
        avgCost: s.avgPurchasePrice ?? null,
        ltp: s.currentPrice ?? null,
        portfolioWeight: totalCur > 0 ? (s.currentValue / totalCur) * 100 : 0,
        invested: s.investedAmount,
        current: s.currentValue,
        pnl,
        pnlPct,
        dailyChange: null, // intraday change is not tracked
        dailyChangePct: null,
        xirr: holdingReturnPct(s.investedAmount, s.currentValue, s.purchaseDate, pnlPct),
        since: s.purchaseDate,
      };
    });
  }, [stocks]);

  // Safe "best/worst" accessors (arrays may be empty)
  const bestXirrMf = MF_HOLDINGS.length
    ? [...MF_HOLDINGS].sort((a, b) => b.xirr - a.xirr)[0]
    : null;
  const worstXirrMf = MF_HOLDINGS.length
    ? [...MF_HOLDINGS].sort((a, b) => a.xirr - b.xirr)[0]
    : null;
  const bestReturnStock = STOCK_HOLDINGS.length
    ? [...STOCK_HOLDINGS].sort((a, b) => b.pnlPct - a.pnlPct)[0]
    : null;

  if (MF_HOLDINGS.length === 0 && STOCK_HOLDINGS.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-semibold mb-1">No portfolio data yet</p>
          <p className="text-sm text-muted-foreground">
            Add mutual funds or stocks to see your portfolio snapshot.
          </p>
        </CardContent>
      </Card>
    );
  }

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
  if (stCurrent > 0) catMap["Stocks/ETFs"] = stCurrent;
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

  // ── Health ───────────────────────────────────────────────────────────────────
  const mfCount      = MF_HOLDINGS.length;
  const greenFunds   = MF_HOLDINGS.filter((f) => f.xirr > 0).length;
  const directPct    = mfCount > 0 ? (MF_HOLDINGS.filter((f) => f.plan === "Direct").length / mfCount) * 100 : 0;
  const avgXirr      = mfCount > 0 ? MF_HOLDINGS.reduce((s, f) => s + f.xirr, 0) / mfCount : 0;
  const maxSectorPct = sectorItems.length ? Math.max(...sectorItems.map((s) => s.pct)) : 0;
  const diversScore  = Math.round(Math.max(0, 100 - maxSectorPct));
  const profitPct    = mfCount > 0 ? (greenFunds / mfCount) * 100 : 0;
  const healthScore  = Math.round((profitPct * 0.6) + (diversScore * 0.4));
  const healthColor  = healthScore >= 70 ? "#22c55e" : healthScore >= 45 ? "#f59e0b" : "#ef4444";

  // ── MF table ─────────────────────────────────────────────────────────────────
  const categories = ["All", ...Array.from(new Set(MF_HOLDINGS.map((f) => f.category)))];
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredMF = [...MF_HOLDINGS]
    .filter((f) => mfFilter === "All" || f.category === mfFilter)
    .filter((f) => !searchLower || f.name.toLowerCase().includes(searchLower) || f.amc.toLowerCase().includes(searchLower))
    .sort((a, b) => (a[mfSort.key] as number) > (b[mfSort.key] as number) ? mfSort.dir : -mfSort.dir);

  // ── Stocks tab: filter / search / sort ────────────────────────────────────────
  const stockTypes = ["All", ...Array.from(new Set(STOCK_HOLDINGS.map((s) => s.type)))];
  const filteredStocks = [...STOCK_HOLDINGS]
    .filter((s) => stockTypeFilter === "All" || s.type === stockTypeFilter)
    .filter((s) => !searchLower || s.name.toLowerCase().includes(searchLower))
    .sort((a, b) => (a[stockSort.key] as number) > (b[stockSort.key] as number) ? stockSort.dir : -stockSort.dir);

  function toggleStockSort(key: StockSortKey) {
    setStockSort((prev) => prev.key === key ? { key, dir: prev.dir === -1 ? 1 : -1 } : { key, dir: -1 });
  }

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

  // ════════════════════════════════════════════════════════════════════════════
  // ADVANCED ANALYTICS  (cross-sectional — no historical time-series stored)
  // NB: plain consts, not hooks — this runs after the empty-state early return.
  // ════════════════════════════════════════════════════════════════════════════
  const NOW = new Date();
  const monthsBetween = (since: string): number | null => {
    if (!since) return null;
    const d = new Date(since);
    if (isNaN(d.getTime())) return null;
    return Math.max(0, Math.round((NOW.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
  };

  type UH = {
    id: string; name: string; kind: "MF" | "Stock"; group: string; sub: string; amc: string;
    invested: number; current: number; pnl: number; pnlPct: number; xirr: number;
    weight: number; monthsHeld: number | null;
  };
  const unified: UH[] = [
    ...MF_HOLDINGS.map((f) => ({
      id: `mf:${f.name}`, name: f.name, kind: "MF" as const, group: f.category, sub: f.subCategory, amc: f.amc,
      invested: f.invested, current: f.current, pnl: f.pnl, pnlPct: f.pnlPct, xirr: f.xirr,
      weight: totalCurrent > 0 ? (f.current / totalCurrent) * 100 : 0, monthsHeld: monthsBetween(f.since),
    })),
    ...STOCK_HOLDINGS.map((s) => ({
      id: `st:${s.name}`, name: s.name, kind: "Stock" as const, group: s.type, sub: s.type, amc: "Stocks & ETFs",
      invested: s.invested, current: s.current, pnl: s.pnl, pnlPct: s.pnlPct, xirr: s.xirr,
      weight: totalCurrent > 0 ? (s.current / totalCurrent) * 100 : 0, monthsHeld: monthsBetween(s.since),
    })),
  ];

  // ── Performance attribution & leaderboards ────────────────────────────────────
  const byXirr = [...unified].sort((a, b) => b.xirr - a.xirr);
  const bestXirrAll = byXirr.slice(0, 5);
  const worstXirrAll = [...byXirr].reverse().slice(0, 5);
  const totalAbsPnl = unified.reduce((s, h) => s + Math.abs(h.pnl), 0);
  const contributions = [...unified]
    .map((h) => ({ ...h, contribPct: totalAbsPnl > 0 ? (h.pnl / totalAbsPnl) * 100 : 0 }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 8);
  const maxAbsContrib = Math.max(1, ...contributions.map((c) => Math.abs(c.pnl)));

  // ── Risk & concentration ──────────────────────────────────────────────────────
  const hhi = unified.reduce((s, h) => { const w = h.current / (totalCurrent || 1); return s + w * w; }, 0); // 0..1
  const effectiveN = hhi > 0 ? 1 / hhi : 0;
  const byWeight = [...unified].sort((a, b) => b.weight - a.weight);
  const topWeight = byWeight[0]?.weight ?? 0;
  const top5Weight = byWeight.slice(0, 5).reduce((s, h) => s + h.weight, 0);
  // NB: composite diversification score (diversityPct + divComponents) is computed
  // further down, once asset-class / sector / market-cap distributions are available.

  const amcOfTotal = Object.entries(
    MF_HOLDINGS.reduce<Record<string, number>>((m, f) => { m[f.amc] = (m[f.amc] || 0) + f.current; return m; }, {}),
  ).map(([amc, cur]) => ({ amc, pct: totalCurrent > 0 ? (cur / totalCurrent) * 100 : 0 })).sort((a, b) => b.pct - a.pct);
  const topAmc = amcOfTotal[0] ?? null;
  const topSector = sectorItems[0] ?? null;

  const classMap: Record<string, number> = { Equity: 0, Debt: 0, Hybrid: 0, Other: 0 };
  MF_HOLDINGS.forEach((f) => {
    if (f.category === "Debt") classMap.Debt += f.current;
    else if (f.category === "Hybrid") classMap.Hybrid += f.current;
    else if (f.category === "Equity" || f.category === "Index" || f.category === "International") classMap.Equity += f.current;
    else classMap.Other += f.current;
  });
  classMap.Equity += stCurrent; // stocks & ETFs counted as equity exposure
  const assetClassItems = (["Equity", "Hybrid", "Debt", "Other"] as const)
    .map((k) => ({ name: k, val: classMap[k], pct: totalCurrent > 0 ? (classMap[k] / totalCurrent) * 100 : 0 }))
    .filter((c) => c.val > 0);
  const equityPct = totalCurrent > 0 ? (classMap.Equity / totalCurrent) * 100 : 0;

  const warnings: { level: "warn" | "info" | "good"; text: string }[] = [];
  if (topWeight > 25 && byWeight[0]) warnings.push({ level: "warn", text: `${byWeight[0].name} is ${topWeight.toFixed(1)}% of the portfolio — high single-holding concentration.` });
  if (topSector && topSector.pct > 30) warnings.push({ level: "warn", text: `${topSector.sector} is ${topSector.pct.toFixed(1)}% of the portfolio — heavy sector concentration.` });
  if (topAmc && topAmc.pct > 35) warnings.push({ level: "warn", text: `${topAmc.pct.toFixed(1)}% of holdings sit with a single AMC (${topAmc.amc}).` });
  if (equityPct > 85) warnings.push({ level: "info", text: `Equity exposure is ${equityPct.toFixed(0)}% — an aggressive allocation.` });
  if (effectiveN < 5 && unified.length >= 6) warnings.push({ level: "warn", text: `Effective diversification ≈ ${effectiveN.toFixed(1)} holdings despite ${unified.length} positions.` });
  if (warnings.length === 0) warnings.push({ level: "good", text: "No major concentration risks detected — the portfolio looks reasonably diversified." });

  // ── Holdings distribution (by category & by market cap) ───────────────────────
  const buildDistribution = (keyOf: (h: UH) => string): DistGroup[] => {
    const map: Record<string, DistGroup> = {};
    unified.forEach((h) => {
      const k = keyOf(h) || "Others";
      if (!map[k]) map[k] = { name: k, val: 0, pct: 0, color: "", holdings: [] };
      map[k].val += h.current;
      map[k].holdings.push({ id: h.id, name: h.name, kind: h.kind, current: h.current, pnl: h.pnl, pnlPct: h.pnlPct, weight: h.weight });
    });
    return Object.values(map)
      .map((g) => ({ ...g, pct: totalCurrent > 0 ? (g.val / totalCurrent) * 100 : 0 }))
      .sort((a, b) => b.val - a.val)
      .map((g, i) => ({ ...g, color: DIST_PALETTE[i % DIST_PALETTE.length] }));
  };
  const distByAmc = buildDistribution((h) => h.amc);

  // ── Composite diversification score ───────────────────────────────────────────
  // A real "diversification" number must reward spread ACROSS asset classes, sectors
  // and market caps — not just owning many holdings. Each dimension is scored by how
  // close it is to an even split (normalized inverse-HHI), then blended. So 90% in a
  // single asset class drags the score down even with dozens of holdings.
  const evenSplitDiv = (vals: number[]): number => {
    const nz = vals.filter((v) => v > 0);
    const n = nz.length;
    if (n <= 1) return 0; // single bucket → no diversification on this axis
    const tot = nz.reduce((s, v) => s + v, 0);
    const h = nz.reduce((s, v) => { const w = v / tot; return s + w * w; }, 0);
    const minH = 1 / n; // HHI of a perfectly even split
    return Math.max(0, Math.min(100, ((1 - h) / (1 - minH)) * 100));
  };
  const classDiv = evenSplitDiv(assetClassItems.map((c) => c.val));
  const sectorDiv = evenSplitDiv(sectorItems.map((s) => s.current));
  const amcDiv = evenSplitDiv(distByAmc.map((g) => g.val));
  const holdingDiv = evenSplitDiv(unified.map((h) => h.current));
  const divComponents = [
    { label: "Asset class", score: classDiv, weight: 0.35, hint: `${equityPct.toFixed(0)}% equity` },
    { label: "Sector", score: sectorDiv, weight: 0.25, hint: topSector ? `top ${topSector.pct.toFixed(0)}%` : "—" },
    { label: "Fund house", score: amcDiv, weight: 0.20, hint: distByAmc[0] ? `top ${distByAmc[0].pct.toFixed(0)}%` : "—" },
    { label: "Holdings", score: holdingDiv, weight: 0.20, hint: `${unified.length} positions` },
  ];
  const diversityPct = Math.round(divComponents.reduce((s, c) => s + c.score * c.weight, 0));

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
            { label: "Value", val: format(totalCurrent), sub: NOW.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), cls: "text-white" },
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
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {(["overview", "mf", "stocks"] as const).map((v) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 whitespace-nowrap py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${activeView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {v === "overview" ? "Overview"
              : v === "mf" ? `Mutual Funds (${MF_HOLDINGS.length})`
              : `Stocks & ETFs (${STOCK_HOLDINGS.length})`}
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
              { label: "Best XIRR", val: bestXirrMf ? `${bestXirrMf.xirr >= 0 ? "+" : ""}${bestXirrMf.xirr.toFixed(2)}%` : "—", sub: bestXirrMf ? bestXirrMf.name.split(" ").slice(0, 3).join(" ") : "no funds", pos: (bestXirrMf?.xirr ?? 0) >= 0, bar: 100, color: "bg-green-500" },
              { label: "Worst XIRR", val: worstXirrMf ? `${worstXirrMf.xirr.toFixed(2)}%` : "—", sub: worstXirrMf ? worstXirrMf.name.split(" ").slice(0, 3).join(" ") : "no funds", pos: (worstXirrMf?.xirr ?? 0) >= 0, bar: worstXirrMf ? Math.min(100, Math.abs(worstXirrMf.xirr) * 5) : 0, color: "bg-red-500" },
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

          {/* Allocation: donut + AMC invested vs current */}
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

            {/* AMC bar chart */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">AMC Invested vs Current (₹K)</p>
              </CardHeader>
              <CardContent className="px-2 pt-3 pb-2">
                <ResponsiveContainer width="100%" height={200}>
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

          {/* Controls: search + filter pills + group by */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className="relative w-full max-w-48 shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search funds or AMC…"
                  className="w-full h-6 pl-6 pr-6 rounded-full border border-border bg-muted/40 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setMfFilter(cat)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${mfFilter === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
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
                      <React.Fragment key={`grp-${groupName}`}>
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
                            <React.Fragment key={f.name}>
                              <tr className={`border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${rowBg}`} onClick={() => setExpandedFund(isExpanded ? null : f.name)}>
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
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
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
                        avg {(filteredMF.length ? filteredMF.reduce((s, f) => s + f.xirr, 0) / filteredMF.length : 0).toFixed(2)}% XIRR
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
              { label: "P&L", val: `${stPnl >= 0 ? "+" : ""}${format(Math.abs(stPnl))}`, sub: `${stInvested > 0 ? (stPnl / stInvested * 100).toFixed(2) : "0.00"}% return`, cls: stPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
              { label: "Best Return", val: bestReturnStock ? `${bestReturnStock.pnlPct >= 0 ? "+" : ""}${bestReturnStock.pnlPct.toFixed(2)}%` : "—", sub: bestReturnStock ? bestReturnStock.name : "no holdings" },
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

          {/* Portfolio weight bar — top holdings individually, the long tail grouped as "Others"
              so colors don't repeat and small positions don't collapse into unreadable slivers */}
          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Portfolio Weight Distribution</p>
            </CardHeader>
            <CardContent className="px-4 py-3">
              {(() => {
                const TOP_N = 8;
                const sorted = [...STOCK_HOLDINGS].sort((a, b) => b.portfolioWeight - a.portfolioWeight);
                const top = sorted.slice(0, TOP_N);
                const rest = sorted.slice(TOP_N);
                const others = rest.length > 0
                  ? {
                      name: `Others (${rest.length})`,
                      portfolioWeight: rest.reduce((s, x) => s + x.portfolioWeight, 0),
                      current: rest.reduce((s, x) => s + x.current, 0),
                      isGroup: true,
                      members: rest.map((x) => x.name),
                    }
                  : null;
                const slices = others ? [...top, others] : top;
                return (
                  <>
                    <div className="flex h-6 w-full rounded-lg overflow-hidden gap-0.5">
                      {slices.map((s, i) => (
                        <div key={s.name} style={{ width: `${s.portfolioWeight}%`, backgroundColor: DIST_PALETTE[i % DIST_PALETTE.length] }}
                          className="flex items-center justify-center" title={`${s.name}: ${s.portfolioWeight.toFixed(1)}%`}>
                          {s.portfolioWeight > 8 && <span className="text-[9px] font-bold text-white truncate px-1">{s.name}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-x-4 gap-y-1.5 flex-wrap mt-2">
                      {slices.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-1.5" title={"members" in s ? s.members.join(", ") : undefined}>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DIST_PALETTE[i % DIST_PALETTE.length] }} />
                          <span className="text-[10px] text-muted-foreground">{s.name}</span>
                          <span className="text-[10px] font-mono">{s.portfolioWeight.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Controls: search + type filter + sort */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className="relative w-full max-w-48 shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stocks…"
                  className="w-full h-6 pl-6 pr-6 rounded-full border border-border bg-muted/40 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {stockTypes.map((t) => (
                  <button key={t} onClick={() => setStockTypeFilter(t)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${stockTypeFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>Sort:</span>
              {(
                [
                  { key: "current" as const, label: "Value" },
                  { key: "pnl" as const, label: "P&L" },
                  { key: "pnlPct" as const, label: "P&L %" },
                  { key: "portfolioWeight" as const, label: "Weight" },
                ]
              ).map((opt) => (
                <button key={opt.key} onClick={() => toggleStockSort(opt.key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors inline-flex items-center gap-0.5 ${stockSort.key === opt.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {opt.label}
                  {stockSort.key === opt.key && <SortIcon active dir={stockSort.dir} />}
                </button>
              ))}
            </div>
          </div>

          {/* Stock holdings — compact expandable table (matches the MF tab's density) */}
          <Card>
            <CardContent className="p-0">
              {filteredStocks.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No stocks match your search/filter.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-6"></th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Stock</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell whitespace-nowrap">Qty</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell whitespace-nowrap">Avg Cost</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell whitespace-nowrap">LTP</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Invested</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Current</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">P&L</th>
                        <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.map((s, si) => {
                        const isExpanded = expandedStock === s.name;
                        const color = DIST_PALETTE[si % DIST_PALETTE.length];
                        const priceDiff = s.ltp != null && s.avgCost != null ? s.ltp - s.avgCost : null;
                        const rowBg = s.pnlPct > 10 ? "bg-green-50/30 dark:bg-green-950/10" : s.pnlPct < -10 ? "bg-red-50/30 dark:bg-red-950/10" : "";
                        return (
                          <React.Fragment key={s.name}>
                            <tr
                              className={`border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${rowBg}`}
                              onClick={() => setExpandedStock(isExpanded ? null : s.name)}
                            >
                              <td className="px-4 py-2.5 text-muted-foreground">
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium truncate max-w-32">{s.name}</p>
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{s.type}</Badge>
                                    </div>
                                    {s.dailyChangePct != null && (
                                      <p className={`text-[9px] font-semibold ${s.dailyChangePct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                        {s.dailyChangePct >= 0 ? "▲" : "▼"} {Math.abs(s.dailyChangePct).toFixed(2)}% today
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground hidden lg:table-cell whitespace-nowrap">{s.qty ?? "—"}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground hidden lg:table-cell whitespace-nowrap">{s.avgCost != null ? `₹${s.avgCost.toFixed(2)}` : "—"}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground hidden lg:table-cell whitespace-nowrap">{s.ltp != null ? `₹${s.ltp.toFixed(2)}` : "—"}</td>
                              <td className="px-3 py-2.5 text-right font-mono">{format(s.invested)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold">{format(s.current)}</td>
                              <td className={`px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap ${s.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                                {s.pnl >= 0 ? "+" : ""}{format(s.pnl)}
                                <span className="block text-[9px] font-normal text-muted-foreground">
                                  {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-3 py-2.5 hidden sm:table-cell">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.portfolioWeight * 4)}%`, backgroundColor: color }} />
                                  </div>
                                  <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{s.portfolioWeight.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-b border-border bg-muted/20">
                                <td colSpan={9} className="px-6 py-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                                    <div>
                                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Quantity</p>
                                      <p className="font-mono text-sm font-semibold">{s.qty ?? "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Avg Cost</p>
                                      <p className="font-mono text-sm font-semibold">{s.avgCost != null ? `₹${s.avgCost.toFixed(2)}` : "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">LTP</p>
                                      <p className="font-mono text-sm font-semibold">{s.ltp != null ? `₹${s.ltp.toFixed(2)}` : "—"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Price chg/unit</p>
                                      <p className={`font-mono text-sm font-semibold ${priceDiff != null && priceDiff >= 0 ? "text-green-600 dark:text-green-400" : priceDiff != null ? "text-red-500" : ""}`}>
                                        {priceDiff != null ? `${priceDiff >= 0 ? "+" : ""}₹${priceDiff.toFixed(2)}` : "—"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-[9px] text-muted-foreground mb-1">
                                    <span>Cost basis {format(s.invested)}</span>
                                    <span>→</span>
                                    <span className={s.pnl >= 0 ? "text-green-500" : "text-red-500"}>Current {format(s.current)}</span>
                                  </div>
                                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20" style={{ width: "100%" }} />
                                    <div className={`absolute inset-y-0 left-0 rounded-full ${s.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                                      style={{ width: `${Math.min(100, (s.current / (s.invested * 1.5)) * 100)}%` }} />
                                    <div className="absolute inset-y-0 rounded-full bg-foreground/40 w-0.5"
                                      style={{ left: `${Math.min(99, (s.invested / (s.invested * 1.5)) * 100)}%` }} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stocks total footer — reflects the current filter/search */}
          {(() => {
            const fInvested = filteredStocks.reduce((s, x) => s + x.invested, 0);
            const fCurrent = filteredStocks.reduce((s, x) => s + x.current, 0);
            const fPnl = fCurrent - fInvested;
            const isFiltered = stockTypeFilter !== "All" || searchLower.length > 0;
            return (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border border-border rounded-xl">
                <div>
                  <p className="text-xs font-semibold">
                    {isFiltered ? "Shown" : "Total"} · {filteredStocks.length} holding{filteredStocks.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">Invested {format(fInvested)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold">{format(fCurrent)}</p>
                  <p className={`text-xs font-mono font-semibold ${fPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {fPnl >= 0 ? "+" : ""}{format(Math.abs(fPnl))}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════
          ANALYTICS (rendered within the Overview tab)
      ══════════════════════════════════════ */}
      {activeView === "overview" && (
        <div className="space-y-4">

          {/* ─ Health gauge + concentration & risk ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                    { label: "Diversification", val: `${diversityPct}/100`, score: diversityPct, color: "#3b82f6", icon: <Activity className="h-3 w-3" /> },
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

            {/* Concentration & risk */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Concentration & Risk</p>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 mb-1 border-b border-border">
                  {[
                    { label: "Effective Holdings", val: effectiveN.toFixed(1), sub: `of ${unified.length} positions` },
                    { label: "Top Holding", val: `${topWeight.toFixed(1)}%`, sub: byWeight[0]?.name ?? "—" },
                    { label: "Top 5 Weight", val: `${top5Weight.toFixed(1)}%`, sub: "of portfolio" },
                    { label: "Equity Exposure", val: `${equityPct.toFixed(0)}%`, sub: equityPct > 85 ? "aggressive" : "balanced" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                      <p className="font-mono font-bold text-sm">{s.val}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-border/60">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2">
                      {w.level === "good" ? (
                        <Zap className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      ) : w.level === "info" ? (
                        <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs leading-relaxed">{w.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─ Diversification breakdown — why the score is what it is ─ */}
          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Diversification Breakdown</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {diversityPct}/100 composite score · each dimension scored on how evenly spread it is, then weighted
              </p>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-3">
              {divComponents.map((c) => {
                const color = c.score >= 70 ? "#22c55e" : c.score >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={c.label} className="grid items-center gap-3" style={{ gridTemplateColumns: "110px minmax(0,1fr) 48px 90px" }}>
                    <span className="text-[11px] font-medium truncate">{c.label}</span>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-right" style={{ color }}>{Math.round(c.score)}</span>
                    <span className="text-[9px] text-muted-foreground text-right truncate" title={c.hint}>{c.hint}</span>
                  </div>
                );
              })}
              <p className="text-[9px] text-muted-foreground pt-1 border-t border-border/60">
                Weighted: asset class 35% · sector 25% · fund house 20% · holdings 20%
              </p>
            </CardContent>
          </Card>

          {/* ─ Contribution to total P&L ─ */}
          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Contribution to Portfolio P&L</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Which positions move the needle most · {format(totalPnl)} net</p>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-1.5">
              {contributions.map((c) => {
                const w = (Math.abs(c.pnl) / maxAbsContrib) * 100;
                const pos = c.pnl >= 0;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-24 sm:w-40 shrink-0 truncate text-[11px]" title={c.name}>{c.name}</div>
                    <div className="flex-1 flex items-center">
                      <div className="flex-1 flex justify-end"><div className="h-3 rounded-l-sm bg-red-500/80" style={{ width: `${pos ? 0 : w}%` }} /></div>
                      <div className="w-px h-4 bg-border shrink-0" />
                      <div className="flex-1"><div className="h-3 rounded-r-sm bg-green-500/80" style={{ width: `${pos ? w : 0}%` }} /></div>
                    </div>
                    <div className={`w-24 text-right font-mono text-[11px] shrink-0 ${pos ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{pos ? "+" : ""}{format(c.pnl)}</div>
                    <div className="w-12 text-right font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:block">{c.contribPct >= 0 ? "+" : ""}{c.contribPct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* ─ Best / Worst annualized (XIRR) ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[{ title: "Best Annualized (XIRR)", list: bestXirrAll, good: true }, { title: "Worst Annualized (XIRR)", list: worstXirrAll, good: false }].map((blk) => (
              <Card key={blk.title}>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{blk.title}</p>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/60">
                  {blk.list.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2">
                      <p className="text-xs font-medium truncate max-w-[200px]">{h.name}</p>
                      <span className={`font-mono text-xs font-bold shrink-0 ${h.xirr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{h.xirr >= 0 ? "+" : ""}{h.xirr.toFixed(2)}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
