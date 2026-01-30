"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  BarChart3,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  useMutualFundsStore,
  type MutualFund,
} from "@/store/mutual-funds-store";
import {
  mutualFundFormSchema,
  MutualFundFormData,
} from "@/lib/schemas/mutual-fund-form-schema";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const CATEGORY_OPTIONS: MutualFundFormData["category"][] = [
  "equity",
  "debt",
  "hybrid",
  "index",
  "international",
  "other",
];

const EQUITY_SUBCATEGORY_OPTIONS: MutualFundFormData["subCategory"][] = [
  "thematic_fund",
  "large_mid_cap",
  "focused_fund",
  "index_fund",
  "flexi_cap",
  "large_cap",
  "contra_fund",
  "mid_cap",
  "small_cap",
  "sectoral_service",
  "value_fund",
  "sectoral_pharma",
  "sectoral_consumption",
  "elss",
  "thematic_mnc",
  "sectoral_infrastructure",
  "multi_cap",
  "thematic_global",
  "sectoral_banks",
  "sectoral_technology",
  "dividend_yield",
  "sectoral_energy",
  "sectoral_auto",
];

const DEBT_SUBCATEGORY_OPTIONS: MutualFundFormData["subCategory"][] = [
  "floating_rate",
  "banking_psu",
  "fixed_maturity",
  "ultra_short_duration",
  "overnight",
  "money_market",
  "dynamic_bond",
  "credit_risk",
  "corporate_bond",
  "liquid",
  "low_duration",
  "gilt_long_term",
  "medium_duration",
  "long_duration",
  "short_duration",
  "medium_to_long_duration",
  "gilt_short_mid_term",
  "debt_interval",
  "index_debt_oriented",
  "sectoral_infrastructure_debt",
];

const HYBRID_SUBCATEGORY_OPTIONS: MutualFundFormData["subCategory"][] = [
  "arbitrage",
  "multi_asset_allocation",
  "balanced_advantage",
  "aggressive_hybrid",
  "dynamic_asset_allocation",
  "equity_savings",
  "conservative_hybrid",
  "balanced_hybrid",
];

const formatLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function MutualFundsPage() {
  const { format } = useFormatCurrency();
  const {
    mutualFunds,
    loading,
    error,
    fetchMutualFunds,
    addMutualFund,
    updateMutualFund,
    deleteMutualFund,
  } = useMutualFundsStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<MutualFund | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MutualFundFormData>({
    resolver: zodResolver(mutualFundFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      investedAmount: 0,
      units: 0,
      nav: 0,
      purchaseNav: 0,
      currentValue: 0,
      purchaseDate: "",
      category: "equity",
      subCategory: "large_cap",
    },
  });

  const units = watch("units");
  const nav = watch("nav");
  const purchaseNav = watch("purchaseNav");
  const category = watch("category");
  const subCategory = watch("subCategory");

  const subCategoryOptions = useMemo(() => {
    if (category === "equity") return EQUITY_SUBCATEGORY_OPTIONS;
    if (category === "debt") return DEBT_SUBCATEGORY_OPTIONS;
    if (category === "hybrid") return HYBRID_SUBCATEGORY_OPTIONS;
    return ["other"];
  }, [category]);

  useEffect(() => {
    if (!subCategoryOptions.includes(subCategory as any)) {
      setValue(
        "subCategory",
        subCategoryOptions[0] as MutualFundFormData["subCategory"],
      );
    }
  }, [subCategoryOptions, subCategory, setValue]);

  useEffect(() => {
    fetchMutualFunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddMutualFund = async (data: MutualFundFormData) => {
    const purchaseValue = data.units * data.purchaseNav;
    const investedAmount =
      data.investedAmount > 0 ? data.investedAmount : purchaseValue;
    const currentValue = data.units * data.nav;

    const newFund = {
      name: data.name,
      symbol: data.symbol,
      investedAmount,
      currentValue,
      units: data.units,
      nav: data.nav,
      purchaseNav: data.purchaseNav,
      purchaseDate: data.purchaseDate || new Date().toISOString().split("T")[0],
      category: data.category || "equity",
      subCategory: data.subCategory || subCategoryOptions[0],
    };

    if (editingFund) {
      await updateMutualFund(editingFund.id, newFund);
    } else {
      await addMutualFund(newFund);
    }

    reset();
    setEditingFund(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteMutualFund(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchMutualFunds} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalInvested = mutualFunds.reduce(
    (sum, fund) => sum + fund.investedAmount,
    0,
  );
  const totalCurrentValue = mutualFunds.reduce(
    (sum, fund) => sum + fund.currentValue,
    0,
  );
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage =
    totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Mutual Funds Tracker
            </h1>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingFund(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingFund(null);
                    reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingFund ? "Edit Mutual Fund" : "Add Mutual Fund"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingFund
                      ? "Update this mutual fund's details."
                      : "Add a mutual fund to track its performance."}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit(handleAddMutualFund)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Fund Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., SBI Bluechip Fund"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol/Code</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., SBIBLU"
                      {...register("symbol")}
                    />
                    {errors.symbol && (
                      <p className="text-sm text-red-600">
                        {errors.symbol.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investedAmount">Invested Amount</Label>
                    <Input
                      id="investedAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("investedAmount", { valueAsNumber: true })}
                    />
                    {errors.investedAmount && (
                      <p className="text-sm text-red-600">
                        {errors.investedAmount.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="units">Units</Label>
                      <Input
                        id="units"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("units", { valueAsNumber: true })}
                      />
                      {errors.units && (
                        <p className="text-sm text-red-600">
                          {errors.units.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseNav">Purchase NAV</Label>
                      <Input
                        id="purchaseNav"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("purchaseNav", { valueAsNumber: true })}
                      />
                      {errors.purchaseNav && (
                        <p className="text-sm text-red-600">
                          {errors.purchaseNav.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nav">Current NAV</Label>
                      <Input
                        id="nav"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("nav", { valueAsNumber: true })}
                      />
                      {errors.nav && (
                        <p className="text-sm text-red-600">
                          {errors.nav.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {units && purchaseNav ? (
                      <div>Purchase Value: {format(units * purchaseNav)}</div>
                    ) : null}
                    {units && nav ? (
                      <div>Current Value: {format(units * nav)}</div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      {...register("purchaseDate")}
                    />
                    {errors.purchaseDate && (
                      <p className="text-sm text-red-600">
                        {errors.purchaseDate.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        {...register("category")}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {formatLabel(opt)}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-sm text-red-600">
                          {errors.category.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subCategory">Sub Sector</Label>
                      <select
                        id="subCategory"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        {...register("subCategory")}
                      >
                        {subCategoryOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {formatLabel(opt)}
                          </option>
                        ))}
                      </select>
                      {errors.subCategory && (
                        <p className="text-sm text-red-600">
                          {errors.subCategory.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingFund ? "Saving..." : "Adding Fund..."}
                      </>
                    ) : editingFund ? (
                      "Save Changes"
                    ) : (
                      "Add Mutual Fund"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invested
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(totalInvested)}</div>
              <p className="text-xs text-muted-foreground">Across all funds</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Value
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(totalCurrentValue)}
              </div>
              <p className="text-xs text-muted-foreground">Portfolio value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totalGainLoss >= 0 ? "+" : ""}
                {format(totalGainLoss)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalGainLossPercentage >= 0 ? "+" : ""}
                {totalGainLossPercentage.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funds Count</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mutualFunds.length}</div>
              <p className="text-xs text-muted-foreground">
                Active investments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mutual Funds List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Mutual Funds</CardTitle>
            <CardDescription>
              Track your mutual fund investments and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mutualFunds.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No mutual funds yet. Add your first fund above!
                </p>
              ) : (
                mutualFunds.map((fund) => {
                  const gainLoss = fund.currentValue - fund.investedAmount;
                  const gainLossPercentage =
                    (gainLoss / fund.investedAmount) * 100;

                  return (
                    <div
                      key={fund.id}
                      className="border rounded-lg p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{fund.name}</h3>
                          <p className="text-sm text-gray-500">
                            {fund.symbol} •{" "}
                            {formatLabel(fund.category || "other")} •{" "}
                            {formatLabel(fund.subCategory || "other")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingFund(fund);
                              reset({
                                name: fund.name,
                                symbol: fund.symbol,
                                investedAmount: fund.investedAmount,
                                units: fund.units,
                                nav: fund.nav,
                                purchaseNav: fund.purchaseNav,
                                currentValue: fund.currentValue,
                                purchaseDate: fund.purchaseDate,
                                category:
                                  (fund.category as MutualFundFormData["category"]) ||
                                  "equity",
                                subCategory:
                                  (fund.subCategory as MutualFundFormData["subCategory"]) ||
                                  "large_cap",
                              });
                              setIsDialogOpen(true);
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === fund.id || loading}
                            onClick={() => handleDelete(fund.id, fund.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingId === fund.id ? "Deleting..." : "Delete"}
                          </Button>
                          <div className="text-right">
                            <div
                              className={`text-lg font-bold flex items-center ${
                                gainLoss >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {gainLoss >= 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              )}
                              {gainLoss >= 0 ? "+" : ""}
                              {format(gainLoss)}
                            </div>
                            <p className="text-sm text-gray-500">
                              ({gainLossPercentage >= 0 ? "+" : ""}
                              {gainLossPercentage.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            {format(fund.investedAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Value</p>
                          <p className="font-semibold">
                            {format(fund.currentValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Units</p>
                          <p className="font-semibold">
                            {fund.units.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current NAV</p>
                          <p className="font-semibold">{format(fund.nav)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Purchase NAV</p>
                          <p className="font-semibold">
                            {format(fund.purchaseNav)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>
                          Purchased on{" "}
                          {new Date(fund.purchaseDate).toLocaleDateString()}
                        </span>
                        <span>Current Value: {format(fund.currentValue)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
