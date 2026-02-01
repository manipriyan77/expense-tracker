"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useGoldStore } from "@/store/gold-store";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { useStocksStore } from "@/store/stocks-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useForexStore } from "@/store/forex-store";
import { ExternalLink, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { Loader2 } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function AssetsOverviewPage() {
  const { format } = useFormatCurrency();
  const { holdings, load: loadGold, loading: goldLoading } = useGoldStore();
  const {
    mutualFunds,
    fetchMutualFunds,
    loading: mfLoading,
  } = useMutualFundsStore();
  const { stocks, fetchStocks, loading: stocksLoading } = useStocksStore();
  const { assets, liabilities, fetchAssets, fetchLiabilities } =
    useNetWorthStore();
  const {
    entries: forexEntries,
    load: loadForex,
    loading: forexLoading,
  } = useForexStore();

  useEffect(() => {
    loadGold();
    fetchMutualFunds();
    fetchStocks();
    fetchAssets();
    fetchLiabilities();
    loadForex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allocation = useMemo(() => {
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

    const items = [
      { name: "Gold", value: goldValue },
      { name: "Mutual Funds", value: mfValue },
      { name: "Stocks", value: stockValue },
      { name: "Forex", value: forexValue },
    ].filter((i) => i.value > 0);

    const total = items.reduce((sum, i) => sum + i.value, 0);
    return { items, total };
  }, [holdings, mutualFunds, stocks, forexEntries]);

  const mutualFundCategories = useMemo(() => {
    const totals = mutualFunds.reduce<Record<string, number>>((acc, fund) => {
      const key = fund.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + fund.currentValue;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [mutualFunds]);

  const stockCategories = useMemo(() => {
    const totals = stocks.reduce<Record<string, number>>((acc, stock) => {
      const key = stock.sector || "Uncategorized";
      acc[key] = (acc[key] || 0) + stock.currentValue;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [stocks]);

  // Calculate net worth
  const totalManualAssets = useMemo(
    () => assets.reduce((sum, asset) => sum + asset.value, 0),
    [assets],
  );
  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, liability) => sum + liability.balance, 0),
    [liabilities],
  );
  const netWorth = allocation.total + totalManualAssets - totalLiabilities;

  const isLoading = goldLoading || mfLoading || stocksLoading || forexLoading;

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Asset Allocation</h1>
        <p className="text-xs text-gray-600">
          Combined view of your assets across gold, mutual funds, stocks, and
          forex.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Total Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 text-xl font-bold">
            {format(allocation.total + totalManualAssets)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 text-xl font-bold">
            {allocation.items.length}
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <div className="text-xl font-bold text-blue-600">
              {format(netWorth)}
            </div>
            <Link
              href="/net-worth"
              className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
            >
              View Full Details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 text-xl font-bold text-red-600">
            {format(totalLiabilities)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
          <CardDescription>Distribution by current value</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 w-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : allocation.items.length === 0 ? (
            <p className="text-center text-gray-500 py-6 w-full">
              No asset data yet. Add gold or fetch investments.
            </p>
          ) : (
            <>
              <div className="h-80">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={allocation.items}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ percent = 0 }) =>
                        `${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {allocation.items.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => format((value ?? 0) as number)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {allocation.items.map((item, idx) => {
                  const share = allocation.total
                    ? ((item.value / allocation.total) * 100).toFixed(1)
                    : "0";
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {share}% of assets
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{format(item.value)}</p>
                      </div>
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
          <CardHeader>
            <CardTitle>Mutual Funds by Category</CardTitle>
            <CardDescription>Breakdown of MF current value</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : mutualFundCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No mutual fund data yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={mutualFundCategories}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={45}
                        paddingAngle={2}
                        label={({ percent = 0 }) =>
                          `${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {mutualFundCategories.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => format((value ?? 0) as number)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {mutualFundCategories.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <div>
                          <p className="font-semibold">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{format(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stocks by Sector</CardTitle>
            <CardDescription>Breakdown of stock current value</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stockCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No stock data yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={stockCategories}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={45}
                        paddingAngle={2}
                        label={({ percent = 0 }) =>
                          `${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {stockCategories.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => format((value ?? 0) as number)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {stockCategories.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <div>
                          <p className="font-semibold">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{format(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
