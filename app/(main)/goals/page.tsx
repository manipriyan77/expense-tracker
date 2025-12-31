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
} from "lucide-react";
import { useGoalsStore } from "@/store/goals-store";
import { goalFormSchema, GoalFormData } from "@/lib/schemas/goal-form-schema";

export default function GoalsPage() {
  const { goals, loading, error, fetchGoals, addGoal } = useGoalsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "",
    },
  });

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
    reset();
    setIsAddDialogOpen(false);
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
                <form onSubmit={handleSubmit(handleAddGoal)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Goal Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Emergency Fund, Vacation"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("targetAmount", { valueAsNumber: true })}
                    />
                    {errors.targetAmount && (
                      <p className="text-sm text-red-600">{errors.targetAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentAmount">Current Amount (Optional)</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("currentAmount", { valueAsNumber: true })}
                    />
                    {errors.currentAmount && (
                      <p className="text-sm text-red-600">{errors.currentAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Target Date</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      {...register("targetDate")}
                    />
                    {errors.targetDate && (
                      <p className="text-sm text-red-600">{errors.targetDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Savings, Travel, Education"
                      {...register("category")}
                    />
                    {errors.category && (
                      <p className="text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
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
                ${totalCurrentAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                of ${totalTargetAmount.toLocaleString()} saved
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
                      className="border rounded-lg p-6 space-y-4"
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
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ${goal.currentAmount.toLocaleString()} / $
                            {goal.targetAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
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
    </div>
  );
}
