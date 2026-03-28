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
  ArrowUpCircle,
  ArrowDownCircle,
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
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  const manualLiabilitiesTotal = liabilities.reduce(
    (sum, liability) => sum + liability.balance,
    0,
  );
  const debtTrackerTotal = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalLiabilities = manualLiabilitiesTotal + debtTrackerTotal;
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

  // Net worth trend: from Jan 2026 only, up to 6 months (snapshot or current net worth)
  const NET_WORTH_START_YEAR = 2026;
  const NET_WORTH_START_MONTH = 0; // January

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
      const snapshotInMonth = sortedSnapshots.find((s) => {
        const sDate = new Date(s.date);
        return sDate >= d && sDate <= endOfMonth;
      });
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

  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
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
        <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          {/* Header row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Total Net Worth · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${netWorth >= 0 ? "text-white" : "text-red-400"}`}>
                {format(netWorth)}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await createSnapshot();
                  toast.success("Snapshot saved!");
                } catch {
                  toast.error("Failed to save snapshot");
                }
              }}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors text-white px-3 py-1.5 rounded-lg mt-1"
            >
              <Camera className="h-3.5 w-3.5" />
              Snapshot
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Total Assets</p>
              <p className="font-mono text-lg font-semibold text-emerald-400">{format(totalAssets)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{assets.length + (externalAssetsTotal > 0 ? 1 : 0)} sources</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Total Liabilities</p>
              <p className="font-mono text-lg font-semibold text-red-400">{format(totalLiabilities)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{liabilities.length} items</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Debt Ratio</p>
              <p className={`font-mono text-lg font-semibold ${financialHealthColor}`}>{debtRatio.toFixed(1)}%</p>
              <p className={`text-[10px] mt-0.5 ${financialHealthColor}`}>{financialHealthLabel}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Investments</p>
              <p className="font-mono text-lg font-semibold text-blue-400">{format(externalAssetsTotal)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">tracked externally</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3 space-y-3">

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
              <AreaChart data={historicalData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
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
                    const p = payload[0].payload as { month: string; netWorth: number; sourceLabel: string };
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                        <p className="font-semibold mb-1">{p.month}</p>
                        <p className={`font-mono font-bold ${p.netWorth >= 0 ? "text-blue-600" : "text-red-500"}`}>{format(p.netWorth)}</p>
                        <p className="text-muted-foreground mt-1 max-w-50">{p.sourceLabel}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Area type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={2} fill="url(#nwGrad)" dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} name="Net Worth" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Allocation + Breakdown side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Donut chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Asset Allocation</p>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {allocationItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No assets yet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={allocationItems} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
                          {allocationItems.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => format((value ?? 0) as number)} contentStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Assets</p>
                      <p className="font-mono font-bold text-sm">{format(totalAssets)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset category list */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">By Category</p>
            </CardHeader>
            <CardContent className="px-4 pt-3 pb-3 space-y-3">
              {allocationItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No data yet</p>
              ) : allocationItems.map((item, idx) => {
                const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                const color = ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
                const Icon = item.icon;
                const content = (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">{format(item.value)}</span>
                        <span>{pct.toFixed(1)}%</span>
                        {item.href && <ExternalLink className="h-3 w-3" />}
                      </div>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full">
                      <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </>
                );
                return item.href ? (
                  <Link key={item.name} href={item.href}>{content}</Link>
                ) : (
                  <div key={item.name}>{content}</div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Assets & Liabilities Tabs */}
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="assets">
              Assets
              {assets.length > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground">{assets.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="liabilities">
              Liabilities
              {liabilities.length > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground">{liabilities.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="allocation">MF / Stocks</TabsTrigger>
          </TabsList>

          {/* ASSETS TAB */}
          <TabsContent value="assets" className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Manual Assets</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cash, property, vehicles etc.</p>
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

            {assets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                  <PiggyBank className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No manual assets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add cash, property, bank accounts etc.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {assets.map((asset) => {
                  const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
                  return (
                    <Card key={asset.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg shrink-0">
                              {getAssetIcon(asset.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{asset.name}</p>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{asset.type.replace("_", " ")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">{format(asset.value)}</p>
                              <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% of assets</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditAssetDialog(asset)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={async () => { if (confirm(`Delete ${asset.name}?`)) { try { await deleteAsset(asset.id); toast.success("Asset deleted!"); } catch { toast.error("Failed to delete asset"); } } }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
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

            {/* Debt overview bar */}
            {liabilities.length > 0 && (
              <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Debt Overview</span>
                    </div>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">{format(totalLiabilities)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${Math.min(debtRatio, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{debtRatio.toFixed(1)}% debt-to-asset ratio · {financialHealthLabel}</p>
                </CardContent>
              </Card>
            )}

            {liabilities.length === 0 && debts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                  <CreditCard className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No liabilities tracked</p>
                  <p className="text-xs text-muted-foreground mt-1">Great! Or add loans and credit cards.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
              {liabilities.length > 0 && <div className="grid gap-2 md:grid-cols-2">
                {liabilities.map((liability) => {
                  const pct = totalLiabilities > 0 ? (liability.balance / totalLiabilities) * 100 : 0;
                  return (
                    <Card key={liability.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-400">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-lg shrink-0">
                              {getLiabilityIcon(liability.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{liability.name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{liability.type.replace("_", " ")}</p>
                                {liability.interest_rate && <span className="text-[10px] text-orange-500 font-medium">{liability.interest_rate}% APR</span>}
                                {liability.due_date && <span className="text-[10px] text-muted-foreground">Due: {new Date(liability.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">{format(liability.balance)}</p>
                              {liability.minimum_payment && <p className="text-[10px] text-muted-foreground">Min: {format(liability.minimum_payment)}/mo</p>}
                              <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% of debt</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditLiabilityDialog(liability)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={async () => { if (confirm(`Delete ${liability.name}?`)) { try { await deleteLiability(liability.id); toast.success("Liability deleted!"); } catch { toast.error("Failed to delete"); } } }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>}

              {/* Debt Tracker section */}
              {debts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">From Debt Tracker</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Debts managed in Debt Tracker</p>
                    </div>
                    <Link href="/debt-tracker">
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {debts.map((debt) => {
                      const pct = totalLiabilities > 0 ? (debt.balance / totalLiabilities) * 100 : 0;
                      return (
                        <Card key={debt.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-400">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-orange-50 dark:bg-orange-950/40 rounded-lg shrink-0">
                                  <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">{debt.name}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{debt.type.replace("_", " ")}</p>
                                    {debt.interest_rate > 0 && <span className="text-[10px] text-orange-500 font-medium">{debt.interest_rate}% APR</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono font-semibold text-sm text-orange-600 dark:text-orange-400">{format(debt.balance)}</p>
                                {debt.minimum_payment > 0 && <p className="text-[10px] text-muted-foreground">Min: {format(debt.minimum_payment)}/mo</p>}
                                <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% of debt</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            )}
          </TabsContent>

          {/* BREAKDOWN TAB */}
          <TabsContent value="breakdown">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Assets</p>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{format(totalAssets)}</p>
                </CardHeader>
                <CardContent className="px-4 pt-3 pb-4 space-y-3">
                  {[...assets.map(a => ({ name: a.name, value: a.value })), ...assetBreakdown.filter(i => i.href !== null && i.value > 0).map(i => ({ name: i.name, value: i.value }))].map((item, idx) => {
                    const pct = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                    return (
                      <div key={item.name + idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono text-foreground font-semibold">{format(item.value)}</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full">
                          <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Liabilities</p>
                  <p className="font-mono font-bold text-red-600 dark:text-red-400">{format(totalLiabilities)}</p>
                </CardHeader>
                <CardContent className="px-4 pt-3 pb-4 space-y-3">
                  {liabilities.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No liabilities</p> : liabilities.map((l) => {
                    const pct = totalLiabilities > 0 ? (l.balance / totalLiabilities) * 100 : 0;
                    return (
                      <div key={l.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{l.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono text-foreground font-semibold">{format(l.balance)}</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full">
                          <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MF / STOCKS TAB */}
          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mutual Funds by Category</p>
                </CardHeader>
                <CardContent className="pt-3">
                  {mutualFundCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-5">No mutual fund data yet</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                      <div className="h-56">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={mutualFundCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                              {mutualFundCategories.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {mutualFundCategories.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="text-sm">{item.name}</p>
                            </div>
                            <p className="font-mono font-semibold text-sm">{format(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Stocks by Sector</p>
                </CardHeader>
                <CardContent className="pt-3">
                  {stockSectors.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-5">No stock data yet</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                      <div className="h-56">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={stockSectors} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                              {stockSectors.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {stockSectors.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="text-sm">{item.name}</p>
                            </div>
                            <p className="font-mono font-semibold text-sm">{format(item.value)}</p>
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
