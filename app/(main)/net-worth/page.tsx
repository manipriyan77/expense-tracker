"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNetWorthStore, type Asset, type Liability } from "@/store/net-worth-store";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function NetWorthPage() {
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
    deleteLiability
  } = useNetWorthStore();

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);
  const [isEditLiabilityOpen, setIsEditLiabilityOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedLiability, setSelectedLiability] = useState<Liability | null>(null);

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
    currency: "USD",
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
    currency: "USD",
    notes: "",
  });

  useEffect(() => {
    fetchAssets();
    fetchLiabilities();
    fetchSnapshots();
  }, [fetchAssets, fetchLiabilities, fetchSnapshots]);

  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Format snapshots for the chart
  const historicalData = snapshots.slice(-6).map((snapshot) => {
    const date = new Date(snapshot.date);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      netWorth: snapshot.net_worth,
      assets: snapshot.total_assets,
      liabilities: snapshot.total_liabilities,
    };
  });

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
      setAssetForm({ name: "", type: "cash", value: "", currency: "USD", notes: "" });
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
        interest_rate: liabilityForm.interest_rate ? parseFloat(liabilityForm.interest_rate) : undefined,
        minimum_payment: liabilityForm.minimum_payment ? parseFloat(liabilityForm.minimum_payment) : undefined,
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
        currency: "USD", 
        notes: "" 
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
        interest_rate: liabilityForm.interest_rate ? parseFloat(liabilityForm.interest_rate) : undefined,
        minimum_payment: liabilityForm.minimum_payment ? parseFloat(liabilityForm.minimum_payment) : undefined,
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

  if (loading && assets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <StatsSkeleton />
      </div>
    );
  }

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
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '$0.00'} />
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
                  <form onSubmit={handleAddAsset} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset Name</Label>
                      <Input 
                        id="assetName" 
                        placeholder="e.g., Savings Account" 
                        value={assetForm.name}
                        onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assetType">Type</Label>
                      <Select 
                        value={assetForm.type} 
                        onValueChange={(value: any) => setAssetForm({ ...assetForm, type: value })}
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
                        onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Asset
                    </Button>
                  </form>
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(asset.value)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditAssetDialog(asset)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${asset.name}?`)) {
                                  try {
                                    await deleteAsset(asset.id);
                                    toast.success("Asset deleted successfully!");
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
                  <form onSubmit={handleAddLiability} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="liabilityName">Liability Name</Label>
                      <Input 
                        id="liabilityName" 
                        placeholder="e.g., Car Loan" 
                        value={liabilityForm.name}
                        onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="liabilityType">Type</Label>
                      <Select 
                        value={liabilityForm.type} 
                        onValueChange={(value: any) => setLiabilityForm({ ...liabilityForm, type: value })}
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
                      <Label htmlFor="liabilityBalance">Current Balance</Label>
                      <Input 
                        id="liabilityBalance" 
                        type="number" 
                        placeholder="0.00" 
                        step="0.01"
                        value={liabilityForm.balance}
                        onChange={(e) => setLiabilityForm({ ...liabilityForm, balance: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%) - Optional</Label>
                      <Input 
                        id="interestRate" 
                        type="number" 
                        placeholder="0.0" 
                        step="0.1" 
                        value={liabilityForm.interest_rate}
                        onChange={(e) => setLiabilityForm({ ...liabilityForm, interest_rate: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Liability
                    </Button>
                  </form>
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
                            {liability.interest_rate && ` • ${liability.interest_rate}% APR`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(liability.balance)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditLiabilityDialog(liability)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${liability.name}?`)) {
                                  try {
                                    await deleteLiability(liability.id);
                                    toast.success("Liability deleted successfully!");
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

      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAsset} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editAssetName">Asset Name</Label>
              <Input 
                id="editAssetName" 
                placeholder="e.g., Savings Account" 
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAssetType">Type</Label>
              <Select 
                value={assetForm.type} 
                onValueChange={(value: any) => setAssetForm({ ...assetForm, type: value })}
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
                onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
            <DialogDescription>
              Update liability information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLiability} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editLiabilityName">Liability Name</Label>
              <Input 
                id="editLiabilityName" 
                placeholder="e.g., Car Loan" 
                value={liabilityForm.name}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLiabilityType">Type</Label>
              <Select 
                value={liabilityForm.type} 
                onValueChange={(value: any) => setLiabilityForm({ ...liabilityForm, type: value })}
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
                onChange={(e) => setLiabilityForm({ ...liabilityForm, balance: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInterestRate">Interest Rate (%) - Optional</Label>
              <Input 
                id="editInterestRate" 
                type="number" 
                placeholder="0.0" 
                step="0.1" 
                value={liabilityForm.interest_rate}
                onChange={(e) => setLiabilityForm({ ...liabilityForm, interest_rate: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Liability
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
