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
import { Plus, TrendingUp, Calendar } from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useTransactionsStore } from "@/store/transactions-store";

export default function IncomesPage() {
  const { format } = useFormatCurrency();
  const { transactions, fetchTransactions, addTransaction } = useTransactionsStore();

  const incomes = transactions.filter((t) => t.type === "income");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      const allCategories = [
        "Salary",
        "Freelance",
        "Investment",
        "Business",
        "Other",
        ...customCategories,
      ];
      if (!allCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        setFormData({ ...formData, category: trimmedName });
      }
      setNewCategoryName("");
      setShowCategoryInput(false);
    }
  };

  const handleAddIncome = async () => {
    if (!formData.amount || !formData.description || !formData.category) return;
    await addTransaction({
      type: "income",
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      subtype: "",
      budget_id: "",
      goal_id: null,
      date: new Date().toISOString().split("T")[0],
    });
    setFormData({ amount: "", description: "", category: "" });
    setIsAddDialogOpen(false);
  };

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const monthlyAverage = incomes.length > 0 ? totalIncome / incomes.length : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Dark Hero Band */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Incomes</p>
            <p className="text-xs text-slate-500">Track and manage your income sources</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Total Income</p>
              <p className="font-mono text-base font-semibold text-green-400">{format(totalIncome)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">All time</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Avg per Transaction</p>
              <p className="font-mono text-base font-semibold text-slate-200">{format(monthlyAverage)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{incomes.length} transactions</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2 pt-1.5">
              <div className="text-xl font-bold text-green-600">{format(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
              <CardTitle className="text-sm font-medium">Average per Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold text-green-600">{format(monthlyAverage)}</div>
              <p className="text-xs text-muted-foreground">Based on {incomes.length} transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Income Button */}
        <div className="mb-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Income</DialogTitle>
                <DialogDescription>Enter the details of your income below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="What was this income for?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  {showCategoryInput ? (
                    <div className="flex space-x-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomCategory();
                          } else if (e.key === "Escape") {
                            setShowCategoryInput(false);
                            setNewCategoryName("");
                          }
                        }}
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={handleAddCustomCategory} disabled={!newCategoryName.trim()}>Add</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setShowCategoryInput(false); setNewCategoryName(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        if (value === "add_custom") {
                          setShowCategoryInput(true);
                        } else {
                          setFormData({ ...formData, category: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                        <SelectItem value="Investment">Investment</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        {customCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="add_custom" className="text-blue-600 font-medium border-t mt-1 pt-2">
                          <div className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Add Category</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button onClick={handleAddIncome} className="w-full">Add Income</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Income List */}
        <Card>
          <CardHeader>
            <CardTitle>Income History</CardTitle>
            <CardDescription>All your income transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomes.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No income recorded yet. Add your first income above!
                </p>
              ) : (
                incomes.map((income) => (
                  <div key={income.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{income.description}</p>
                        <p className="text-sm text-gray-500">{income.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{format(income.amount)}</p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(income.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
