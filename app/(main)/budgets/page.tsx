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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
} from "lucide-react";

interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: "monthly" | "weekly" | "yearly";
  color: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    limit: "",
    period: "monthly" as "monthly" | "weekly" | "yearly",
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    // Mock data
    const mockBudgets: Budget[] = [
      {
        id: "1",
        category: "Food",
        limit: 500,
        spent: 350,
        period: "monthly",
        color: "#ef4444",
      },
      {
        id: "2",
        category: "Transportation",
        limit: 200,
        spent: 180,
        period: "monthly",
        color: "#f97316",
      },
      {
        id: "3",
        category: "Entertainment",
        limit: 150,
        spent: 165,
        period: "monthly",
        color: "#f59e0b",
      },
      {
        id: "4",
        category: "Bills",
        limit: 400,
        spent: 400,
        period: "monthly",
        color: "#eab308",
      },
      {
        id: "5",
        category: "Shopping",
        limit: 300,
        spent: 120,
        period: "monthly",
        color: "#84cc16",
      },
    ];
    setBudgets(mockBudgets);
  };

  const handleAddBudget = () => {
    if (!formData.category || !formData.limit) return;

    const newBudget: Budget = {
      id: Date.now().toString(),
      category: formData.category,
      limit: parseFloat(formData.limit),
      spent: 0,
      period: formData.period,
      color: "#8b5cf6",
    };

    setBudgets([...budgets, newBudget]);
    setFormData({ category: "", limit: "", period: "monthly" });
    setIsAddDialogOpen(false);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-600";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100)
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (percentage >= 80)
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = (totalSpent / totalBudget) * 100 || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Budget Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Budget Status</CardTitle>
            <CardDescription>Your total budget across all categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${totalSpent.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(totalBudget - totalSpent).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{overallPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={overallPercentage} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Budget Button */}
        <div className="mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
                <DialogDescription>
                  Set a spending limit for a category
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Bills">Bills</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit">Budget Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.limit}
                    onChange={(e) =>
                      setFormData({ ...formData, limit: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value: "monthly" | "weekly" | "yearly") =>
                      setFormData({ ...formData, period: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddBudget} className="w-full">
                  Create Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.limit) * 100;
            const remaining = budget.limit - budget.spent;

            return (
              <Card key={budget.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: budget.color }}
                      />
                      <CardTitle className="text-lg">{budget.category}</CardTitle>
                    </div>
                    {getStatusIcon(percentage)}
                  </div>
                  <CardDescription className="capitalize">
                    {budget.period} budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Spent</p>
                      <p className="text-xl font-bold">${budget.spent.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Limit</p>
                      <p className="text-xl font-bold">${budget.limit.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className={percentage >= 100 ? "text-red-600" : ""}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={Math.min(percentage, 100)} />
                      <div
                        className={`absolute top-0 left-0 h-full ${getProgressColor(percentage)} rounded-full transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Remaining</p>
                        <p
                          className={`text-lg font-semibold ${
                            remaining < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          ${Math.abs(remaining).toFixed(2)}
                          {remaining < 0 && " over"}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {percentage >= 80 && (
                    <div
                      className={`flex items-center space-x-2 p-2 rounded ${
                        percentage >= 100
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {percentage >= 100
                          ? "Budget exceeded!"
                          : "Approaching limit"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {budgets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No budgets created yet
              </p>
              <p className="text-gray-600 mb-4">
                Start by creating your first budget to track spending
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
