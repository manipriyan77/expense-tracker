"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Budget } from "@/store/budgets-store";
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  subtype: string;
  date: string;
  type: string;
  created_at: string;
}

interface BudgetDetailsModalProps {
  budget: Budget | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionDeleted?: () => void;
}

export default function BudgetDetailsModal({
  budget,
  isOpen,
  onClose,
  onTransactionDeleted,
}: BudgetDetailsModalProps) {
  const { format } = useFormatCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (budget && isOpen) {
      fetchTransactions();
    }
  }, [budget, isOpen]);

  const fetchTransactions = async () => {
    if (!budget) return;

    setLoading(true);
    try {
      // Get current month transactions
      const response = await fetch(`/api/budgets/${budget.id}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This will also update the budget spent amount.",
      )
    ) {
      return;
    }

    setDeleting(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setTransactions(transactions.filter((t) => t.id !== transactionId));
        // Notify parent to refresh
        if (onTransactionDeleted) {
          onTransactionDeleted();
        }
      } else {
        alert("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    } finally {
      setDeleting(null);
    }
  };

  if (!budget) return null;

  const spent = budget.spent_amount || 0;
  const percentage = (spent / budget.limit_amount) * 100;
  const remaining = budget.limit_amount - spent;

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

  // Calculate current month
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center space-x-2">
            <span>{budget.category}</span>
            {budget.subtype && (
              <span className="text-lg font-normal text-gray-500">
                → {budget.subtype}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions This Month ({transactions.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Budget Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="text-lg font-semibold">{budget.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Subtype</p>
                    <p className="text-lg font-semibold">
                      {budget.subtype || "Category-level"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="text-lg font-semibold capitalize">
                      {budget.period}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(percentage)}
                      <span
                        className={`font-semibold ${
                          percentage >= 100
                            ? "text-red-600"
                            : percentage >= 80
                              ? "text-orange-500"
                              : "text-green-600"
                        }`}
                      >
                        {percentage >= 100
                          ? "Over Budget"
                          : percentage >= 80
                            ? "Near Limit"
                            : "On Track"}
                      </span>
                    </div>
                  </div>
                </div>

                {percentage >= 80 && (
                  <div
                    className={`rounded p-3 ${
                      percentage >= 100
                        ? "bg-red-50 border border-red-200"
                        : "bg-orange-50 border border-orange-200"
                    }`}
                  >
                    <p
                      className={`font-medium flex items-center space-x-2 ${
                        percentage >= 100 ? "text-red-700" : "text-orange-700"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        {percentage >= 100
                          ? `Budget exceeded by ${format(Math.abs(remaining))}`
                          : `Approaching limit - ${format(remaining)} remaining`}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5" />
                  <span>Spending Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Spent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {format(spent)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Limit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {format(budget.limit_amount)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p
                      className={`text-2xl font-bold ${
                        remaining < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {format(Math.abs(remaining))}
                      {remaining < 0 && " over"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="font-bold">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-4" />
                    <div
                      className={`absolute top-0 left-0 h-4 ${getProgressColor(percentage)} rounded-full transition-all`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Created On</p>
                    <p className="text-base font-medium">
                      {new Date(budget.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="text-base font-medium">
                      {new Date(budget.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Showing transactions for: {currentMonth}
                </span>
              </div>
              <span className="text-xs text-blue-700">
                {transactions.length} transaction
                {transactions.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500 text-center">
                    No transactions for this budget in {currentMonth}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <Card
                    key={transaction.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <div>
                              <p className="font-semibold">
                                {transaction.description}
                              </p>
                              <p className="text-sm text-gray-600">
                                {transaction.category}
                                {transaction.subtype &&
                                  ` → ${transaction.subtype}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              {format(
                                parseFloat(transaction.amount.toString()),
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteTransaction(transaction.id)
                            }
                            disabled={deleting === transaction.id}
                          >
                            {deleting === transaction.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Total Spent This Month
                    </span>
                    <span className="text-xl font-bold text-red-600">
                      {format(
                        transactions.reduce(
                          (sum, t) => sum + parseFloat(t.amount.toString()),
                          0,
                        ),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
