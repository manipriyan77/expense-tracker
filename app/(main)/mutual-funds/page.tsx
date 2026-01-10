"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { mutualFundFormSchema, MutualFundFormData } from "@/lib/schemas/mutual-fund-form-schema";

export default function MutualFundsPage() {
  const { mutualFunds, loading, error, fetchMutualFunds, addMutualFund } = useMutualFundsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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
      currentValue: 0,
      purchaseDate: "",
      category: "General",
    },
  });

  const units = watch("units");
  const nav = watch("nav");

  useEffect(() => {
    fetchMutualFunds();
  }, [fetchMutualFunds]);

  const handleAddMutualFund = async (data: MutualFundFormData) => {
    const currentValue = data.units * data.nav;

    const newFund = {
      name: data.name,
      symbol: data.symbol,
      investedAmount: data.investedAmount,
      currentValue,
      units: data.units,
      nav: data.nav,
      purchaseDate: data.purchaseDate || new Date().toISOString().split("T")[0],
      category: data.category || "General",
    };

    await addMutualFund(newFund);
    reset();
    setIsAddDialogOpen(false);
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

  const totalInvested = mutualFunds.reduce((sum, fund) => sum + fund.investedAmount, 0);
  const totalCurrentValue = mutualFunds.reduce((sum, fund) => sum + fund.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Mutual Funds Tracker</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Mutual Fund</DialogTitle>
                  <DialogDescription>
                    Add a mutual fund to track its performance.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleAddMutualFund)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Fund Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., SBI Bluechip Fund"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
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
                      <p className="text-sm text-red-600">{errors.symbol.message}</p>
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
                      <p className="text-sm text-red-600">{errors.investedAmount.message}</p>
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
                        <p className="text-sm text-red-600">{errors.units.message}</p>
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
                        <p className="text-sm text-red-600">{errors.nav.message}</p>
                      )}
                    </div>
                  </div>

                  {units && nav && (
                    <div className="text-sm text-gray-600">
                      Current Value: ₹{(units * nav).toFixed(2)}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      {...register("purchaseDate")}
                    />
                    {errors.purchaseDate && (
                      <p className="text-sm text-red-600">{errors.purchaseDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Large Cap, Mid Cap, Sectoral"
                      {...register("category")}
                    />
                    {errors.category && (
                      <p className="text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding Fund...
                      </>
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
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalInvested.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all funds</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalCurrentValue.toLocaleString()}
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
                className={`text-2xl font-bold ₹{
                  totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totalGainLoss >= 0 ? "+" : ""}₹{totalGainLoss.toLocaleString()}
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
              <p className="text-xs text-muted-foreground">Active investments</p>
            </CardContent>
          </Card>
        </div>

        {/* Mutual Funds List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Mutual Funds</CardTitle>
            <CardDescription>Track your mutual fund investments and performance</CardDescription>
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
                  const gainLossPercentage = (gainLoss / fund.investedAmount) * 100;

                  return (
                    <div
                      key={fund.id}
                      className="border rounded-lg p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{fund.name}</h3>
                          <p className="text-sm text-gray-500">
                            {fund.symbol} • {fund.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold flex items-center ₹{
                              gainLoss >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {gainLoss >= 0 ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            {gainLoss >= 0 ? "+" : ""}₹{gainLoss.toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-500">
                            ({gainLossPercentage >= 0 ? "+" : ""}
                            {gainLossPercentage.toFixed(2)}%)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            ₹{fund.investedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Value</p>
                          <p className="font-semibold">
                            ₹{fund.currentValue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Units</p>
                          <p className="font-semibold">{fund.units.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current NAV</p>
                          <p className="font-semibold">₹{fund.nav.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Purchased on {new Date(fund.purchaseDate).toLocaleDateString()}</span>
                        <span>
                          Current Value: ₹{fund.currentValue.toLocaleString()}
                        </span>
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


