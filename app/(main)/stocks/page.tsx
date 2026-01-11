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
import { useStocksStore } from "@/store/stocks-store";
import { stockFormSchema, StockFormData } from "@/lib/schemas/stock-form-schema";

export default function StocksPage() {
  const { stocks, loading, error, fetchStocks, addStock } = useStocksStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      shares: 0,
      avgPurchasePrice: 0,
      currentPrice: 0,
      investedAmount: 0,
      currentValue: 0,
      purchaseDate: "",
      sector: "General",
    },
  });

  const shares = watch("shares");
  const avgPurchasePrice = watch("avgPurchasePrice");
  const currentPrice = watch("currentPrice");

  useEffect(() => {
    fetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddStock = async (data: StockFormData) => {
    const investedAmount = data.shares * data.avgPurchasePrice;
    const currentValue = data.shares * data.currentPrice;

    const newStock = {
      name: data.name,
      symbol: data.symbol,
      shares: data.shares,
      avgPurchasePrice: data.avgPurchasePrice,
      currentPrice: data.currentPrice,
      investedAmount,
      currentValue,
      purchaseDate: data.purchaseDate || new Date().toISOString().split("T")[0],
      sector: data.sector || "General",
    };

    await addStock(newStock);
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
          <Button onClick={fetchStocks} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalInvested = stocks.reduce((sum, stock) => sum + stock.investedAmount, 0);
  const totalCurrentValue = stocks.reduce((sum, stock) => sum + stock.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Stocks Tracker</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Stock</DialogTitle>
                  <DialogDescription>
                    Add a stock to track its performance.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleAddStock)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Apple Inc."
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., AAPL"
                      {...register("symbol")}
                    />
                    {errors.symbol && (
                      <p className="text-sm text-red-600">{errors.symbol.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shares">Shares</Label>
                      <Input
                        id="shares"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...register("shares", { valueAsNumber: true })}
                      />
                      {errors.shares && (
                        <p className="text-sm text-red-600">{errors.shares.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avgPurchasePrice">Avg Purchase Price</Label>
                      <Input
                        id="avgPurchasePrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register("avgPurchasePrice", { valueAsNumber: true })}
                      />
                      {errors.avgPurchasePrice && (
                        <p className="text-sm text-red-600">{errors.avgPurchasePrice.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">Current Price</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("currentPrice", { valueAsNumber: true })}
                    />
                    {errors.currentPrice && (
                      <p className="text-sm text-red-600">{errors.currentPrice.message}</p>
                    )}
                  </div>

                  {shares && avgPurchasePrice && currentPrice && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Invested: ₹{(shares * avgPurchasePrice).toFixed(2)}</div>
                      <div>Current Value: ₹{(shares * currentPrice).toFixed(2)}</div>
                      <div className={shares * currentPrice - shares * avgPurchasePrice >= 0 ? "text-green-600" : "text-red-600"}>
                        P&L: ₹{(shares * currentPrice - shares * avgPurchasePrice).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="sector">Sector</Label>
                      <Input
                        id="sector"
                        placeholder="e.g., Technology"
                        {...register("sector")}
                      />
                      {errors.sector && (
                        <p className="text-sm text-red-600">{errors.sector.message}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding Stock...
                      </>
                    ) : (
                      "Add Stock"
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
              <p className="text-xs text-muted-foreground">Across all stocks</p>
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
              <CardTitle className="text-sm font-medium">Stocks Count</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stocks.length}</div>
              <p className="text-xs text-muted-foreground">Active holdings</p>
            </CardContent>
          </Card>
        </div>

        {/* Stocks List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Stock Portfolio</CardTitle>
            <CardDescription>Track your stock investments and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stocks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No stocks yet. Add your first stock above!
                </p>
              ) : (
                stocks.map((stock) => {
                  const gainLoss = stock.currentValue - stock.investedAmount;
                  const gainLossPercentage = (gainLoss / stock.investedAmount) * 100;
                  const priceChange = stock.currentPrice - stock.avgPurchasePrice;
                  const priceChangePercentage = (priceChange / stock.avgPurchasePrice) * 100;

                  return (
                    <div
                      key={stock.id}
                      className="border rounded-lg p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{stock.name}</h3>
                          <p className="text-sm text-gray-500">
                            {stock.symbol} • {stock.sector}
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
                          <p className="text-gray-500">Shares</p>
                          <p className="font-semibold">{stock.shares.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg Price</p>
                          <p className="font-semibold">₹{stock.avgPurchasePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Price</p>
                          <p
                            className={`font-semibold ₹{
                              priceChange >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ₹{stock.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            ₹{stock.investedAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Purchased on {new Date(stock.purchaseDate).toLocaleDateString()}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">
                            Current Value: ₹{stock.currentValue.toLocaleString()}
                          </span>
                          <span
                            className={`ml-2 ₹{
                              priceChange >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ({priceChange >= 0 ? "+" : ""}₹{priceChange.toFixed(2)} /{" "}
                            {priceChangePercentage >= 0 ? "+" : ""}
                            {priceChangePercentage.toFixed(2)}%)
                          </span>
                        </div>
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
