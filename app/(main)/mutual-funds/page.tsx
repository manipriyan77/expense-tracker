"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
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

interface MutualFund {
  id: string;
  name: string;
  symbol: string;
  investedAmount: number;
  currentValue: number;
  units: number;
  nav: number;
  purchaseDate: string;
  category: string;
}

export default function MutualFundsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutualFunds, setMutualFunds] = useState<MutualFund[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    investedAmount: "",
    units: "",
    nav: "",
    purchaseDate: "",
    category: "",
  });

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session) {
        router.push("/sign-in");
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/sign-in");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    loadMutualFunds();
  }, []);

  const loadMutualFunds = async () => {
    // Mock data for mutual funds
    const mockFunds: MutualFund[] = [
      {
        id: "1",
        name: "SBI Bluechip Fund",
        symbol: "SBIBLU",
        investedAmount: 50000,
        currentValue: 58750,
        units: 125.5,
        nav: 468.50,
        purchaseDate: "2024-06-15",
        category: "Large Cap",
      },
      {
        id: "2",
        name: "HDFC Mid-Cap Opportunities",
        symbol: "HDFMID",
        investedAmount: 30000,
        currentValue: 31200,
        units: 85.2,
        nav: 366.20,
        purchaseDate: "2024-08-01",
        category: "Mid Cap",
      },
      {
        id: "3",
        name: "ICICI Prudential Technology",
        symbol: "ICICTECH",
        investedAmount: 25000,
        currentValue: 26800,
        units: 45.8,
        nav: 585.20,
        purchaseDate: "2024-09-10",
        category: "Sectoral",
      },
    ];
    setMutualFunds(mockFunds);
  };

  const handleAddMutualFund = () => {
    if (
      !formData.name ||
      !formData.symbol ||
      !formData.investedAmount ||
      !formData.units ||
      !formData.nav
    )
      return;

    const investedAmount = parseFloat(formData.investedAmount);
    const units = parseFloat(formData.units);
    const nav = parseFloat(formData.nav);
    const currentValue = units * nav;

    const newFund: MutualFund = {
      id: Date.now().toString(),
      name: formData.name,
      symbol: formData.symbol,
      investedAmount,
      currentValue,
      units,
      nav,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split("T")[0],
      category: formData.category || "General",
    };

    setMutualFunds([newFund, ...mutualFunds]);
    setFormData({
      name: "",
      symbol: "",
      investedAmount: "",
      units: "",
      nav: "",
      purchaseDate: "",
      category: "",
    });
    setIsAddDialogOpen(false);
  };

  const totalInvested = mutualFunds.reduce((sum, fund) => sum + fund.investedAmount, 0);
  const totalCurrentValue = mutualFunds.reduce((sum, fund) => sum + fund.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Fund Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., SBI Bluechip Fund"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol/Code</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., SBIBLU"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investedAmount">Invested Amount</Label>
                    <Input
                      id="investedAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.investedAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, investedAmount: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="units">Units</Label>
                      <Input
                        id="units"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.units}
                        onChange={(e) =>
                          setFormData({ ...formData, units: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nav">Current NAV</Label>
                      <Input
                        id="nav"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.nav}
                        onChange={(e) =>
                          setFormData({ ...formData, nav: e.target.value })
                        }
                      />
                    </div>
                  </div>

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
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Large Cap, Mid Cap, Sectoral"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>

                  <Button onClick={handleAddMutualFund} className="w-full">
                    Add Mutual Fund
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
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            ${fund.investedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Value</p>
                          <p className="font-semibold">
                            ${fund.currentValue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Units</p>
                          <p className="font-semibold">{fund.units.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current NAV</p>
                          <p className="font-semibold">${fund.nav.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Purchased on {new Date(fund.purchaseDate).toLocaleDateString()}</span>
                        <span>
                          Current Value: ${fund.currentValue.toLocaleString()}
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
