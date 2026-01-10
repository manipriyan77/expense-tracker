"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  Sparkles,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";

interface Challenge {
  id: string;
  name: string;
  type: "52_week" | "daily_dollar" | "custom" | "percentage";
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string;
  frequency: "daily" | "weekly" | "monthly";
  status: "active" | "completed" | "paused";
}

export default function SavingsChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: "1",
      name: "52-Week Challenge",
      type: "52_week",
      targetAmount: 1378,
      currentAmount: 780,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      frequency: "weekly",
      status: "active",
    },
    {
      id: "2",
      name: "Emergency Fund Builder",
      type: "custom",
      targetAmount: 10000,
      currentAmount: 4500,
      startDate: "2025-06-01",
      endDate: "2026-06-01",
      frequency: "monthly",
      status: "active",
    },
    {
      id: "3",
      name: "Vacation Fund",
      type: "custom",
      targetAmount: 3000,
      currentAmount: 3000,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      frequency: "monthly",
      status: "completed",
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddContributionOpen, setIsAddContributionOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const activeTotal = challenges
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.currentAmount, 0);
  
  const completedChallenges = challenges.filter((c) => c.status === "completed").length;

  const challengeTemplates = [
    {
      name: "52-Week Challenge",
      description: "Save incrementally each week ($1, $2, $3... up to $52)",
      targetAmount: 1378,
      type: "52_week" as const,
      frequency: "weekly" as const,
    },
    {
      name: "Daily Dollar Challenge",
      description: "Save $1 more each day for 365 days",
      targetAmount: 66795,
      type: "daily_dollar" as const,
      frequency: "daily" as const,
    },
    {
      name: "$5 Challenge",
      description: "Save every $5 bill you receive",
      targetAmount: 1000,
      type: "custom" as const,
      frequency: "weekly" as const,
    },
    {
      name: "10% Challenge",
      description: "Save 10% of every income",
      targetAmount: 5000,
      type: "percentage" as const,
      frequency: "monthly" as const,
    },
  ];

  const getProgressPercentage = (challenge: Challenge) => {
    return (challenge.currentAmount / challenge.targetAmount) * 100;
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: Challenge["status"]) => {
    const variants = {
      active: "default",
      completed: "secondary",
      paused: "outline",
    } as const;

    const colors = {
      active: "bg-blue-500",
      completed: "bg-green-500",
      paused: "bg-gray-400",
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getChallengeIcon = (type: Challenge["type"]) => {
    switch (type) {
      case "52_week":
        return <Calendar className="h-5 w-5" />;
      case "daily_dollar":
        return <TrendingUp className="h-5 w-5" />;
      case "percentage":
        return <Target className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Savings Challenges</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gamify your savings and reach your goals faster
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Challenge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Savings Challenge</DialogTitle>
                  <DialogDescription>
                    Choose a challenge template or create your own
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {challengeTemplates.map((template) => (
                      <Card
                        key={template.name}
                        className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-500"
                      >
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-1">{template.name}</h4>
                          <p className="text-xs text-gray-600 mb-3">
                            {template.description}
                          </p>
                          <p className="text-sm font-semibold text-blue-600">
                            Target: {formatCurrency(template.targetAmount)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-4">Or Create Custom Challenge</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Challenge Name</Label>
                        <Input placeholder="e.g., Vacation Fund" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Target Amount</Label>
                          <Input type="number" placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input type="date" />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input type="date" />
                        </div>
                      </div>
                      <Button className="w-full">Create Challenge</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {challenges.filter((c) => c.status === "active").length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(activeTotal)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                From active challenges
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Trophy className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {completedChallenges}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Challenges finished
              </p>
            </CardContent>
          </Card>
        </div>

        {challenges.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No challenges yet"
            description="Start your first savings challenge to build healthy saving habits"
            actionLabel="Create Challenge"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <>
            {/* Active Challenges */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Active Challenges</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {challenges
                  .filter((c) => c.status === "active")
                  .map((challenge) => {
                    const progress = getProgressPercentage(challenge);
                    const daysRemaining = getDaysRemaining(challenge.endDate);
                    const remaining = challenge.targetAmount - challenge.currentAmount;

                    return (
                      <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-full">
                                {getChallengeIcon(challenge.type)}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{challenge.name}</CardTitle>
                                <p className="text-sm text-gray-500 capitalize">
                                  {challenge.frequency} contributions
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(challenge.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-sm text-gray-500">Current Progress</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(challenge.currentAmount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Target</p>
                              <p className="text-lg font-semibold">
                                {formatCurrency(challenge.targetAmount)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Progress</span>
                              <span className="font-medium">{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                              <p className="text-xs text-gray-500">Remaining</p>
                              <p className="font-semibold">{formatCurrency(remaining)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Days Left</p>
                              <p className="font-semibold">{daysRemaining} days</p>
                            </div>
                          </div>

                          {progress >= 100 ? (
                            <Button className="w-full" variant="outline">
                              <Check className="h-4 w-4 mr-2" />
                              Mark as Complete
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={() => {
                                setSelectedChallenge(challenge);
                                setIsAddContributionOpen(true);
                              }}
                            >
                              Add Contribution
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>

            {/* Completed Challenges */}
            {completedChallenges > 0 && (
              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  Completed Challenges
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {challenges
                    .filter((c) => c.status === "completed")
                    .map((challenge) => (
                      <Card key={challenge.id} className="border-2 border-green-200 bg-green-50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{challenge.name}</h4>
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(challenge.currentAmount)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Completed on{" "}
                            {new Date(challenge.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Contribution Dialog */}
      <Dialog open={isAddContributionOpen} onOpenChange={setIsAddContributionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add a contribution to {selectedChallenge?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contribution Amount</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="Add any notes..." />
            </div>
            <Button className="w-full">Add Contribution</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
