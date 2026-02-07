"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type DefaultValues, type Resolver } from "react-hook-form";
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
  Upload,
} from "lucide-react";
import { useStocksStore, type Stock } from "@/store/stocks-store";
import {
  stockFormSchema,
  StockFormData,
} from "@/lib/schemas/stock-form-schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const SECTOR_OPTIONS: StockFormData["sector"][] = [
  "consumer_discretionary",
  "communication_services",
  "consumer_staples",
  "energy",
  "financials",
  "health_care",
  "industrials",
  "information_technology",
  "materials",
  "real_estate",
  "utilities",
  "etf",
  "other",
];

const CONSUMER_DISCRETIONARY_SUBSECTORS: StockFormData["subSector"][] = [
  "auto_parts",
  "tires_rubber",
  "four_wheelers",
  "three_wheelers",
  "two_wheelers",
  "cycles",
  "education_services",
  "wellness_services",
  "hotels_resorts_cruise",
  "restaurants_cafes",
  "theme_parks_gaming",
  "tour_travel_services",
  "home_electronics_appliances",
  "home_furnishing",
  "housewares",
  "retail_apparel",
  "retail_department_stores",
  "retail_online",
  "retail_speciality",
  "apparel_accessories",
  "footwear",
  "precious_metals_jewellery",
  "textiles",
];

const formatLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const defaultValues: DefaultValues<StockFormData> = {
  name: "",
  symbol: "",
  stockType: "large_cap",
  shares: 0,
  avgPurchasePrice: 0,
  currentPrice: 0,
  investedAmount: 0,
  currentValue: 0,
  purchaseDate: "",
  sector: "consumer_discretionary",
  subSector: "auto_parts",
};

export default function StocksPage() {
  const { format } = useFormatCurrency();
  const {
    stocks,
    loading,
    error,
    fetchStocks,
    addStock,
    updateStock,
    deleteStock,
  } = useStocksStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StockFormData>({
    resolver: zodResolver(stockFormSchema) as Resolver<StockFormData>,
    defaultValues,
  });

  const shares = watch("shares");
  const avgPurchasePrice = watch("avgPurchasePrice");
  const currentPrice = watch("currentPrice");
  const sector = watch("sector");
  const subSector = watch("subSector");
  const purchaseDate = watch("purchaseDate");

  const parsedPurchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;

  const subSectorOptions = useMemo<StockFormData["subSector"][]>(() => {
    if (sector === "consumer_discretionary")
      return CONSUMER_DISCRETIONARY_SUBSECTORS;
    return ["other"] as StockFormData["subSector"][];
  }, [sector]);

  useEffect(() => {
    if (!subSectorOptions.includes(subSector as StockFormData["subSector"])) {
      setValue("subSector", subSectorOptions[0] as StockFormData["subSector"]);
    }
  }, [subSectorOptions, subSector, setValue]);

  useEffect(() => {
    fetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpsertStock = async (data: StockFormData) => {
    const investedAmount = data.shares * data.avgPurchasePrice;
    const currentValue = data.shares * data.currentPrice;

    const newStock = {
      name: data.name,
      symbol: data.symbol,
      stockType: data.stockType,
      shares: data.shares,
      avgPurchasePrice: data.avgPurchasePrice,
      currentPrice: data.currentPrice,
      investedAmount,
      currentValue,
      purchaseDate: data.purchaseDate || new Date().toISOString().split("T")[0],
      sector: data.sector || "consumer_discretionary",
      subSector: data.subSector || subSectorOptions[0],
    };

    if (editingStock) {
      await updateStock(editingStock.id, newStock);
    } else {
      await addStock(newStock);
    }

    reset();
    setEditingStock(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteStock(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Find the header row (contains "Symbol" or "Company Name" or "Security")
      const headerIndex = lines.findIndex(
        (line) =>
          line.includes("Symbol") ||
          line.includes("Company") ||
          line.includes("Security"),
      );
      if (headerIndex === -1) {
        alert("Invalid CSV format. Could not find header row.");
        return;
      }

      const headers = lines[headerIndex]
        .split(",")
        .map((h) => h.replace(/^"|"$/g, "").trim());

      // Map column names to indices - adapt based on the CSV structure
      const getIndex = (name: string) =>
        headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

      const symbolIdx =
        getIndex("Symbol") >= 0 ? getIndex("Symbol") : getIndex("Security");
      const nameIdx =
        getIndex("Name") >= 0 ? getIndex("Name") : getIndex("Company");
      const sharesIdx =
        getIndex("Quantity") >= 0
          ? getIndex("Quantity")
          : getIndex("Shares") >= 0
            ? getIndex("Shares")
            : getIndex("Qty");
      const avgPriceIdx =
        getIndex("Average Cost") >= 0
          ? getIndex("Average Cost")
          : getIndex("Avg") >= 0
            ? getIndex("Avg")
            : getIndex("Purchase Price");
      const currentPriceIdx =
        getIndex("LTP") >= 0 ? getIndex("LTP") : getIndex("Current Price");
      const investedIdx =
        getIndex("Invested Value") >= 0
          ? getIndex("Invested Value")
          : getIndex("Invested") >= 0
            ? getIndex("Invested")
            : getIndex("Invest Value");
      const currentValueIdx =
        getIndex("Current Value") >= 0
          ? getIndex("Current Value")
          : getIndex("Current") >= 0
            ? getIndex("Current")
            : getIndex("Cur. val");
      const purchaseDateIdx = getIndex("Date") >= 0 ? getIndex("Date") : -1;

      // Process data rows
      const dataLines = lines.slice(headerIndex + 1);
      let successCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const failedStocks: string[] = [];

      for (const line of dataLines) {
        // Skip empty lines, total rows, smallcases section, or other non-stock rows
        if (
          !line.trim() ||
          line.includes("Total") ||
          line.includes("Visit:") ||
          line.includes("Smallcases") ||
          line.includes("Equity &") ||
          line.includes("Asset Allocation")
        )
          continue;

        // Parse CSV line - handle both comma-separated and quoted formats
        const values = line.includes('","')
          ? line.split('","').map((v) => v.replace(/^"|"$/g, "").trim())
          : line.split(",").map((v) => v.trim());

        const symbol = values[symbolIdx];
        if (!symbol || symbol === "" || symbol === "-") continue;

        try {
          const name =
            nameIdx >= 0 && values[nameIdx] ? values[nameIdx] : symbol;
          const shares = parseFloat(
            values[sharesIdx]?.replace(/[,]/g, "") || "0",
          );
          const avgPrice = parseFloat(
            values[avgPriceIdx]?.replace(/[₹,]/g, "") || "0",
          );
          const currentPrice = parseFloat(
            values[currentPriceIdx]?.replace(/[₹,]/g, "") ||
              avgPrice.toString(),
          );
          const investedAmount =
            investedIdx >= 0
              ? parseFloat(values[investedIdx]?.replace(/[₹,]/g, "") || "0")
              : shares * avgPrice;
          const currentValue =
            currentValueIdx >= 0
              ? parseFloat(values[currentValueIdx]?.replace(/[₹,]/g, "") || "0")
              : shares * currentPrice;
          const purchaseDate =
            purchaseDateIdx >= 0 && values[purchaseDateIdx]
              ? values[purchaseDateIdx]
              : new Date().toISOString().split("T")[0];

          // Skip if essential data is missing or invalid
          if (shares <= 0 || avgPrice <= 0) {
            console.warn(`Skipping ${symbol}: invalid shares or price`);
            continue;
          }

          // Check if stock already exists and delete it
          const existingStock = stocks.find(
            (s) =>
              s.symbol.toLowerCase() === symbol.toLowerCase() ||
              s.name.toLowerCase() === name.toLowerCase(),
          );
          if (existingStock) {
            await deleteStock(existingStock.id);
            updatedCount++;
          }

          await addStock({
            name,
            symbol,
            shares,
            avgPurchasePrice: avgPrice,
            currentPrice,
            investedAmount,
            currentValue,
            purchaseDate,
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to import ${symbol}:`, error);
          failedCount++;
          failedStocks.push(symbol);
        }
      }

      let message = `Import complete!\n\n`;
      message += `✓ New stocks added: ${successCount - updatedCount}\n`;
      if (updatedCount > 0) {
        message += `✓ Existing stocks updated: ${updatedCount}\n`;
      }
      message += `✓ Total processed: ${successCount}`;

      if (failedCount > 0) {
        message += `\n\n✗ Failed to import ${failedCount} stocks:\n${failedStocks.join("\n")}`;
      }
      alert(message);
      event.target.value = ""; // Reset file input
    } catch (error) {
      console.error("Error parsing CSV:", error);
      alert("Failed to parse CSV file. Please check the format.");
    } finally {
      setIsUploading(false);
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
          <Button onClick={fetchStocks} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalInvested = stocks.reduce(
    (sum, stock) => sum + stock.investedAmount,
    0,
  );
  const totalCurrentValue = stocks.reduce(
    (sum, stock) => sum + stock.currentValue,
    0,
  );
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercentage =
    totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <h1 className="text-xl font-bold text-gray-900">Stocks Tracker</h1>
            <div className="flex gap-2">
              <label htmlFor="csv-upload-stocks">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading || loading}
                  onClick={() =>
                    document.getElementById("csv-upload-stocks")?.click()
                  }
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import CSV
                </Button>
              </label>
              <input
                id="csv-upload-stocks"
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) setEditingStock(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingStock(null);
                      reset({
                        stockType: "large_cap",
                        sector: "consumer_discretionary",
                        subSector: "auto_parts",
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStock ? "Edit Stock" : "Add Stock"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingStock
                        ? "Update this stock's details."
                        : "Add a stock to track its performance."}
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleSubmit(handleUpsertStock)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Apple Inc."
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600">
                          {errors.name.message}
                        </p>
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
                        <p className="text-sm text-red-600">
                          {errors.symbol.message}
                        </p>
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
                          <p className="text-sm text-red-600">
                            {errors.shares.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="avgPurchasePrice">
                          Avg Purchase Price
                        </Label>
                        <Input
                          id="avgPurchasePrice"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register("avgPurchasePrice", {
                            valueAsNumber: true,
                          })}
                        />
                        {errors.avgPurchasePrice && (
                          <p className="text-sm text-red-600">
                            {errors.avgPurchasePrice.message}
                          </p>
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
                        <p className="text-sm text-red-600">
                          {errors.currentPrice.message}
                        </p>
                      )}
                    </div>

                    {shares && avgPurchasePrice && currentPrice && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Invested: {format(shares * avgPurchasePrice)}</div>
                        <div>
                          Current Value: {format(shares * currentPrice)}
                        </div>
                        <div
                          className={
                            shares * currentPrice - shares * avgPurchasePrice >=
                            0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          P&L:{" "}
                          {format(
                            shares * currentPrice - shares * avgPurchasePrice,
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="purchaseDate">Purchase Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !parsedPurchaseDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {parsedPurchaseDate
                                ? parsedPurchaseDate.toLocaleDateString()
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parsedPurchaseDate}
                              onSelect={(date) =>
                                setValue(
                                  "purchaseDate",
                                  date ? date.toISOString().split("T")[0] : "",
                                  { shouldDirty: true, shouldTouch: true },
                                )
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.purchaseDate && (
                          <p className="text-sm text-red-600">
                            {errors.purchaseDate.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sector">Sector</Label>
                          <Select
                            value={sector}
                            onValueChange={(val) =>
                              setValue(
                                "sector",
                                val as StockFormData["sector"],
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                },
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select sector" />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTOR_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {formatLabel(opt)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.sector && (
                            <p className="text-sm text-red-600">
                              {errors.sector.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subSector">Sub Sector</Label>
                          <Select
                            value={subSector}
                            onValueChange={(val) =>
                              setValue(
                                "subSector",
                                val as StockFormData["subSector"],
                                {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                },
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select sub sector" />
                            </SelectTrigger>
                            <SelectContent>
                              {subSectorOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {formatLabel(opt)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.subSector && (
                            <p className="text-sm text-red-600">
                              {errors.subSector.message}
                            </p>
                          )}
                        </div>
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
                          {editingStock ? "Saving..." : "Adding Stock..."}
                        </>
                      ) : editingStock ? (
                        "Save Changes"
                      ) : (
                        "Add Stock"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
              <CardTitle className="text-sm font-medium">
                Total Invested
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold">{format(totalInvested)}</div>
              <p className="text-xs text-muted-foreground">Across all stocks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
              <CardTitle className="text-sm font-medium">
                Current Value
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold">
                {format(totalCurrentValue)}
              </div>
              <p className="text-xs text-muted-foreground">Portfolio value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div
                className={`text-xl font-bold ${
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
              <CardTitle className="text-sm font-medium">
                Stocks Count
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold">{stocks.length}</div>
              <p className="text-xs text-muted-foreground">Active holdings</p>
            </CardContent>
          </Card>
        </div>

        {/* Stocks List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Stock Portfolio</CardTitle>
            <CardDescription>
              Track your stock investments and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stocks.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No stocks yet. Add your first stock above!
                </p>
              ) : (
                stocks.map((stock) => {
                  const gainLoss = stock.currentValue - stock.investedAmount;
                  const gainLossPercentage =
                    (gainLoss / stock.investedAmount) * 100;
                  const priceChange =
                    stock.currentPrice - stock.avgPurchasePrice;
                  const priceChangePercentage =
                    (priceChange / stock.avgPurchasePrice) * 100;

                  return (
                    <div
                      key={stock.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {stock.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {stock.symbol}
                            {stock.sector && ` • ${formatLabel(stock.sector)}`}
                            {stock.subSector &&
                              ` • ${formatLabel(stock.subSector)}`}
                            {stock.stockType &&
                              ` • ${formatLabel(stock.stockType)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStock(stock);
                              reset({
                                name: stock.name,
                                symbol: stock.symbol,
                                stockType: stock.stockType ?? "other",
                                shares: stock.shares,
                                avgPurchasePrice: stock.avgPurchasePrice,
                                currentPrice: stock.currentPrice,
                                investedAmount: stock.investedAmount,
                                currentValue: stock.currentValue,
                                purchaseDate: stock.purchaseDate,
                                sector:
                                  (stock.sector as StockFormData["sector"]) ??
                                  "consumer_discretionary",
                                subSector:
                                  (stock.subSector as StockFormData["subSector"]) ??
                                  "auto_parts",
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
                            disabled={deletingId === stock.id || loading}
                            onClick={() => handleDelete(stock.id, stock.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deletingId === stock.id ? "Deleting..." : "Delete"}
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

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Shares</p>
                          <p className="font-semibold">
                            {stock.shares.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg Price</p>
                          <p className="font-semibold">
                            {format(stock.avgPurchasePrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Price</p>
                          <p
                            className={`font-semibold ${
                              priceChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {format(stock.currentPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Invested</p>
                          <p className="font-semibold">
                            {format(stock.investedAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Purchased on{" "}
                          {new Date(stock.purchaseDate).toLocaleDateString()}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">
                            Current Value: {format(stock.currentValue)}
                          </span>
                          <span
                            className={`ml-2 ${
                              priceChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ({priceChange >= 0 ? "+" : ""}
                            {format(priceChange)} /{" "}
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
