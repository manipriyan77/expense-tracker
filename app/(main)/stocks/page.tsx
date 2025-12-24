"use client";

import { useEffect, useState } from "react";
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
  Calendar,
} from "lucide-react";

interface Stock {
  id: string;
  name: string;
  symbol: string;
  shares: number;
  avgPurchasePrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  sector: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    shares: "",
    avgPurchasePrice: "",
    currentPrice: "",
    purchaseDate: "",
    sector: "",
  });

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    // Mock data for stocks
    const mockStocks: Stock[] = [
      {
        id: "1",
        name: "Apple Inc.",
        symbol: "AAPL",
        shares: 50,
        avgPurchasePrice: 150.00,
        currentPrice: 185.50,
        investedAmount: 7500,
        currentValue: 9275,
        purchaseDate: "2024-01-15",
        sector: "Technology",
      },
      {
        id: "2",
        name: "Microsoft Corporation",
        symbol: "MSFT",
        shares: 30,
        avgPurchasePrice: 280.00,
        currentPrice: 335.20,
        investedAmount: 8400,
        currentValue: 10056,
        purchaseDate: "2024-03-10",
        sector: "Technology",
      },
      {
        id: "3",
        name: "Tesla Inc.",
        symbol: "TSLA",
        shares: 25,
        avgPurchasePrice: 220.00,
        currentPrice: 195.80,
        investedAmount: 5500,
        currentValue: 4895,
        purchaseDate: "2024-05-20",
        sector: "Automotive",
      },
      {
        id: "4",
        name: "Johnson & Johnson",
        symbol: "JNJ",
        shares: 40,
        avgPurchasePrice: 165.00,
        currentPrice: 172.30,
        investedAmount: 6600,
        currentValue: 6892,
        purchaseDate: "2024-07-05",
        sector: "Healthcare",
      },
    ];
    setStocks(mockStocks);
  };

  const handleAddStock = () => {
    if (
      !formData.name ||
      !formData.symbol ||
      !formData.shares ||
      !formData.avgPurchasePrice ||
      !formData.currentPrice
    )
      return;

    const shares = parseFloat(formData.shares);
    const avgPurchasePrice = parseFloat(formData.avgPurchasePrice);
    const currentPrice = parseFloat(formData.currentPrice);
    const investedAmount = shares * avgPurchasePrice;
    const currentValue = shares * currentPrice;

    const newStock: Stock = {
      id: Date.now().toString(),
      name: formData.name,
      symbol: formData.symbol,
      shares,
      avgPurchasePrice,
      currentPrice,
      investedAmount,
      currentValue,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split("T")[0],
      sector: formData.sector || "General",
    };

    setStocks([newStock, ...stocks]);
    setFormData({
      name: "",
      symbol: "",
      shares: "",
      avgPurchasePrice: "",
      currentPrice: "",
      purchaseDate: "",
      sector: "",
    });
    setIsAddDialogOpen(false);
  };

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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Apple Inc."
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., AAPL"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shares">Shares</Label>
                      <Input
                        id="shares"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={formData.shares}
                        onChange={(e) =>
                          setFormData({ ...formData, shares: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avgPurchasePrice">Avg Purchase Price</Label>
                      <Input
                        id="avgPurchasePrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.avgPurchasePrice}
                        onChange={(e) =>
                          setFormData({ ...formData, avgPurchasePrice: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">Current Price</Label>
                    <Input
                      id="currentPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.currentPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, currentPrice: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) =>
                          setFormData({ ...formData, purchaseDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sector">Sector</Label>
                      <Input
                        id="sector"
                        placeholder="e.g., Technology"
                        value={formData.sector}
                        onChange={(e) =>
                          setFormData({ ...formData, sector: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddStock} className="w-full">
                    Add Stock
                  </Button>
                </div>
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
                ${totalInvested.toLocaleString()}
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
                ${totalCurrentValue.toLocaleString()}
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
                {totalGainLoss >= 0 ? "+" : ""}${totalGainLoss.toLocaleString()}
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
                            className={`text-lg font-bold flex items-center ${
                              gainLoss >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {gainLoss >= 0 ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            {gainLoss >= 0 ? "+" : ""}${gainLoss.toLocaleString()}
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
                          <p className="font-semibold">${stock.avgPurchasePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Price</p>
                          <p
                            className={`font-semibold ${
                              priceChange >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ${stock.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            ${stock.investedAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Purchased on {new Date(stock.purchaseDate).toLocaleDateString()}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">
                            Current Value: ${stock.currentValue.toLocaleString()}
                          </span>
                          <span
                            className={`ml-2 ${
                              priceChange >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ({priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)} /{" "}
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
