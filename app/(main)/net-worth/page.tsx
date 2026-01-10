"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
}

interface Liability {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate?: number;
}

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>([
    { id: "1", name: "Checking Account", type: "cash", value: 5000 },
    { id: "2", name: "Savings Account", type: "bank", value: 15000 },
    { id: "3", name: "Investment Portfolio", type: "investment", value: 50000 },
    { id: "4", name: "Home", type: "property", value: 300000 },
  ]);

  const [liabilities, setLiabilities] = useState<Liability[]>([
    { id: "1", name: "Mortgage", type: "mortgage", balance: 250000, interestRate: 3.5 },
    { id: "2", name: "Car Loan", type: "loan", balance: 15000, interestRate: 4.2 },
    { id: "3", name: "Credit Card", type: "credit_card", balance: 2000, interestRate: 18.9 },
  ]);

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);

  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Mock historical data
  const historicalData = [
    { month: "Jan", netWorth: 95000, assets: 350000, liabilities: 255000 },
    { month: "Feb", netWorth: 97000, assets: 355000, liabilities: 258000 },
    { month: "Mar", netWorth: 99000, assets: 360000, liabilities: 261000 },
    { month: "Apr", netWorth: 101000, assets: 365000, liabilities: 264000 },
    { month: "May", netWorth: 102500, assets: 368000, liabilities: 265500 },
    { month: "Jun", netWorth: 103000, assets: 370000, liabilities: 267000 },
  ];

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "property": return <Home className="h-5 w-5" />;
      case "vehicle": return <Car className="h-5 w-5" />;
      case "investment": return <Briefcase className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const getLiabilityIcon = (type: string) => {
    switch (type) {
      case "credit_card": return <CreditCard className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Net Worth Tracking</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAssets)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                +5.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalLiabilities)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                -1.8% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(netWorth)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Net Worth Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Net Worth Trend</CardTitle>
            <CardDescription>Your net worth over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorNetWorth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assets & Liabilities Tabs */}
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
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
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset Name</Label>
                      <Input id="assetName" placeholder="e.g., Savings Account" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetType">Type</Label>
                      <Select>
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
                      <Input id="assetValue" type="number" placeholder="0.00" />
                    </div>
                    <Button className="w-full">Add Asset</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {assets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          {getAssetIcon(asset.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{asset.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{asset.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(asset.value)}
                        </p>
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
              <Dialog open={isAddLiabilityOpen} onOpenChange={setIsAddLiabilityOpen}>
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
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="liabilityName">Liability Name</Label>
                      <Input id="liabilityName" placeholder="e.g., Car Loan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liabilityType">Type</Label>
                      <Select>
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
                      <Label htmlFor="liabilityBalance">Current Balance</Label>
                      <Input id="liabilityBalance" type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input id="interestRate" type="number" placeholder="0.0" step="0.1" />
                    </div>
                    <Button className="w-full">Add Liability</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {liabilities.map((liability) => (
                <Card key={liability.id} className="hover:shadow-md transition-shadow border-red-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-red-100 rounded-full">
                          {getLiabilityIcon(liability.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{liability.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {liability.type.replace("_", " ")}
                            {liability.interestRate && ` • ${liability.interestRate}% APR`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(liability.balance)}
                        </p>
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
                <CardDescription>Detailed view of your financial position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <h4 className="font-semibold text-green-600">Assets</h4>
                      <span className="font-semibold text-green-600">{formatCurrency(totalAssets)}</span>
                    </div>
                    {assets.map((asset) => {
                      const percentage = (asset.value / totalAssets) * 100;
                      return (
                        <div key={asset.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{asset.name}</span>
                            <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
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
                      <h4 className="font-semibold text-red-600">Liabilities</h4>
                      <span className="font-semibold text-red-600">{formatCurrency(totalLiabilities)}</span>
                    </div>
                    {liabilities.map((liability) => {
                      const percentage = (liability.balance / totalLiabilities) * 100;
                      return (
                        <div key={liability.id} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{liability.name}</span>
                            <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
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
        </Tabs>
      </main>
    </div>
  );
}
