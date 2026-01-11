"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Loader2,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useTransactionsStore } from "@/store/transactions-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useGoalsStore } from "@/store/goals-store";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  prepareMonthlyData,
  linearTrendForecast,
  exponentialSmoothingForecast,
  movingAverageForecast,
  ensembleForecast,
  type ForecastResult,
} from "@/lib/utils/forecasting";

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#ef4444",
  Transportation: "#f97316",
  Entertainment: "#f59e0b",
  Bills: "#eab308",
  Shopping: "#84cc16",
  Healthcare: "#22c55e",
  Savings: "#10b981",
  Investment: "#14b8a6",
  Education: "#06b6d4",
  Travel: "#0ea5e9",
  Other: "#6366f1",
  Salary: "#22c55e",
  Freelance: "#3b82f6",
  Business: "#8b5cf6",
  Gift: "#a855f7",
};

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype?: string;
  date: string;
}

export default function AnalyticsPage() {
  const { transactions, loading: transLoading, fetchTransactions } = useTransactionsStore();
  const { budgets, loading: budgetLoading, fetchBudgets } = useBudgetsStore();
  const { goals, loading: goalsLoading, fetchGoals } = useGoalsStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("6M");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Forecasting state
  const [forecastMethod, setForecastMethod] = useState<"linear" | "exponential" | "moving-average" | "ensemble">("ensemble");
  const [forecastPeriods, setForecastPeriods] = useState<number>(6);
  const [forecastType, setForecastType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const periodDays: Record<typeof selectedPeriod, number> = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 365,
      "ALL": Infinity,
    };

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod]);

    return transactions.filter((t) => {
      const transDate = new Date(t.date);
      const meetsDate = periodDays[selectedPeriod] === Infinity || transDate >= cutoffDate;
      const meetsCategory = selectedCategory === "all" || t.category === selectedCategory;
      return meetsDate && meetsCategory;
    });
  }, [transactions, selectedPeriod, selectedCategory]);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; net: number }> = {};
    
    filteredTransactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expenses: 0, net: 0 };
      }
      
      if (t.type === "income") {
        months[monthKey].income += t.amount;
      } else {
        months[monthKey].expenses += t.amount;
      }
      months[monthKey].net = months[monthKey].income - months[monthKey].expenses;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const date = new Date(key);
        return {
          month: date.toLocaleDateString("en-US", { month: "short" }),
          year: date.getFullYear(),
          ...data,
        };
      })
      .slice(-12); // Last 12 months max
  }, [filteredTransactions]);

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#6366f1",
        percentage: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .map((item, _, arr) => {
        const total = arr.reduce((sum, i) => sum + i.value, 0);
        return {
          ...item,
          percentage: total > 0 ? (item.value / total) * 100 : 0,
        };
      });
  }, [filteredTransactions]);

  // Calculate daily spending pattern
  const dailyPattern = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayData: Record<string, number> = {};
    
    days.forEach((day) => (dayData[day] = 0));
    
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const dayName = days[new Date(t.date).getDay()];
        dayData[dayName] += t.amount;
      });

    return days.map((day) => ({
      day: day.substring(0, 3),
      amount: dayData[day],
    }));
  }, [filteredTransactions]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const net = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    const avgMonthlyIncome = monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length
      : 0;
    
    const avgMonthlyExpenses = monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length
      : 0;

    // Calculate trends
    const recentMonths = monthlyData.slice(-2);
    const incomeTrend = recentMonths.length === 2
      ? ((recentMonths[1].income - recentMonths[0].income) / recentMonths[0].income) * 100
      : 0;
    const expenseTrend = recentMonths.length === 2
      ? ((recentMonths[1].expenses - recentMonths[0].expenses) / recentMonths[0].expenses) * 100
      : 0;

    return {
      income,
      expenses,
      net,
      savingsRate,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      incomeTrend,
      expenseTrend,
      transactionCount: filteredTransactions.length,
      avgTransactionAmount: filteredTransactions.length > 0
        ? filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length
        : 0,
    };
  }, [filteredTransactions, monthlyData]);

  // Budget vs Actual Analysis
  const budgetAnalysis = useMemo(() => {
    return budgets.map((budget) => {
      const spent = budget.spent_amount || 0;
      const limit = budget.limit_amount;
      const percentage = (spent / limit) * 100;
      
      return {
        category: budget.category,
        subtype: budget.subtype,
        spent,
        limit,
        remaining: limit - spent,
        percentage,
        status: percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "good",
      };
    });
  }, [budgets]);

  // Goal Progress Analysis
  const goalAnalysis = useMemo(() => {
    return goals
      .filter((g) => g.status === "active")
      .map((goal) => {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        const remaining = goal.targetAmount - goal.currentAmount;
        
        return {
          title: goal.title,
          current: goal.currentAmount,
          target: goal.targetAmount,
          remaining,
          percentage,
          category: goal.category,
        };
      });
  }, [goals]);

  // Category comparison over months
  const categoryTrends = useMemo(() => {
    const topCategories = categoryData.slice(0, 5);
    const monthMap = new Map<string, Record<string, number>>();

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const date = new Date(t.date);
        const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {});
        }
        
        const monthData = monthMap.get(monthKey)!;
        monthData[t.category] = (monthData[t.category] || 0) + t.amount;
      });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => {
        const [aMonth, aYear] = a.split(" ");
        const [bMonth, bYear] = b.split(" ");
        return new Date(`${aMonth} 1 20${aYear}`).getTime() - new Date(`${bMonth} 1 20${bYear}`).getTime();
      })
      .slice(-6)
      .map(([month, data]) => ({
        month,
        ...Object.fromEntries(
          topCategories.map((cat) => [cat.name, data[cat.name] || 0])
        ),
      }));
  }, [filteredTransactions, categoryData]);

  // Spending radar chart data
  const radarData = useMemo(() => {
    const topCats = categoryData.slice(0, 6);
    const maxValue = Math.max(...topCats.map((c) => c.value), 1);
    
    return topCats.map((cat) => ({
      category: cat.name,
      value: cat.value,
      fullMark: maxValue * 1.2,
    }));
  }, [categoryData]);

  const loading = transLoading || budgetLoading || goalsLoading;
  const allCategories = ["all", ...Array.from(new Set(transactions.map((t) => t.category)))];

  // Compute forecasts
  const forecastData = useMemo(() => {
    if (transactions.length < 3) return null;
    
    const monthlyData = prepareMonthlyData(transactions, forecastType, 12);
    if (monthlyData.length < 3) return null;
    
    let forecast: ForecastResult;
    switch (forecastMethod) {
      case "linear":
        forecast = linearTrendForecast(monthlyData, forecastPeriods);
        break;
      case "exponential":
        forecast = exponentialSmoothingForecast(monthlyData, forecastPeriods);
        break;
      case "moving-average":
        forecast = movingAverageForecast(monthlyData, forecastPeriods);
        break;
      case "ensemble":
      default:
        forecast = ensembleForecast(monthlyData, forecastPeriods);
        break;
    }
    
    // Combine historical and forecast data for chart
    const historicalData = monthlyData.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      actual: d.value,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));
    
    const forecastChartData = forecast.forecasts.map(f => ({
      date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      actual: null as number | null,
      predicted: f.predicted,
      lower: f.lower,
      upper: f.upper,
    }));
    
    return {
      ...forecast,
      chartData: [...historicalData, ...forecastChartData],
      historicalData: monthlyData,
    };
  }, [transactions, forecastMethod, forecastPeriods, forecastType]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Comprehensive insights into your financial data
              </p>
            </div>
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof selectedPeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">Last Month</SelectItem>
                  <SelectItem value="3M">Last 3 Months</SelectItem>
                  <SelectItem value="6M">Last 6 Months</SelectItem>
                  <SelectItem value="1Y">Last Year</SelectItem>
                  <SelectItem value="ALL">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{statistics.income.toFixed(2)}
              </div>
              <div className="flex items-center text-xs text-gray-600 mt-1">
                {statistics.incomeTrend >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={statistics.incomeTrend >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(statistics.incomeTrend).toFixed(1)}%
                </span>
                <span className="ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{statistics.expenses.toFixed(2)}
              </div>
              <div className="flex items-center text-xs text-gray-600 mt-1">
                {statistics.expenseTrend >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-red-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-green-600 mr-1" />
                )}
                <span className={statistics.expenseTrend >= 0 ? "text-red-600" : "text-green-600"}>
                  {Math.abs(statistics.expenseTrend).toFixed(1)}%
                </span>
                <span className="ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statistics.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{statistics.net.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {statistics.transactionCount} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statistics.savingsRate.toFixed(1)}%
              </div>
              <Progress value={Math.min(statistics.savingsRate, 100)} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="budgets">Budget Analysis</TabsTrigger>
            <TabsTrigger value="goals">Goal Tracking</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses Trend</CardTitle>
                  <CardDescription>Monthly comparison over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }}
                        formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="income"
                        fill="#22c55e"
                        stroke="#22c55e"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        fill="#ef4444"
                        stroke="#ef4444"
                        fillOpacity={0.3}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Distribution</CardTitle>
                  <CardDescription>Breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Daily Spending Pattern */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Spending Pattern</CardTitle>
                  <CardDescription>Average spending by day of week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyPattern}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                      <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Spending Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Spending Radar</CardTitle>
                  <CardDescription>Top categories at a glance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fontSize: 11 }} />
                      <Radar
                        name="Spending"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                      />
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Categories List */}
            <Card>
              <CardHeader>
                <CardTitle>Top Spending Categories</CardTitle>
                <CardDescription>Detailed breakdown of your expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.slice(0, 8).map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{category.value.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Trends Over Time</CardTitle>
                <CardDescription>Compare category spending across months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={categoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                    <Legend />
                    {categoryData.slice(0, 5).map((cat, idx) => (
                      <Line
                        key={cat.name}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={cat.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Monthly Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{statistics.avgMonthlyIncome.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Based on {monthlyData.length} months
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Monthly Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{statistics.avgMonthlyExpenses.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Based on {monthlyData.length} months
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{statistics.avgTransactionAmount.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Per transaction average
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Net Cash Flow</CardTitle>
                <CardDescription>Monthly surplus/deficit visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                    <Bar dataKey="net" fill="#6366f1" radius={[8, 8, 0, 0]}>
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Detailed category breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={categoryData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {categoryData.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Percentage</CardTitle>
                  <CardDescription>Relative spending distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(1) : '0'}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Budget Analysis Tab */}
          <TabsContent value="budgets" className="space-y-6">
            {budgetAnalysis.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {budgetAnalysis.map((budget, idx) => (
                    <Card key={idx} className={budget.status === "over" ? "border-red-500" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{budget.category}</CardTitle>
                          {budget.status === "over" ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : budget.status === "warning" ? (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                          ) : null}
                        </div>
                        {budget.subtype && (
                          <CardDescription className="text-xs">{budget.subtype}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Spent:</span>
                          <span className="font-semibold">₹{budget.spent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Limit:</span>
                          <span className="font-semibold">₹{budget.limit.toFixed(2)}</span>
                        </div>
                        <Progress 
                          value={Math.min(budget.percentage, 100)} 
                          className={`h-2 ${
                            budget.status === "over" ? "bg-red-200" : 
                            budget.status === "warning" ? "bg-orange-200" : ""
                          }`}
                        />
                        <div className="flex justify-between text-xs">
                          <span className={
                            budget.status === "over" ? "text-red-600 font-semibold" :
                            budget.status === "warning" ? "text-orange-600 font-semibold" :
                            "text-gray-600"
                          }>
                            {budget.percentage.toFixed(1)}% used
                          </span>
                          <span className={budget.remaining < 0 ? "text-red-600 font-semibold" : "text-gray-600"}>
                            ₹{Math.abs(budget.remaining).toFixed(2)} {budget.remaining < 0 ? "over" : "left"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Budget Performance Overview</CardTitle>
                    <CardDescription>Compare all budgets at once</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={budgetAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                        <Legend />
                        <Bar dataKey="spent" fill="#ef4444" name="Spent" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="limit" fill="#22c55e" name="Limit" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">No Budgets Set</p>
                  <p className="text-gray-600 mb-4">
                    Create budgets to track your spending limits
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            {goalAnalysis.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goalAnalysis.map((goal, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{goal.title}</CardTitle>
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardDescription>{goal.category}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current:</span>
                            <span className="font-semibold">₹{goal.current.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Target:</span>
                            <span className="font-semibold">₹{goal.target.toFixed(2)}</span>
                          </div>
                          <Progress value={Math.min(goal.percentage, 100)} className="h-3" />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{goal.percentage.toFixed(1)}% complete</span>
                            <span>₹{goal.remaining.toFixed(2)} to go</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Goal Progress Comparison</CardTitle>
                    <CardDescription>Track all your goals together</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={goalAnalysis} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number | undefined) => value !== undefined ? `₹${value.toFixed(2)}` : '₹0.00'} />
                        <Legend />
                        <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[0, 8, 8, 0]} />
                        <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">No Active Goals</p>
                  <p className="text-gray-600 mb-4">
                    Set financial goals to track your progress
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Financial Forecasting</span>
                </CardTitle>
                <CardDescription>
                  Advanced predictions using multiple forecasting models
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Forecast Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Forecast Type</Label>
                    <Select value={forecastType} onValueChange={(value: "income" | "expense") => setForecastType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expenses</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Forecasting Method</Label>
                    <Select value={forecastMethod} onValueChange={(value: any) => setForecastMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ensemble">Ensemble (Best)</SelectItem>
                        <SelectItem value="exponential">Exponential Smoothing</SelectItem>
                        <SelectItem value="linear">Linear Trend</SelectItem>
                        <SelectItem value="moving-average">Moving Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Forecast Months</Label>
                    <Select value={forecastPeriods.toString()} onValueChange={(value) => setForecastPeriods(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {forecastData ? (
                  <>
                    {/* Forecast Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Trend Direction</p>
                              <p className="text-2xl font-bold capitalize flex items-center space-x-2">
                                {forecastData.trend === "increasing" && <ArrowUpRight className="h-6 w-6 text-red-600" />}
                                {forecastData.trend === "decreasing" && <ArrowDownRight className="h-6 w-6 text-green-600" />}
                                <span className={
                                  forecastData.trend === "increasing" ? "text-red-600" :
                                  forecastData.trend === "decreasing" ? "text-green-600" :
                                  "text-gray-600"
                                }>
                                  {forecastData.trend}
                                </span>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div>
                            <p className="text-sm text-gray-600">Forecasting Model</p>
                            <p className="text-lg font-bold">{forecastData.method}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {forecastData.seasonality ? "Seasonality detected" : "No seasonality"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div>
                            <p className="text-sm text-gray-600">Next Month Prediction</p>
                            <p className="text-2xl font-bold text-indigo-600">
                              ₹{forecastData.forecasts[0]?.predicted.toFixed(0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Range: ₹{forecastData.forecasts[0]?.lower.toFixed(0)} - ₹{forecastData.forecasts[0]?.upper.toFixed(0)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Forecast Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Historical Data & Forecast</CardTitle>
                        <CardDescription>
                          Blue line shows historical data, orange shows predictions with confidence intervals
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <ComposedChart data={forecastData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: any) => value ? `₹${value.toFixed(0)}` : 'N/A'}
                              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                            />
                            <Legend />
                            
                            {/* Confidence interval area */}
                            <Area
                              type="monotone"
                              dataKey="upper"
                              stroke="none"
                              fill="#fbbf24"
                              fillOpacity={0.2}
                              name="Upper Bound"
                            />
                            <Area
                              type="monotone"
                              dataKey="lower"
                              stroke="none"
                              fill="#fbbf24"
                              fillOpacity={0.2}
                              name="Lower Bound"
                            />
                            
                            {/* Historical data */}
                            <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', r: 4 }}
                              name="Historical"
                            />
                            
                            {/* Forecast */}
                            <Line
                              type="monotone"
                              dataKey="predicted"
                              stroke="#f97316"
                              strokeWidth={3}
                              strokeDasharray="5 5"
                              dot={{ fill: '#f97316', r: 4 }}
                              name="Forecast"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Forecast Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Detailed Forecast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4">Month</th>
                                <th className="text-right py-3 px-4">Predicted</th>
                                <th className="text-right py-3 px-4">Lower Bound</th>
                                <th className="text-right py-3 px-4">Upper Bound</th>
                                <th className="text-right py-3 px-4">Range</th>
                              </tr>
                            </thead>
                            <tbody>
                              {forecastData.forecasts.map((forecast, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    {new Date(forecast.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </td>
                                  <td className="text-right py-3 px-4 font-semibold text-indigo-600">
                                    ₹{forecast.predicted.toFixed(0).toLocaleString()}
                                  </td>
                                  <td className="text-right py-3 px-4 text-gray-600">
                                    ₹{forecast.lower.toFixed(0).toLocaleString()}
                                  </td>
                                  <td className="text-right py-3 px-4 text-gray-600">
                                    ₹{forecast.upper.toFixed(0).toLocaleString()}
                                  </td>
                                  <td className="text-right py-3 px-4 text-sm text-gray-500">
                                    ±₹{((forecast.upper - forecast.lower) / 2).toFixed(0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insights & Recommendations */}
                    <Card className="border-2 border-indigo-200 bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-indigo-600" />
                          <span>AI Insights</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {forecastData.trend === "increasing" && forecastType === "expense" && (
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-red-100 rounded-full">
                              <TrendingUp className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Rising Expenses Detected</p>
                              <p className="text-sm text-gray-600">
                                Your expenses are trending upward. Consider reviewing your budget and identifying areas to cut back.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {forecastData.trend === "decreasing" && forecastType === "expense" && (
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <TrendingDown className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Great Progress!</p>
                              <p className="text-sm text-gray-600">
                                Your expenses are trending downward. Keep up the good work with your spending habits!
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {forecastData.seasonality && (
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Seasonal Pattern Found</p>
                              <p className="text-sm text-gray-600">
                                Your {forecastType} shows seasonal variations. Plan ahead for months with higher predicted values.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-full">
                            <Target className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Forecast Confidence</p>
                            <p className="text-sm text-gray-600">
                              The {forecastData.method.toLowerCase()} model provides predictions with 95% confidence intervals. 
                              Wider ranges indicate higher uncertainty.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-gray-900 mb-2">Insufficient Data</p>
                      <p className="text-gray-600">
                        Need at least 3 months of transaction data to generate forecasts
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
