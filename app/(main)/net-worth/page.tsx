"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useNetWorthStore,
  type Asset,
  type Liability,
} from "@/store/net-worth-store";
import { useGoldStore } from "@/store/gold-store";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { useStocksStore } from "@/store/stocks-store";
import { useForexStore } from "@/store/forex-store";
import { useOtherInvestmentsStore } from "@/store/other-investments-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  Home,
  Car,
  Briefcase,
  CreditCard,
  Trash2,
  Edit,
  MoreVertical,
  ExternalLink,
  Gem,
  Wallet,
  BarChart3,
  Globe,
  Shield,
  Camera,
  Activity,
  PiggyBank,
  Target,
  Zap,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  BadgePercent,
} from "lucide-react";
import Link from "next/link";
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const ALLOCATION_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

export default function NetWorthPage() {
  const { format } = useFormatCurrency();
  const {
    assets,
    liabilities,
    snapshots,
    loading,
    fetchAssets,
    fetchLiabilities,
    fetchSnapshots,
    addAsset,
    addLiability,
    updateAsset,
    updateLiability,
    deleteAsset,
    deleteLiability,
    createSnapshot,
    deleteSnapshot,
  } = useNetWorthStore();

  // Investment / asset modules from other parts of the app
  const { holdings, load: loadGold } = useGoldStore();
  const { mutualFunds, fetchMutualFunds } = useMutualFundsStore();
  const { stocks, fetchStocks } = useStocksStore();
  const { entries: forexEntries, load: loadForex } = useForexStore();
  const { investments: otherInvestments, load: loadOtherInvestments } = useOtherInvestmentsStore();
  const { debts, fetchDebts } = useDebtTrackerStore();

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);
  const [isEditLiabilityOpen, setIsEditLiabilityOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<Liability | null>(
    null,
  );

  // Form states for adding assets/liabilities
  const [assetForm, setAssetForm] = useState<{
    name: string;
    type: "cash" | "bank" | "investment" | "property" | "vehicle" | "other";
    value: string;
    currency: string;
    notes: string;
  }>({
    name: "",
    type: "cash",
    value: "",
    currency: "INR",
    notes: "",
  });

  const [liabilityForm, setLiabilityForm] = useState<{
    name: string;
    type: "credit_card" | "loan" | "mortgage" | "other";
    balance: string;
    interest_rate: string;
    minimum_payment: string;
    due_date: string;
    currency: string;
    notes: string;
  }>({
    name: "",
    type: "credit_card",
    balance: "",
    interest_rate: "",
    minimum_payment: "",
    due_date: "",
    currency: "INR",
    notes: "",
  });

  useEffect(() => {
    fetchAssets();
    fetchLiabilities();
    fetchSnapshots();
    // Load asset data from other modules so it's included in net worth
    loadGold();
    fetchMutualFunds();
    fetchStocks();
    loadForex();
    loadOtherInvestments();
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assets tracked directly in the net worth module
  const totalManualAssets = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.value, 0),
    [assets],
  );

  // Assets tracked in dedicated modules (gold, mutual funds, stocks, forex)
  const externalAssetsTotal = useMemo(() => {
    const goldValue = holdings.reduce(
      (sum, h) => sum + h.quantityGrams * h.currentPricePerGram,
      0,
    );
    const mfValue = mutualFunds.reduce((sum, f) => sum + f.currentValue, 0);
    const stockValue = stocks.reduce((sum, s) => sum + s.currentValue, 0);

    // Forex value: deposits - withdrawals + P&L
    const forexValue = forexEntries.reduce((sum, entry) => {
      if (entry.type === "deposit") {
        return sum + entry.amount;
      } else if (entry.type === "withdrawal") {
        return sum - entry.amount;
      } else if (entry.type === "pnl") {
        return sum + entry.amount; // P&L can be positive or negative
      }
      return sum;
    }, 0);

    const otherValue = otherInvestments.reduce((sum, x) => sum + x.currentValue, 0);
    return goldValue + mfValue + stockValue + forexValue + otherValue;
  }, [holdings, mutualFunds, stocks, forexEntries, otherInvestments]);

  const totalAssets = totalManualAssets + externalAssetsTotal;
  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + liability.balance,
    0,
  );
  const netWorth = totalAssets - totalLiabilities;

  // Asset breakdown by category for drill-down
  const assetBreakdown = useMemo(() => {
    const goldValue = holdings.reduce(
      (sum, h) => sum + h.quantityGrams * h.currentPricePerGram,
      0,
    );
    const mfValue = mutualFunds.reduce((sum, f) => sum + f.currentValue, 0);
    const stockValue = stocks.reduce((sum, s) => sum + s.currentValue, 0);

    // Forex value: deposits - withdrawals + P&L
    const forexValue = forexEntries.reduce((sum, entry) => {
      if (entry.type === "deposit") {
        return sum + entry.amount;
      } else if (entry.type === "withdrawal") {
        return sum - entry.amount;
      } else if (entry.type === "pnl") {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    // Always include all categories so Gold and others appear in the breakdown even when 0
    return [
      { name: "Gold", value: goldValue, href: "/gold", icon: Gem },
      {
        name: "Mutual Funds",
        value: mfValue,
        href: "/mutual-funds",
        icon: Wallet,
      },
      { name: "Stocks", value: stockValue, href: "/stocks", icon: BarChart3 },
      { name: "Forex", value: forexValue, href: "/forex", icon: Globe },
      { name: "Other Investments", value: otherInvestments.reduce((sum, x) => sum + x.currentValue, 0), href: "/investments", icon: Briefcase },
      {
        name: "Other Assets",
        value: totalManualAssets,
        href: null,
        icon: DollarSign,
      },
    ];
  }, [holdings, mutualFunds, stocks, forexEntries, otherInvestments, totalManualAssets]);

  // Allocation tab: investment breakdown by category/sector
  const allocationItems = useMemo(() => {
    return assetBreakdown.filter((i) => i.value > 0);
  }, [assetBreakdown]);

  const mutualFundCategories = useMemo(() => {
    const totals = mutualFunds.reduce<Record<string, number>>((acc, fund) => {
      const key = fund.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + fund.currentValue;
      return acc;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ name, value })).filter((i) => i.value > 0);
  }, [mutualFunds]);

  const stockSectors = useMemo(() => {
    const totals = stocks.reduce<Record<string, number>>((acc, stock) => {
      const key = stock.sector || "Uncategorized";
      acc[key] = (acc[key] || 0) + stock.currentValue;
      return acc;
    }, {});
    return Object.entries(totals).map(([name, value]) => ({ name, value })).filter((i) => i.value > 0);
  }, [stocks]);

  // ── Goal tracking (localStorage) ──
  const [goalAmount, setGoalAmount] = useState<number>(0);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("nw_goal");
    if (stored) setGoalAmount(parseFloat(stored));
  }, []);

  const saveGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      setGoalAmount(val);
      localStorage.setItem("nw_goal", String(val));
      setGoalDialogOpen(false);
      toast.success("Goal saved!");
    }
  };

  const goalProgress = goalAmount > 0 ? Math.min((netWorth / goalAmount) * 100, 100) : 0;

  // ── Net worth trend: from Jan 2026 only, up to 6 months (snapshot or current net worth)
  const NET_WORTH_START_YEAR = 2026;
  const NET_WORTH_START_MONTH = 2; // March

  const historicalData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(NET_WORTH_START_YEAR, NET_WORTH_START_MONTH, 1);
    const months: {
      month: string;
      monthKey: string;
      netWorth: number;
      sourceLabel: string;
    }[] = [];
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const endDate = now >= startDate ? now : new Date(2026, 5, 1);
    const monthCount =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1;
    const fromMonth = Math.max(0, monthCount - 6);

    for (let i = fromMonth; i < monthCount && months.length < 6; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      const monthLabel = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      // Use the LATEST snapshot in the month (not the earliest), so that
      // a bad early-month snapshot is overridden by a later, more complete one.
      const snapshotsInMonth = sortedSnapshots.filter((s) => {
        const sDate = new Date(s.date);
        return sDate >= d && sDate <= endOfMonth;
      });
      const snapshotInMonth = snapshotsInMonth.at(-1);
      const lastSnapshotBefore = sortedSnapshots.filter(
        (s) => new Date(s.date) <= endOfMonth,
      );
      const latestBefore = lastSnapshotBefore[lastSnapshotBefore.length - 1];
      const isCurrentMonth =
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      let value: number;
      let sourceLabel: string;
      // Current month always uses live net worth (today's calculation)
      if (isCurrentMonth) {
        value = netWorth;
        sourceLabel = "Current net worth (Assets − Liabilities today)";
      } else if (snapshotInMonth) {
        value = snapshotInMonth.net_worth;
        const snapDate = new Date(snapshotInMonth.date);
        sourceLabel = `Snapshot on ${snapDate.toLocaleDateString("en-US", {
          dateStyle: "medium",
        })}`;
      } else if (latestBefore) {
        value = latestBefore.net_worth;
        const snapDate = new Date(latestBefore.date);
        sourceLabel = `Carried from snapshot on ${snapDate.toLocaleDateString(
          "en-US",
          { dateStyle: "medium" },
        )}`;
      } else {
        value = netWorth;
        sourceLabel = "Current net worth (no snapshot yet)";
      }

      months.push({
        month: monthLabel,
        monthKey,
        netWorth: value,
        sourceLabel,
      });
    }

    return months;
  }, [snapshots, netWorth]);

  // Month-over-month delta
  const momDelta = useMemo(() => {
    if (historicalData.length < 2) return null;
    const prev = historicalData[historicalData.length - 2].netWorth;
    const curr = historicalData[historicalData.length - 1].netWorth;
    const abs = curr - prev;
    const pct = prev !== 0 ? (abs / Math.abs(prev)) * 100 : 0;
    return { abs, pct };
  }, [historicalData]);

  // Projected trend: extrapolate 3 months forward using avg monthly change
  const chartData = useMemo(() => {
    const historical = historicalData.map((d, i) => ({
      month: d.month,
      actual: d.netWorth,
      projected: i === historicalData.length - 1 ? d.netWorth : undefined,
      sourceLabel: d.sourceLabel,
    }));

    if (historicalData.length < 2) return historical;

    const changes = historicalData.slice(1).map((d, i) => d.netWorth - historicalData[i].netWorth);
    const avgChange = changes.reduce((s, c) => s + c, 0) / changes.length;
    const lastNW = historicalData[historicalData.length - 1].netWorth;
    const lastDate = new Date();

    const projected = [1, 2, 3].map((offset) => {
      const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + offset, 1);
      return {
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        actual: undefined,
        projected: lastNW + avgChange * offset,
        sourceLabel: "Projected",
      };
    });

    return [...historical, ...projected];
  }, [historicalData]);

  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Liquidity breakdown
  const liquidityData = useMemo(() => {
    const mfValue = mutualFunds.reduce((s, f) => s + f.currentValue, 0);
    const stockValue = stocks.reduce((s, s2) => s + s2.currentValue, 0);
    const forexValue = forexEntries.reduce((sum, e) => {
      if (e.type === "deposit") return sum + e.amount;
      if (e.type === "withdrawal") return sum - e.amount;
      if (e.type === "pnl") return sum + e.amount;
      return sum;
    }, 0);
    const cashBank = assets.filter((a) => a.type === "cash" || a.type === "bank").reduce((s, a) => s + a.value, 0);
    const goldValue = holdings.reduce((s, h) => s + h.quantityGrams * h.currentPricePerGram, 0);
    const otherValue = otherInvestments.reduce((s, x) => s + x.currentValue, 0);
    const illiquid = assets.filter((a) => a.type === "property" || a.type === "vehicle").reduce((s, a) => s + a.value, 0);
    const liquid = cashBank + mfValue + stockValue + forexValue;
    const semiLiquid = goldValue + otherValue;
    return { liquid, semiLiquid, illiquid, total: liquid + semiLiquid + illiquid };
  }, [assets, holdings, mutualFunds, stocks, forexEntries, otherInvestments]);

  // Financial health score (0–100)
  const healthScore = useMemo(() => {
    let score = 0;
    // Debt ratio (0–40)
    if (debtRatio < 10) score += 40;
    else if (debtRatio < 20) score += 32;
    else if (debtRatio < 30) score += 24;
    else if (debtRatio < 50) score += 12;
    else score += 0;
    // Liquidity (0–30): liquid % of total assets
    const liquidPct = totalAssets > 0 ? (liquidityData.liquid / totalAssets) * 100 : 0;
    if (liquidPct > 50) score += 30;
    else if (liquidPct > 30) score += 22;
    else if (liquidPct > 15) score += 14;
    else score += 5;
    // Diversification (0–20): number of non-zero asset categories
    const nonZeroCategories = assetBreakdown.filter((i) => i.value > 0).length;
    score += Math.min(nonZeroCategories * 4, 20);
    // MoM growth (0–10)
    if (momDelta && momDelta.pct > 2) score += 10;
    else if (momDelta && momDelta.pct > 0) score += 6;
    else if (momDelta && momDelta.pct > -2) score += 2;
    return Math.min(score, 100);
  }, [debtRatio, liquidityData, assetBreakdown, momDelta, totalAssets]);

  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention";
  const healthColor = healthScore >= 80 ? "text-emerald-500" : healthScore >= 60 ? "text-blue-500" : healthScore >= 40 ? "text-amber-500" : "text-red-500";
  const healthBg = healthScore >= 80 ? "bg-emerald-500" : healthScore >= 60 ? "bg-blue-500" : healthScore >= 40 ? "bg-amber-500" : "bg-red-500";

  // Sub-scores for detailed breakdown
  const healthSubScores = useMemo(() => {
    let debtScore = 0;
    if (debtRatio < 10) debtScore = 40;
    else if (debtRatio < 20) debtScore = 32;
    else if (debtRatio < 30) debtScore = 24;
    else if (debtRatio < 50) debtScore = 12;

    const liquidPct = totalAssets > 0 ? (liquidityData.liquid / totalAssets) * 100 : 0;
    let liquidScore = 5;
    if (liquidPct > 50) liquidScore = 30;
    else if (liquidPct > 30) liquidScore = 22;
    else if (liquidPct > 15) liquidScore = 14;

    const categories = assetBreakdown.filter((i) => i.value > 0).length;
    const divScore = Math.min(categories * 4, 20);

    let growthScore = 0;
    if (momDelta && momDelta.pct > 2) growthScore = 10;
    else if (momDelta && momDelta.pct > 0) growthScore = 6;
    else if (momDelta && momDelta.pct > -2) growthScore = 2;

    return { debtScore, liquidScore, divScore, growthScore };
  }, [debtRatio, liquidityData, assetBreakdown, momDelta, totalAssets]);

  // Health insights
  const healthInsights = useMemo(() => {
    const tips: { text: string; severity: "warn" | "bad" | "good" }[] = [];
    if (debtRatio >= 50) tips.push({ text: "High debt-to-asset ratio. Consider paying down high-interest liabilities first.", severity: "bad" });
    else if (debtRatio >= 30) tips.push({ text: "Debt ratio is moderate. Aim below 30% for a healthier balance sheet.", severity: "warn" });
    else tips.push({ text: "Debt ratio is healthy. Keep liabilities in check as assets grow.", severity: "good" });

    const liquidPct = totalAssets > 0 ? (liquidityData.liquid / totalAssets) * 100 : 0;
    if (liquidPct < 15) tips.push({ text: "Liquid assets are low. Consider keeping 3–6 months of expenses in liquid form.", severity: "bad" });
    else if (liquidPct < 30) tips.push({ text: "Liquidity is fair but could be improved. Maintain a larger liquid buffer.", severity: "warn" });
    else tips.push({ text: "Good liquidity. Liquid assets cover a healthy share of your portfolio.", severity: "good" });

    const cats = assetBreakdown.filter((i) => i.value > 0).length;
    if (cats < 3) tips.push({ text: "Portfolio is concentrated. Diversify across more asset classes to reduce risk.", severity: "warn" });

    if (momDelta && momDelta.pct < 0) tips.push({ text: `Net worth declined ${Math.abs(momDelta.pct).toFixed(1)}% this month. Review expenses or underperforming assets.`, severity: "bad" });

    return tips.slice(0, 3);
  }, [debtRatio, liquidityData, assetBreakdown, momDelta, totalAssets]);

  // Liquidity breakdown with actual items
  const liquidityBreakdown = useMemo(() => {
    const cashBank = assets
      .filter((a) => a.type === "cash" || a.type === "bank")
      .map((a) => ({ name: a.name, value: a.value }));
    const mfValue = mutualFunds.reduce((s, f) => s + f.currentValue, 0);
    const stockValue = stocks.reduce((s, s2) => s + s2.currentValue, 0);
    const forexValue = forexEntries.reduce((sum, e) => {
      if (e.type === "deposit") return sum + e.amount;
      if (e.type === "withdrawal") return sum - e.amount;
      if (e.type === "pnl") return sum + e.amount;
      return sum;
    }, 0);
    const goldValue = holdings.reduce((s, h) => s + h.quantityGrams * h.currentPricePerGram, 0);
    const otherValue = otherInvestments.reduce((s, x) => s + x.currentValue, 0);
    const illiquidAssets = assets
      .filter((a) => a.type === "property" || a.type === "vehicle")
      .map((a) => ({ name: a.name, value: a.value }));

    const liquidItems = [
      ...cashBank,
      ...(mfValue > 0 ? [{ name: "Mutual Funds", value: mfValue }] : []),
      ...(stockValue > 0 ? [{ name: "Stocks", value: stockValue }] : []),
      ...(forexValue > 0 ? [{ name: "Forex", value: forexValue }] : []),
    ];
    const semiItems = [
      ...(goldValue > 0 ? [{ name: "Gold", value: goldValue }] : []),
      ...(otherValue > 0 ? [{ name: "Other Investments", value: otherValue }] : []),
    ];
    const instantLiquid = cashBank.reduce((s, a) => s + a.value, 0);

    return { liquidItems, semiItems, illiquidItems: illiquidAssets, instantLiquid };
  }, [assets, holdings, mutualFunds, stocks, forexEntries, otherInvestments]);

  // Debt analytics
  const debtAnalytics = useMemo(() => {
    const annualInterest = liabilities.reduce((s, l) => {
      if (l.interest_rate) return s + (l.balance * l.interest_rate) / 100;
      return s;
    }, 0);
    const monthlyMinimum = liabilities.reduce((s, l) => s + (l.minimum_payment || 0), 0);
    // Rough payoff months using minimum payment (simplified)
    const payoffEstimates = liabilities
      .filter((l) => l.minimum_payment && l.minimum_payment > 0)
      .map((l) => {
        const rate = (l.interest_rate || 0) / 100 / 12;
        if (rate === 0) return { name: l.name, months: Math.ceil(l.balance / l.minimum_payment!) };
        const n = -Math.log(1 - (rate * l.balance) / l.minimum_payment!) / Math.log(1 + rate);
        return { name: l.name, months: isFinite(n) && n > 0 ? Math.ceil(n) : null };
      });
    return { annualInterest, monthlyMinimum, payoffEstimates };
  }, [liabilities]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAsset({
        name: assetForm.name,
        type: assetForm.type,
        value: parseFloat(assetForm.value),
        currency: assetForm.currency,
        notes: assetForm.notes,
      });
      toast.success("Asset added successfully!");
      setIsAddAssetOpen(false);
      setAssetForm({
        name: "",
        type: "cash",
        value: "",
        currency: "INR",
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to add asset");
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await updateAsset(selectedAsset.id, {
        name: assetForm.name,
        type: assetForm.type,
        value: parseFloat(assetForm.value),
        notes: assetForm.notes,
      });
      toast.success("Asset updated successfully!");
      setIsEditAssetOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      toast.error("Failed to update asset");
    }
  };

  const openEditAssetDialog = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      currency: asset.currency,
      notes: asset.notes || "",
    });
    setIsEditAssetOpen(true);
  };

  const handleAddLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addLiability({
        name: liabilityForm.name,
        type: liabilityForm.type,
        balance: parseFloat(liabilityForm.balance),
        interest_rate: liabilityForm.interest_rate
          ? parseFloat(liabilityForm.interest_rate)
          : undefined,
        minimum_payment: liabilityForm.minimum_payment
          ? parseFloat(liabilityForm.minimum_payment)
          : undefined,
        due_date: liabilityForm.due_date || undefined,
        currency: liabilityForm.currency,
        notes: liabilityForm.notes,
      });
      toast.success("Liability added successfully!");
      setIsAddLiabilityOpen(false);
      setLiabilityForm({
        name: "",
        type: "credit_card",
        balance: "",
        interest_rate: "",
        minimum_payment: "",
        due_date: "",
        currency: "INR",
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to add liability");
    }
  };

  const handleEditLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLiability) return;
    try {
      await updateLiability(selectedLiability.id, {
        name: liabilityForm.name,
        type: liabilityForm.type,
        balance: parseFloat(liabilityForm.balance),
        interest_rate: liabilityForm.interest_rate
          ? parseFloat(liabilityForm.interest_rate)
          : undefined,
        minimum_payment: liabilityForm.minimum_payment
          ? parseFloat(liabilityForm.minimum_payment)
          : undefined,
        due_date: liabilityForm.due_date || undefined,
        notes: liabilityForm.notes,
      });
      toast.success("Liability updated successfully!");
      setIsEditLiabilityOpen(false);
      setSelectedLiability(null);
    } catch (error) {
      toast.error("Failed to update liability");
    }
  };

  const openEditLiabilityDialog = (liability: Liability) => {
    setSelectedLiability(liability);
    setLiabilityForm({
      name: liability.name,
      type: liability.type,
      balance: liability.balance.toString(),
      interest_rate: liability.interest_rate?.toString() || "",
      minimum_payment: liability.minimum_payment?.toString() || "",
      due_date: liability.due_date || "",
      currency: liability.currency,
      notes: liability.notes || "",
    });
    setIsEditLiabilityOpen(true);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "property":
        return <Home className="h-5 w-5" />;
      case "vehicle":
        return <Car className="h-5 w-5" />;
      case "investment":
        return <Briefcase className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getLiabilityIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const financialHealthColor = debtRatio < 30 ? "text-emerald-400" : debtRatio < 60 ? "text-amber-400" : "text-red-400";
  const financialHealthLabel = debtRatio < 30 ? "Healthy" : debtRatio < 60 ? "Moderate" : "High Risk";

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Dark Hero ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-0">
          {/* Net worth + snapshot button */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">
                Net Worth · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight leading-none ${netWorth >= 0 ? "text-white" : "text-red-400"}`}>
                {format(netWorth)}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-xs text-slate-500">Assets − Liabilities</p>
                {momDelta && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${momDelta.abs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {momDelta.abs >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {momDelta.abs >= 0 ? "+" : ""}{momDelta.pct.toFixed(1)}% MoM
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <button
                onClick={() => { setGoalInput(goalAmount > 0 ? String(goalAmount) : ""); setGoalDialogOpen(true); }}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors text-white px-3 py-1.5 rounded-lg"
              >
                <Target className="h-3.5 w-3.5" />
                Goal
              </button>
              <button
                onClick={async () => {
                  try { await createSnapshot(); toast.success("Snapshot saved!"); }
                  catch { toast.error("Failed to save snapshot"); }
                }}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors text-white px-3 py-1.5 rounded-lg"
              >
                <Camera className="h-3.5 w-3.5" />
                Snapshot
              </button>
            </div>
          </div>

          {/* Assets vs Liabilities visual bar */}
          {totalAssets > 0 && (
            <div className="mb-4">
              <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-700">
                <div
                  className="h-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${(totalAssets / (totalAssets + totalLiabilities)) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-700"
                  style={{ width: `${(totalLiabilities / (totalAssets + totalLiabilities)) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Assets {totalAssets > 0 ? `${((totalAssets / (totalAssets + totalLiabilities)) * 100).toFixed(0)}%` : ""}
                </span>
                <span className="text-[10px] text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Liabilities {totalAssets > 0 ? `${((totalLiabilities / (totalAssets + totalLiabilities)) * 100).toFixed(0)}%` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Goal progress */}
          {goalAmount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1"><Target className="h-3 w-3" /> Goal Progress</span>
                <span className="text-[10px] text-slate-400">{format(netWorth)} / {format(goalAmount)} · {goalProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-slate-700">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Assets</p>
              <p className="font-mono text-base font-semibold text-emerald-400">{format(totalAssets)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{assets.length} manual + investments</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Liabilities</p>
              <p className="font-mono text-base font-semibold text-red-400">{format(totalLiabilities)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{liabilities.length} items</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Debt Ratio</p>
              <p className={`font-mono text-base font-semibold ${financialHealthColor}`}>{debtRatio.toFixed(1)}%</p>
              <p className={`text-[10px] mt-0.5 ${financialHealthColor}`}>{financialHealthLabel}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Investments</p>
              <p className="font-mono text-base font-semibold text-blue-400">{format(externalAssetsTotal)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">auto-tracked</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* Net Worth Trend */}
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Worth Trend</p>
                <p className="text-xs text-muted-foreground mt-0.5">Up to 6 months of history</p>
              </div>
              {historicalData.length > 1 && (() => {
                const first = historicalData[0]?.netWorth ?? 0;
                const last = historicalData[historicalData.length - 1]?.netWorth ?? 0;
                const change = last - first;
                const pct = first !== 0 ? (change / Math.abs(first)) * 100 : 0;
                return (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {change >= 0 ? "+" : ""}{pct.toFixed(1)}%
                  </div>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2 px-2">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => {
                    const abs = Math.abs(v);
                    const s = v < 0 ? "-" : "";
                    if (abs >= 1e7) return `${s}₹${(abs/1e7).toFixed(1)}Cr`;
                    if (abs >= 1e5) return `${s}₹${(abs/1e5).toFixed(0)}L`;
                    if (abs >= 1000) return `${s}₹${(abs/1000).toFixed(0)}k`;
                    return `${s}₹${Math.round(abs)}`;
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { month: string; actual?: number; projected?: number; sourceLabel?: string };
                    const val = p.actual ?? p.projected;
                    const isProj = p.actual === undefined;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                        <p className="font-semibold mb-1">{p.month}{isProj ? " (projected)" : ""}</p>
                        <p className={`font-mono font-bold ${(val ?? 0) >= 0 ? "text-blue-600" : "text-red-500"}`}>{format(val ?? 0)}</p>
                        {p.sourceLabel && !isProj && <p className="text-muted-foreground mt-1 max-w-50">{p.sourceLabel}</p>}
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#nwGrad)" dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} name="Net Worth" connectNulls={false} />
                <Line type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#3b82f6", strokeDasharray: "0" }} activeDot={{ r: 5 }} name="Projected" connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>

          {/* Snapshot history — collapsible, shows all stored snapshots with delete */}
          {snapshots.length > 0 && (
            <div className="px-4 pb-4 border-t border-border/50 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Snapshot history ({snapshots.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {[...snapshots]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50 gap-3"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {new Date(snap.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className={`font-mono font-medium tabular-nums flex-1 text-right ${snap.net_worth >= 0 ? "text-blue-600" : "text-red-500"}`}>
                        {format(snap.net_worth)}
                      </span>
                      <button
                        onClick={async () => {
                          if (!confirm("Remove this snapshot from the trend history?")) return;
                          try {
                            await deleteSnapshot(snap.id);
                            toast.success("Snapshot removed");
                          } catch {
                            toast.error("Failed to remove snapshot");
                          }
                        }}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* Asset Allocation + Breakdown side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Donut chart */}
          <Card className="lg:col-span-2">
            <div className="px-4 pt-4 pb-2 border-b">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Asset Allocation</p>
              <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">{format(totalAssets)}</p>
            </div>
            <CardContent className="pt-4 pb-2 flex items-center justify-center">
              {allocationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No assets yet</p>
                </div>
              ) : (
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={allocationItems} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={58} paddingAngle={3}>
                        {allocationItems.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value) => format((value ?? 0) as number)}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total</p>
                    <p className="font-mono font-bold text-sm leading-tight">{format(totalAssets)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset category list */}
          <Card className="lg:col-span-3">
            <div className="px-4 pt-4 pb-2 border-b">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">By Category</p>
            </div>
            <CardContent className="px-0 pt-0 pb-0">
              {allocationItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <div className="divide-y divide-border">
                  {allocationItems.map((item, idx) => {
                    const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                    const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
                    const Icon = item.icon;
                    const inner = (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              {item.name}
                              {item.href && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-semibold">{format(item.value)}</span>
                              <span className="text-muted-foreground w-9 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                    );
                    return item.href ? (
                      <Link key={item.name} href={item.href}>{inner}</Link>
                    ) : (
                      <div key={item.name}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Health + Liquidity row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health Score */}
          <Card>
            <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Financial Health Score</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${healthScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : healthScore >= 60 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : healthScore >= 40 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}>{healthLabel}</span>
            </div>
            <CardContent className="pt-4 pb-4 space-y-5">
              {/* Score gauge + overall */}
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                    <circle cx="48" cy="48" r="40" fill="none" strokeWidth="10"
                      strokeDasharray={`${(healthScore / 100) * 251} 251`}
                      strokeLinecap="round"
                      className={healthBg.replace("bg-", "stroke-")}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold font-mono leading-none ${healthColor}`}>{healthScore}</span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {/* Segmented score bar */}
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Score Breakdown</p>
                  <div className="relative h-3 w-full rounded-full overflow-hidden bg-muted">
                    <div className="absolute inset-y-0 left-0 flex h-full rounded-full overflow-hidden transition-all duration-700" style={{ width: `${healthScore}%` }}>
                      {[
                        { val: healthSubScores.debtScore, color: "#10b981", label: "Debt" },
                        { val: healthSubScores.liquidScore, color: "#3b82f6", label: "Liquidity" },
                        { val: healthSubScores.divScore, color: "#8b5cf6", label: "Diversification" },
                        { val: healthSubScores.growthScore, color: "#f59e0b", label: "Growth" },
                      ].filter(s => s.val > 0).map((seg) => (
                        <div key={seg.label} className="h-full" style={{ flex: seg.val, backgroundColor: seg.color }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {[
                      { label: "Debt", color: "#10b981" },
                      { label: "Liquidity", color: "#3b82f6" },
                      { label: "Divers.", color: "#8b5cf6" },
                      { label: "Growth", color: "#f59e0b" },
                    ].map((l) => (
                      <span key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} />{l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sub-score rows */}
              <div className="space-y-3">
                {[
                  {
                    label: "Debt Management", icon: Shield, score: healthSubScores.debtScore, max: 40,
                    value: `${debtRatio.toFixed(1)}% debt-to-asset`, color: "#10b981",
                    status: debtRatio < 30 ? "good" : debtRatio < 60 ? "fair" : "bad",
                    target: "Target < 30%",
                  },
                  {
                    label: "Liquidity", icon: Droplets, score: healthSubScores.liquidScore, max: 30,
                    value: `${totalAssets > 0 ? ((liquidityData.liquid / totalAssets) * 100).toFixed(1) : 0}% liquid assets`, color: "#3b82f6",
                    status: liquidityData.liquid / (totalAssets || 1) > 0.3 ? "good" : liquidityData.liquid / (totalAssets || 1) > 0.15 ? "fair" : "bad",
                    target: "Target > 30%",
                  },
                  {
                    label: "Diversification", icon: BarChart3, score: healthSubScores.divScore, max: 20,
                    value: `${assetBreakdown.filter(i => i.value > 0).length} of 6 asset classes`, color: "#8b5cf6",
                    status: assetBreakdown.filter(i => i.value > 0).length >= 4 ? "good" : assetBreakdown.filter(i => i.value > 0).length >= 2 ? "fair" : "bad",
                    target: "Target ≥ 4 classes",
                  },
                  {
                    label: "Growth (MoM)", icon: TrendingUp, score: healthSubScores.growthScore, max: 10,
                    value: momDelta ? `${momDelta.abs >= 0 ? "+" : ""}${momDelta.pct.toFixed(2)}% this month` : "No prior snapshot",
                    color: "#f59e0b",
                    status: !momDelta ? "fair" : momDelta.pct > 0 ? "good" : "bad",
                    target: "Target > 0%",
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{row.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{row.value}</span>
                          <span className="font-mono text-xs font-bold" style={{ color: row.color }}>{row.score}/{row.max}</span>
                          {row.status === "good" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          {row.status === "fair" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                          {row.status === "bad" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(row.score / row.max) * 100}%`, backgroundColor: row.color }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{row.target}</p>
                    </div>
                  );
                })}
              </div>

              {/* Insights */}
              {healthInsights.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Insights</p>
                  {healthInsights.map((tip, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${tip.severity === "good" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : tip.severity === "warn" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                      {tip.severity === "good" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />}
                      <span>{tip.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liquidity Breakdown */}
          <Card>
            <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Liquidity Analysis</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{format(liquidityData.total)} total</span>
            </div>
            <CardContent className="pt-4 pb-4 space-y-4">
              {/* Stacked bar */}
              <div>
                <div className="flex h-4 w-full rounded-lg overflow-hidden gap-0.5">
                  {liquidityData.total > 0 && [
                    { value: liquidityData.liquid, color: "#10b981" },
                    { value: liquidityData.semiLiquid, color: "#f59e0b" },
                    { value: liquidityData.illiquid, color: "#ef4444" },
                  ].map((seg, i) => seg.value > 0 && (
                    <div key={i} className="h-full transition-all duration-700 rounded-sm" style={{ flex: seg.value, backgroundColor: seg.color }} />
                  ))}
                  {liquidityData.total === 0 && <div className="flex-1 bg-muted rounded-lg" />}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {[
                    { label: "Liquid", color: "#10b981", pct: liquidityData.total > 0 ? (liquidityData.liquid / liquidityData.total) * 100 : 0 },
                    { label: "Semi-Liquid", color: "#f59e0b", pct: liquidityData.total > 0 ? (liquidityData.semiLiquid / liquidityData.total) * 100 : 0 },
                    { label: "Illiquid", color: "#ef4444", pct: liquidityData.total > 0 ? (liquidityData.illiquid / liquidityData.total) * 100 : 0 },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
                      {l.label} {l.pct.toFixed(0)}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Instant liquidity highlight */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Instant Liquidity</p>
                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Cash & bank accounts (manual assets only)</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{format(liquidityBreakdown.instantLiquid)}</p>
                </div>
                {liquidityBreakdown.instantLiquid === 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700/70 dark:text-emerald-500/70">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>No cash or bank assets added. Go to the <strong>Assets tab</strong> → Add Asset → select type <strong>Cash</strong> or <strong>Bank Account</strong> to track this.</span>
                  </div>
                )}
              </div>

              {/* Tier breakdown */}
              {[
                { label: "Liquid Assets", sublabel: "Can be accessed within days", value: liquidityData.liquid, items: liquidityBreakdown.liquidItems, color: "#10b981", dot: "bg-emerald-500" },
                { label: "Semi-Liquid Assets", sublabel: "May take days to weeks to convert", value: liquidityData.semiLiquid, items: liquidityBreakdown.semiItems, color: "#f59e0b", dot: "bg-amber-500" },
                { label: "Illiquid Assets", sublabel: "Property, vehicles — takes months", value: liquidityData.illiquid, items: liquidityBreakdown.illiquidItems, color: "#ef4444", dot: "bg-red-500" },
              ].map((tier) => {
                const pct = liquidityData.total > 0 ? (tier.value / liquidityData.total) * 100 : 0;
                return (
                  <div key={tier.label} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${tier.dot}`} />
                        <div>
                          <p className="text-sm font-semibold">{tier.label}</p>
                          <p className="text-[10px] text-muted-foreground">{tier.sublabel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold" style={{ color: tier.color }}>{format(tier.value)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% of portfolio</p>
                      </div>
                    </div>
                    {tier.items.length > 0 && (
                      <div className="divide-y divide-border/60">
                        {tier.items.map((item) => (
                          <div key={item.name} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-mono font-medium">{format(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {tier.items.length === 0 && (
                      <p className="text-[10px] text-muted-foreground px-3 py-2 italic">None tracked</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Assets & Liabilities Tabs */}
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="assets" className="text-xs">
              Assets {assets.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{assets.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="text-xs">
              Liabilities {liabilities.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{liabilities.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs">Breakdown</TabsTrigger>
            <TabsTrigger value="allocation" className="text-xs">MF / Stocks</TabsTrigger>
          </TabsList>

          {/* ASSETS TAB */}
          <TabsContent value="assets" className="space-y-4">

            {/* Auto-tracked investments */}
            {allocationItems.filter((i) => i.href).length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Auto-Tracked Investments</p>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {allocationItems.filter((i) => i.href).map((item, idx) => {
                        const Icon = item.icon;
                        const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                        const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
                        return (
                          <Link key={item.name} href={item.href!}>
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
                                <Icon className="h-4 w-4" style={{ color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium flex items-center gap-1.5">
                                  {item.name}
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">auto-tracked</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-sm font-semibold" style={{ color }}>{format(item.value)}</p>
                                <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{allocationItems.filter((i) => i.href).length} investment categories</span>
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{format(externalAssetsTotal)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Manual assets */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Manual Assets</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cash, property, bank accounts etc.</p>
                </div>
              <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Asset</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>Add a new asset to track your net worth</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddAsset} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset Name</Label>
                      <Input id="assetName" placeholder="e.g., Savings Account" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetType">Type</Label>
                      <Select value={assetForm.type} onValueChange={(value: any) => setAssetForm({ ...assetForm, type: value })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="property">Property</SelectItem>
                          <SelectItem value="vehicle">Vehicle</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetValue">Current Value</Label>
                      <Input id="assetValue" type="number" placeholder="0.00" step="0.01" value={assetForm.value} onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetNotes">Notes (optional)</Label>
                      <Input id="assetNotes" placeholder="Optional notes" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Asset
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {assets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <PiggyBank className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No manual assets yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add cash, property, bank accounts etc.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assets.map((asset) => {
                      const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
                      return (
                        <div key={asset.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{asset.name}</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{asset.type.replace("_", " ")}</p>
                          </div>
                          <div className="text-right shrink-0 mr-1">
                            <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{format(asset.value)}</p>
                            <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditAssetDialog(asset)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={async () => { if (confirm(`Delete ${asset.name}?`)) { try { await deleteAsset(asset.id); toast.success("Asset deleted!"); } catch { toast.error("Failed to delete asset"); } } }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                )}
                {assets.length > 0 && (
                  <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{format(totalManualAssets)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* LIABILITIES TAB */}
          <TabsContent value="liabilities" className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Liabilities</p>
                <p className="text-xs text-muted-foreground mt-0.5">Loans, credit cards, mortgages</p>
              </div>
              <Dialog open={isAddLiabilityOpen} onOpenChange={setIsAddLiabilityOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive"><Plus className="h-4 w-4 mr-1" />Add Liability</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Liability</DialogTitle>
                    <DialogDescription>Add a new debt or liability to track</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddLiability} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="liabilityName">Liability Name</Label>
                      <Input id="liabilityName" placeholder="e.g., Car Loan" value={liabilityForm.name} onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liabilityType">Type</Label>
                      <Select value={liabilityForm.type} onValueChange={(value: any) => setLiabilityForm({ ...liabilityForm, type: value })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="loan">Personal Loan</SelectItem>
                          <SelectItem value="mortgage">Mortgage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="liabilityBalance">Balance</Label>
                        <Input id="liabilityBalance" type="number" placeholder="0.00" step="0.01" value={liabilityForm.balance} onChange={(e) => setLiabilityForm({ ...liabilityForm, balance: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interestRate">Interest Rate (%)</Label>
                        <Input id="interestRate" type="number" placeholder="0.0" step="0.1" value={liabilityForm.interest_rate} onChange={(e) => setLiabilityForm({ ...liabilityForm, interest_rate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="minPayment">Min. Payment</Label>
                        <Input id="minPayment" type="number" placeholder="0.00" step="0.01" value={liabilityForm.minimum_payment} onChange={(e) => setLiabilityForm({ ...liabilityForm, minimum_payment: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" type="date" value={liabilityForm.due_date} onChange={(e) => setLiabilityForm({ ...liabilityForm, due_date: e.target.value })} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" variant="destructive" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Liability
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {liabilities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No liabilities tracked</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add loans, credit cards, or mortgages</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {liabilities.map((liability) => {
                      const pct = totalLiabilities > 0 ? (liability.balance / totalLiabilities) * 100 : 0;
                      return (
                        <div key={liability.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-red-500">
                            {getLiabilityIcon(liability.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{liability.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{liability.type.replace("_", " ")}</span>
                              {liability.interest_rate && <span className="text-[10px] text-orange-500 font-medium">{liability.interest_rate}% APR</span>}
                              {liability.due_date && <span className="text-[10px] text-muted-foreground">Due {new Date(liability.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0 mr-1">
                            <p className="font-mono text-sm font-semibold text-red-500 dark:text-red-400">{format(liability.balance)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {pct.toFixed(1)}%{liability.minimum_payment ? ` · ${format(liability.minimum_payment)}/mo` : ""}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditLiabilityDialog(liability)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={async () => { if (confirm(`Delete ${liability.name}?`)) { try { await deleteLiability(liability.id); toast.success("Liability deleted!"); } catch { toast.error("Failed to delete"); } } }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                )}
                {liabilities.length > 0 && (
                  <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      {debtRatio.toFixed(1)}% debt-to-asset · {financialHealthLabel}
                    </span>
                    <span className="font-mono font-semibold text-red-500 dark:text-red-400">{format(totalLiabilities)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          {/* Debt Intelligence */}
          {liabilities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="px-4 pt-4 pb-3 border-b flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-orange-500" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Annual Interest Burden</p>
                </div>
                <CardContent className="pt-4 pb-4">
                  <p className="font-mono text-2xl font-bold text-orange-500">{format(debtAnalytics.annualInterest)}</p>
                  <p className="text-xs text-muted-foreground mt-1">per year in interest across all debts</p>
                  <div className="mt-3 space-y-1.5">
                    {liabilities.filter(l => l.interest_rate).map(l => (
                      <div key={l.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-32">{l.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 font-medium">{l.interest_rate}% APR</span>
                          <span className="font-mono">{format((l.balance * (l.interest_rate ?? 0)) / 100)}/yr</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monthly minimums</span>
                      <span className="font-mono font-semibold">{format(debtAnalytics.monthlyMinimum)}/mo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <div className="px-4 pt-4 pb-3 border-b flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-purple-500" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Payoff Timeline</p>
                </div>
                <CardContent className="pt-4 pb-4">
                  {debtAnalytics.payoffEstimates.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Add minimum payments to see payoff estimates</p>
                  ) : (
                    <div className="space-y-3">
                      {debtAnalytics.payoffEstimates.map((item) => {
                        const years = item.months ? Math.floor(item.months / 12) : null;
                        const months = item.months ? item.months % 12 : null;
                        const label = item.months === null ? "Never (payment too low)" : years && years > 0 ? `${years}y ${months}mo` : `${item.months}mo`;
                        const bad = item.months === null || (item.months ?? 0) > 60;
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between mb-1 text-xs">
                              <span className="font-medium truncate max-w-40">{item.name}</span>
                              <span className={`font-mono font-semibold ${bad ? "text-red-500" : "text-purple-500"}`}>{label}</span>
                            </div>
                            {item.months !== null && (
                              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${Math.max(5, 100 - Math.min((item.months / 120) * 100, 100))}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          </TabsContent>

          {/* BREAKDOWN TAB */}
          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Assets</p>
                  <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{format(totalAssets)}</p>
                </div>
                <CardContent className="px-0 pb-0">
                  <div className="divide-y divide-border">
                    {[...assets.map(a => ({ name: a.name, value: a.value })), ...assetBreakdown.filter(i => i.href !== null && i.value > 0).map(i => ({ name: i.name, value: i.value }))].map((item, idx) => {
                      const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                      return (
                        <div key={item.name + idx} className="px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium">{item.name}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-semibold">{format(item.value)}</span>
                              <span className="text-muted-foreground w-9 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Liabilities</p>
                  <p className="font-mono text-sm font-bold text-red-500 dark:text-red-400">{format(totalLiabilities)}</p>
                </div>
                <CardContent className="px-0 pb-0">
                  {liabilities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">No liabilities</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {liabilities.map((l) => {
                        const pct = totalLiabilities > 0 ? (l.balance / totalLiabilities) * 100 : 0;
                        return (
                          <div key={l.id} className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium">{l.name}</span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-semibold">{format(l.balance)}</span>
                                <span className="text-muted-foreground w-9 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MF / STOCKS TAB */}
          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Mutual Funds */}
              <Card>
                <div className="px-4 pt-4 pb-3 border-b">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mutual Funds by Category</p>
                </div>
                <CardContent className="pt-3 pb-2">
                  {mutualFundCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-xs text-muted-foreground">No mutual fund data yet</p>
                      <Link href="/mutual-funds" className="text-xs text-primary mt-1 hover:underline">Go to Mutual Funds →</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="h-52">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={mutualFundCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} innerRadius={44} paddingAngle={3}>
                              {mutualFundCategories.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} strokeWidth={0} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="divide-y divide-border">
                        {mutualFundCategories.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="text-xs font-medium">{item.name}</p>
                            </div>
                            <p className="font-mono text-xs font-semibold">{format(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stocks */}
              <Card>
                <div className="px-4 pt-4 pb-3 border-b">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Stocks by Sector</p>
                </div>
                <CardContent className="pt-3 pb-2">
                  {stockSectors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-xs text-muted-foreground">No stock data yet</p>
                      <Link href="/stocks" className="text-xs text-primary mt-1 hover:underline">Go to Stocks →</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="h-52">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={stockSectors} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} innerRadius={44} paddingAngle={3}>
                              {stockSectors.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} strokeWidth={0} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="divide-y divide-border">
                        {stockSectors.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="text-xs font-medium">{item.name}</p>
                            </div>
                            <p className="font-mono text-xs font-semibold">{format(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Net Worth Goal</DialogTitle>
            <DialogDescription>Track your progress towards a target net worth</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Net Worth</Label>
              <Input
                type="number"
                placeholder="e.g., 10000000"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
              />
              <p className="text-xs text-muted-foreground">Current: {format(netWorth)}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveGoal}>Save Goal</Button>
              {goalAmount > 0 && (
                <Button variant="outline" onClick={() => { setGoalAmount(0); localStorage.removeItem("nw_goal"); setGoalDialogOpen(false); }}>Clear</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle><DialogDescription>Update asset information</DialogDescription></DialogHeader>
          <form onSubmit={handleEditAsset} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Asset Name</Label><Input placeholder="e.g., Savings Account" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={assetForm.type} onValueChange={(value: any) => setAssetForm({ ...assetForm, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank Account</SelectItem><SelectItem value="investment">Investment</SelectItem><SelectItem value="property">Property</SelectItem><SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Current Value</Label><Input type="number" placeholder="0.00" step="0.01" value={assetForm.value} onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Notes</Label><Input placeholder="Optional" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Update Asset</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Liability Dialog */}
      <Dialog open={isEditLiabilityOpen} onOpenChange={setIsEditLiabilityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Liability</DialogTitle><DialogDescription>Update liability information</DialogDescription></DialogHeader>
          <form onSubmit={handleEditLiability} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Liability Name</Label><Input placeholder="e.g., Car Loan" value={liabilityForm.name} onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={liabilityForm.type} onValueChange={(value: any) => setLiabilityForm({ ...liabilityForm, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem><SelectItem value="loan">Personal Loan</SelectItem><SelectItem value="mortgage">Mortgage</SelectItem><SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Balance</Label><Input type="number" placeholder="0.00" step="0.01" value={liabilityForm.balance} onChange={(e) => setLiabilityForm({ ...liabilityForm, balance: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" placeholder="0.0" step="0.1" value={liabilityForm.interest_rate} onChange={(e) => setLiabilityForm({ ...liabilityForm, interest_rate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Min. Payment</Label><Input type="number" placeholder="0.00" step="0.01" value={liabilityForm.minimum_payment} onChange={(e) => setLiabilityForm({ ...liabilityForm, minimum_payment: e.target.value })} /></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={liabilityForm.due_date} onChange={(e) => setLiabilityForm({ ...liabilityForm, due_date: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" variant="destructive" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Update Liability</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
