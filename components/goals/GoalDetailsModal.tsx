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
import { Goal } from "@/store/goals-store";
import {
  Calendar,
  Target,
  TrendingUp,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
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

interface GoalDetailsModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function GoalDetailsModal({
  goal,
  isOpen,
  onClose,
  onTransactionDeleted,
}: GoalDetailsModalProps) {
  const { format } = useFormatCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (goal && isOpen) {
      fetchTransactions();
    }
  }, [goal, isOpen]);

  const fetchTransactions = async () => {
    if (!goal) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}/transactions`);
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
        "Are you sure you want to delete this transaction? This will also update the goal progress.",
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

  if (!goal) return null;

  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.status === "completed";
  const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted;

  // Pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{goal.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions ({transactions.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Goal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="text-lg font-semibold">{goal.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p
                      className={`text-lg font-semibold capitalize ${
                        isCompleted
                          ? "text-green-600"
                          : isOverdue
                            ? "text-red-600"
                            : "text-blue-600"
                      }`}
                    >
                      {goal.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Target Date</p>
                    <p className="text-lg font-semibold flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Days Remaining</p>
                    <p className="text-lg font-semibold">
                      {Math.ceil(
                        (new Date(goal.targetDate).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days
                    </p>
                  </div>
                </div>

                {isOverdue && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-700 font-medium">
                      ⚠️ This goal is overdue by{" "}
                      {Math.abs(
                        Math.ceil(
                          (new Date(goal.targetDate).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}{" "}
                      days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Current Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {format(goal.currentAmount)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Target Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {format(goal.targetAmount)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {format(remaining)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="font-bold">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "bg-green-600"
                          : isOverdue
                            ? "bg-red-600"
                            : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Created On</p>
                  <p className="text-base">
                    {new Date(goal.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500 text-center">
                    No transactions linked to this goal yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {currentTransactions.map((transaction) => (
                    <Card
                      key={transaction.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  transaction.type === "income"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              />
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
                              <p
                                className={`text-lg font-bold ${
                                  transaction.type === "income"
                                    ? "text-green-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {format(
                                  parseFloat(transaction.amount.toString()),
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  transaction.date,
                                ).toLocaleDateString()}
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
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-600">
                      Showing {startIndex + 1}-
                      {Math.min(endIndex, transactions.length)} of{" "}
                      {transactions.length} transactions
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
