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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
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

const ALLOCATION_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ec4899", "#8b5cf6"];
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

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
  } = useNetWorthStore();

  // Investment / asset modules from other parts of the app
  const { holdings, load: loadGold } = useGoldStore();
  const { mutualFunds, fetchMutualFunds } = useMutualFundsStore();
  const { stocks, fetchStocks } = useStocksStore();
  const { entries: forexEntries, load: loadForex } = useForexStore();

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

    return goldValue + mfValue + stockValue + forexValue;
  }, [holdings, mutualFunds, stocks, forexEntries]);

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
      {
        name: "Other Assets",
        value: totalManualAssets,
        href: null,
        icon: DollarSign,
      },
    ];
  }, [holdings, mutualFunds, stocks, forexEntries, totalManualAssets]);

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

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Dark Hero Band ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Net Worth Tracking</p>
            <p className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">
              {format(netWorth)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Total Assets</p>
              <p className="font-mono text-base font-semibold text-green-400">{format(totalAssets)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Total Liabilities</p>
              <p className="font-mono text-base font-semibold text-red-400">{format(totalLiabilities)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Net Worth</p>
              <p className={`font-mono text-base font-semibold ${netWorth >= 0 ? "text-green-400" : "text-red-400"}`}>{format(netWorth)}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-4">

        {/* Asset Breakdown by Category */}
        <Card className="mb-4">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base">Asset Breakdown</CardTitle>
            <CardDescription>
              Your assets by category - click to view details
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            {totalAssets === 0 ? (
              <p className="text-center text-muted-foreground py-3 text-sm">
                No assets tracked yet. Add investments or manual assets to get
                started.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assetBreakdown
                  .filter((item) => item.value > 0)
                  .map((item) => {
                    const percentage =
                      totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
                    const Icon = item.icon;
                    return (
                      <Card
                        key={item.name}
                        className={`hover:shadow-md transition-shadow ${
                          item.href ? "cursor-pointer" : ""
                        }`}
                      >
                        <CardContent className="p-3">
                          {item.href ? (
                            <Link href={item.href} className="block">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-5 w-5 text-blue-600" />
                                  <span className="font-semibold">
                                    {item.name}
                                  </span>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="text-xl font-bold text-green-600">
                                {format(item.value)}
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>{percentage.toFixed(1)}% of total</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold">
                                  {item.name}
                                </span>
                              </div>
                              <div className="text-xl font-bold text-green-600">
                                {format(item.value)}
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>{percentage.toFixed(1)}% of total</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Net Worth Trend Chart */}
        <Card className="mb-4">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base">Net Worth Trend</CardTitle>
            <CardDescription>
              From Jan 2026 — up to 6 months. Each point comes from: a snapshot
              saved that month (e.g. &quot;Snapshot on Jan 10, 2026&quot;),
              current net worth for the current month, or the last snapshot
              carried forward. Hover a point to see its source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={historicalData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => {
                    const abs = Math.abs(value);
                    const sign = value < 0 ? "-" : "";
                    if (abs >= 1e6) return `${sign}₹${(abs / 1e6).toFixed(1)}M`;
                    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(0)}L`;
                    if (abs >= 1000)
                      return `${sign}₹${(abs / 1000).toFixed(0)}k`;
                    return `${sign}₹${Math.round(abs)}`;
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as {
                      month: string;
                      netWorth: number;
                      sourceLabel: string;
                    };
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                        <p className="font-semibold text-foreground">{p.month}</p>
                        <p className="text-indigo-600 font-medium">
                          Net worth: {format(p.netWorth)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground max-w-[220px]">
                          {p.sourceLabel}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Bar
                  dataKey="netWorth"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Net worth"
                />
              </BarChart>
            </ResponsiveContainer>
            {snapshots.length > 0 && (
              <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Chart values come from:{" "}
                </span>
                Either a snapshot on that month, or carried from the last
                snapshot, or current net worth. Recent snapshots:{" "}
                {[...snapshots]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  )
                  .slice(0, 5)
                  .map((s) => {
                    const d = new Date(s.date);
                    return `${d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })} → ${format(s.net_worth)}`;
                  })
                  .join("; ")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assets & Liabilities Tabs */}
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Assets</h3>
              <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>
                      Add a new asset to track your net worth
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddAsset} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset Name</Label>
                      <Input
                        id="assetName"
                        placeholder="e.g., Savings Account"
                        value={assetForm.name}
                        onChange={(e) =>
                          setAssetForm({ ...assetForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetType">Type</Label>
                      <Select
                        value={assetForm.type}
                        onValueChange={(value: any) =>
                          setAssetForm({ ...assetForm, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
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
                      <Input
                        id="assetValue"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={assetForm.value}
                        onChange={(e) =>
                          setAssetForm({ ...assetForm, value: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Add Asset
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {assets.map((asset) => (
                <Card
                  key={asset.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          {getAssetIcon(asset.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{asset.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {asset.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {format(asset.value)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditAssetDialog(asset)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete ${asset.name}?`,
                                  )
                                ) {
                                  try {
                                    await deleteAsset(asset.id);
                                    toast.success(
                                      "Asset deleted successfully!",
                                    );
                                  } catch (error) {
                                    toast.error("Failed to delete asset");
                                  }
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="liabilities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Liabilities</h3>
              <Dialog
                open={isAddLiabilityOpen}
                onOpenChange={setIsAddLiabilityOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Liability
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Liability</DialogTitle>
                    <DialogDescription>
                      Add a new debt or liability to track
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleAddLiability}
                    className="space-y-4 py-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="liabilityName">Liability Name</Label>
                      <Input
                        id="liabilityName"
                        placeholder="e.g., Car Loan"
                        value={liabilityForm.name}
                        onChange={(e) =>
                          setLiabilityForm({
                            ...liabilityForm,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liabilityType">Type</Label>
                      <Select
                        value={liabilityForm.type}
                        onValueChange={(value: any) =>
                          setLiabilityForm({ ...liabilityForm, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_card">
                            Credit Card
                          </SelectItem>
                          <SelectItem value="loan">Personal Loan</SelectItem>
                          <SelectItem value="mortgage">Mortgage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liabilityBalance">Current Balance</Label>
                      <Input
                        id="liabilityBalance"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={liabilityForm.balance}
                        onChange={(e) =>
                          setLiabilityForm({
                            ...liabilityForm,
                            balance: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">
                        Interest Rate (%) - Optional
                      </Label>
                      <Input
                        id="interestRate"
                        type="number"
                        placeholder="0.0"
                        step="0.1"
                        value={liabilityForm.interest_rate}
                        onChange={(e) =>
                          setLiabilityForm({
                            ...liabilityForm,
                            interest_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Add Liability
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {liabilities.map((liability) => (
                <Card
                  key={liability.id}
                  className="hover:shadow-md transition-shadow border-red-100"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-100 rounded-full">
                          {getLiabilityIcon(liability.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{liability.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {liability.type.replace("_", " ")}
                            {liability.interest_rate &&
                              ` • ${liability.interest_rate}% APR`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {format(liability.balance)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditLiabilityDialog(liability)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete ${liability.name}?`,
                                  )
                                ) {
                                  try {
                                    await deleteLiability(liability.id);
                                    toast.success(
                                      "Liability deleted successfully!",
                                    );
                                  } catch (error) {
                                    toast.error("Failed to delete liability");
                                  }
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card>
              <CardHeader>
                <CardTitle>Asset & Liability Breakdown</CardTitle>
                <CardDescription>
                  Detailed view of your financial position
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <h4 className="font-semibold text-green-600">Assets</h4>
                      <span className="font-semibold text-green-600">
                        {format(totalAssets)}
                      </span>
                    </div>
                    {/* Manual Assets */}
                    {assets.map((asset) => {
                      const percentage =
                        totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0;
                      return (
                        <div key={asset.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{asset.name}</span>
                            <span className="text-muted-foreground">
                              {format(asset.value)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {/* External Assets */}
                    {assetBreakdown
                      .filter((item) => item.href !== null)
                      .map((item) => {
                        const percentage =
                          totalAssets > 0
                            ? (item.value / totalAssets) * 100
                            : 0;
                        return (
                          <div key={item.name} className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground">
                                {format(item.value)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between mb-2">
                      <h4 className="font-semibold text-red-600">
                        Liabilities
                      </h4>
                      <span className="font-semibold text-red-600">
                        {format(totalLiabilities)}
                      </span>
                    </div>
                    {liabilities.map((liability) => {
                      const percentage =
                        (liability.balance / totalLiabilities) * 100;
                      return (
                        <div key={liability.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{liability.name}</span>
                            <span className="text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Allocation Tab */}
          <TabsContent value="allocation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Distribution of investments by asset class</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center p-3">
                {allocationItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 w-full">No asset data yet. Add investments to see allocation.</p>
                ) : (
                  <>
                    <div className="h-80">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={allocationItems} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}>
                            {allocationItems.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => format((value ?? 0) as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {allocationItems.map((item, idx) => {
                        const total = allocationItems.reduce((s, i) => s + i.value, 0);
                        const share = total ? ((item.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={item.name} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <div><p className="font-semibold text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{share}% of assets</p></div>
                            </div>
                            <p className="font-semibold text-foreground">{format(item.value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader><CardTitle>Mutual Funds by Category</CardTitle><CardDescription>Breakdown of MF current value</CardDescription></CardHeader>
                <CardContent>
                  {mutualFundCategories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No mutual fund data yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                      <div className="h-64">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={mutualFundCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={2} label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}>
                              {mutualFundCategories.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {mutualFundCategories.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="font-semibold text-foreground">{item.name}</p>
                            </div>
                            <p className="font-semibold text-foreground">{format(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Stocks by Sector</CardTitle><CardDescription>Breakdown of stock current value</CardDescription></CardHeader>
                <CardContent>
                  {stockSectors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No stock data yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                      <div className="h-64">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={stockSectors} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={2} label={({ percent = 0 }) => `${(percent * 100).toFixed(0)}%`}>
                              {stockSectors.map((_, index) => <Cell key={index} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => format((value ?? 0) as number)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {stockSectors.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }} />
                              <p className="font-semibold text-foreground">{item.name}</p>
                            </div>
                            <p className="font-semibold text-foreground">{format(item.value)}</p>
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
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAsset} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editAssetName">Asset Name</Label>
              <Input
                id="editAssetName"
                placeholder="e.g., Savings Account"
                value={assetForm.name}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAssetType">Type</Label>
              <Select
                value={assetForm.type}
                onValueChange={(value: any) =>
                  setAssetForm({ ...assetForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
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
              <Label htmlFor="editAssetValue">Current Value</Label>
              <Input
                id="editAssetValue"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={assetForm.value}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, value: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Asset
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Liability Dialog */}
      <Dialog open={isEditLiabilityOpen} onOpenChange={setIsEditLiabilityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Liability</DialogTitle>
            <DialogDescription>Update liability information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLiability} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editLiabilityName">Liability Name</Label>
              <Input
                id="editLiabilityName"
                placeholder="e.g., Car Loan"
                value={liabilityForm.name}
                onChange={(e) =>
                  setLiabilityForm({ ...liabilityForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLiabilityType">Type</Label>
              <Select
                value={liabilityForm.type}
                onValueChange={(value: any) =>
                  setLiabilityForm({ ...liabilityForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="loan">Personal Loan</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLiabilityBalance">Current Balance</Label>
              <Input
                id="editLiabilityBalance"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={liabilityForm.balance}
                onChange={(e) =>
                  setLiabilityForm({
                    ...liabilityForm,
                    balance: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInterestRate">
                Interest Rate (%) - Optional
              </Label>
              <Input
                id="editInterestRate"
                type="number"
                placeholder="0.0"
                step="0.1"
                value={liabilityForm.interest_rate}
                onChange={(e) =>
                  setLiabilityForm({
                    ...liabilityForm,
                    interest_rate: e.target.value,
                  })
                }
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Liability
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
