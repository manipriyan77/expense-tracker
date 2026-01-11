"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  Target,
  Plus,
  TrendingUp,
  Calendar,
  CheckCircle,
  Circle,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import { useGoalsStore, Goal } from "@/store/goals-store";
import { goalFormSchema, GoalFormData } from "@/lib/schemas/goal-form-schema";
import GoalDetailsModal from "@/components/goals/GoalDetailsModal";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { DollarSign } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function GoalsPage() {
  const { goals, loading, error, fetchGoals, addGoal, updateGoal, deleteGoal } = useGoalsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Transaction dialog
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionGoal, setTransactionGoal] = useState<Goal | null>(null);

  const addForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "General",
    },
  });

  const editForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "General",
    },
  });

  const {
    register: addRegister,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAddSubmitting },
  } = addForm;

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = editForm;

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async (data: GoalFormData) => {
    const newGoal = {
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate,
      category: data.category || "General",
      status: "active" as const,
    };

    await addGoal(newGoal);
    resetAdd();
    setIsAddDialogOpen(false);
  };

  const handleEditGoal = async (data: GoalFormData) => {
    if (!editingGoalId) return;

    await updateGoal(editingGoalId, {
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate,
      category: data.category || "General",
    });
    resetEdit();
    setIsEditDialogOpen(false);
    setEditingGoalId(null);
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      try {
        await deleteGoal(id);
      } catch (error) {
        // Error is already set in the store and logged
        // Show alert to user
        if (error instanceof Error) {
          alert(error.message);
        }
      }
    }
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoalId(goal.id);
    resetEdit({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      category: goal.category,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleTransactionDeleted = () => {
    // Refresh goals to update amounts
    fetchGoals();
  };

  const openAddTransactionDialog = (goal: Goal) => {
    setTransactionGoal(goal);
    setIsAddTransactionOpen(true);
  };

  const handleTransactionSuccess = () => {
    setIsAddTransactionOpen(false);
    setTransactionGoal(null);
    fetchGoals(); // Refresh to update goal amounts
    toast.success("Transaction added successfully!");
  };

  if (loading && goals.length === 0) {
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
          <Button onClick={fetchGoals} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalGoals = goals.length;
  const completedGoals = goals.filter((goal) => goal.status === "completed").length;
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Goals Tracker</h1>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Goal</DialogTitle>
                  <DialogDescription>
                    Set a new financial goal to track your progress.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSubmit(handleAddGoal)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-title">Goal Title</Label>
                    <Input
                      id="add-title"
                      placeholder="e.g., Emergency Fund, Vacation"
                      {...addRegister("title")}
                    />
                    {addErrors.title && (
                      <p className="text-sm text-red-600">{addErrors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-targetAmount">Target Amount</Label>
                    <Input
                      id="add-targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...addRegister("targetAmount", { valueAsNumber: true })}
                    />
                    {addErrors.targetAmount && (
                      <p className="text-sm text-red-600">{addErrors.targetAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-currentAmount">Current Amount (Optional)</Label>
                    <Input
                      id="add-currentAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...addRegister("currentAmount", { valueAsNumber: true })}
                    />
                    {addErrors.currentAmount && (
                      <p className="text-sm text-red-600">{addErrors.currentAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-targetDate">Target Date</Label>
                    <Input
                      id="add-targetDate"
                      type="date"
                      {...addRegister("targetDate")}
                    />
                    {addErrors.targetDate && (
                      <p className="text-sm text-red-600">{addErrors.targetDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category</Label>
                    <Input
                      id="add-category"
                      placeholder="e.g., Savings, Travel, Education"
                      {...addRegister("category")}
                    />
                    {addErrors.category && (
                      <p className="text-sm text-red-600">{addErrors.category.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isAddSubmitting}>
                    {isAddSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding Goal...
                      </>
                    ) : (
                      "Add Goal"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your financial goal details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(handleEditGoal)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Goal Title</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Emergency Fund, Vacation"
                {...editRegister("title")}
              />
              {editErrors.title && (
                <p className="text-sm text-red-600">{editErrors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-targetAmount">Target Amount</Label>
              <Input
                id="edit-targetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...editRegister("targetAmount", { valueAsNumber: true })}
              />
              {editErrors.targetAmount && (
                <p className="text-sm text-red-600">{editErrors.targetAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-currentAmount">Current Amount</Label>
              <Input
                id="edit-currentAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...editRegister("currentAmount", { valueAsNumber: true })}
              />
              {editErrors.currentAmount && (
                <p className="text-sm text-red-600">{editErrors.currentAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-targetDate">Target Date</Label>
              <Input
                id="edit-targetDate"
                type="date"
                {...editRegister("targetDate")}
              />
              {editErrors.targetDate && (
                <p className="text-sm text-red-600">{editErrors.targetDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                placeholder="e.g., Savings, Travel, Education"
                {...editRegister("category")}
              />
              {editErrors.category && (
                <p className="text-sm text-red-600">{editErrors.category.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isEditSubmitting}>
              {isEditSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Goal...
                </>
              ) : (
                "Update Goal"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGoals}</div>
              <p className="text-xs text-muted-foreground">All goals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Circle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeGoals}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
              <p className="text-xs text-muted-foreground">Achieved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalCurrentAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                of ₹{totalTargetAmount.toLocaleString()} saved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Goals List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
            <CardDescription>Track your progress towards financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {goals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No goals yet. Add your first goal above!
                </p>
              ) : (
                goals.map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const isCompleted = goal.status === "completed";
                  const isOverdue =
                    new Date(goal.targetDate) < new Date() && !isCompleted;

                  return (
                    <div
                      key={goal.id}
                      className="border rounded-lg p-6 space-y-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => openDetailsModal(goal)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className="h-6 w-6 text-gray-400" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold">{goal.title}</h3>
                            <p className="text-sm text-gray-500">{goal.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right mr-4">
                            <p className="text-lg font-bold">
                              ₹{goal.currentAmount.toLocaleString()} / ₹
                              {goal.targetAmount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center justify-end">
                              <Calendar className="h-3 w-3 mr-1" />
                              Target: {new Date(goal.targetDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddTransactionDialog(goal);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(goal);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCompleted
                                ? "bg-green-600"
                                : isOverdue
                                ? "bg-red-600"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {isOverdue && (
                        <p className="text-sm text-red-600 font-medium">
                          ⚠️ Target date has passed
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Goal Details Modal */}
      <GoalDetailsModal
        goal={selectedGoal}
        isOpen={isDetailsModalOpen}
        onClose={handleDetailsModalClose}
        onTransactionDeleted={handleTransactionDeleted}
      />

      {/* Add Transaction Dialog */}
      <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a transaction for goal: {transactionGoal?.title}
            </DialogDescription>
          </DialogHeader>
          {transactionGoal && (
            <AddTransactionForm
              onSuccess={handleTransactionSuccess}
              onCancel={() => setIsAddTransactionOpen(false)}
              initialValues={{
                type: "expense",
                category: "Savings",
                subtype: "Goal Savings",
                goalId: transactionGoal.id,
                description: `Contribution to ${transactionGoal.title}`,
              }}
              contextInfo={{
                source: "goal",
                sourceName: transactionGoal.title,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
}
