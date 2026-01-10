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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  CreditCard,
  AlertCircle,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";

interface Debt {
  id: string;
  name: string;
  type: "credit_card" | "loan" | "mortgage" | "other";
  balance: number;
  originalAmount: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: number; // Day of month
  nextDueDate: string;
}

export default function DebtTrackerPage() {
  const [debts, setDebts] = useState<Debt[]>([
    {
      id: "1",
      name: "Chase Credit Card",
      type: "credit_card",
      balance: 2500,
      originalAmount: 5000,
      interestRate: 18.9,
      minimumPayment: 75,
      dueDate: 15,
      nextDueDate: "2026-02-15",
    },
    {
      id: "2",
      name: "Car Loan",
      type: "loan",
      balance: 15000,
      originalAmount: 25000,
      interestRate: 4.2,
      minimumPayment: 450,
      dueDate: 1,
      nextDueDate: "2026-02-01",
    },
    {
      id: "3",
      name: "Student Loan",
      type: "loan",
      balance: 35000,
      originalAmount: 50000,
      interestRate: 5.5,
      minimumPayment: 350,
      dueDate: 10,
      nextDueDate: "2026-02-10",
    },
  ]);

  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payoffStrategy, setPayoffStrategy] = useState<"snowball" | "avalanche">("avalanche");

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const avgInterestRate = debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length;

  // Calculate payoff order based on strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (payoffStrategy === "snowball") {
      return a.balance - b.balance; // Smallest balance first
    } else {
      return b.interestRate - a.interestRate; // Highest interest first
    }
  });

  // Mock payment history
  const paymentHistory = [
    { month: "Aug", paid: 875, balance: 54500 },
    { month: "Sep", paid: 875, balance: 53625 },
    { month: "Oct", paid: 875, balance: 52750 },
    { month: "Nov", paid: 875, balance: 51875 },
    { month: "Dec", paid: 875, balance: 51000 },
    { month: "Jan", paid: 875, balance: 52500 },
  ];

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateMonthsToPayoff = (debt: Debt) => {
    // Simple calculation: balance / minimum payment
    return Math.ceil(debt.balance / debt.minimumPayment);
  };

  const getDebtIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Debt Tracker</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and pay off your debts strategically
              </p>
            </div>
            <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Debt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Debt</DialogTitle>
                  <DialogDescription>
                    Track a new debt or liability
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="debtName">Debt Name</Label>
                    <Input id="debtName" placeholder="e.g., Credit Card" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debtType">Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="loan">Personal Loan</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentBalance">Current Balance</Label>
                      <Input id="currentBalance" type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originalAmount">Original Amount</Label>
                      <Input id="originalAmount" type="number" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input id="interestRate" type="number" placeholder="0.0" step="0.1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPayment">Min Payment</Label>
                      <Input id="minPayment" type="number" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (Day of Month)</Label>
                    <Input id="dueDate" type="number" min="1" max="31" placeholder="15" />
                  </div>
                  <Button className="w-full">Add Debt</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDebt)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Across {debts.length} accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Min Payment</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalMinPayment)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Per month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Interest Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgInterestRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Annual percentage rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Debt-Free In</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                48 months
              </div>
              <p className="text-xs text-gray-500 mt-1">
                With current payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payoff Progress Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Debt Payoff Progress</CardTitle>
            <CardDescription>Your debt reduction over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" tickFormatter={(value) => `$${value / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar yAxisId="left" dataKey="balance" fill="#ef4444" name="Remaining Balance" />
                <Bar yAxisId="right" dataKey="paid" fill="#10b981" name="Amount Paid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Debts</TabsTrigger>
              <TabsTrigger value="payoff">Payoff Strategy</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-4">
            {debts.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No debts tracked"
                description="Add your first debt to start tracking payoff progress"
                actionLabel="Add Debt"
                onAction={() => setIsAddDebtOpen(true)}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {debts.map((debt) => {
                  const progress = ((debt.originalAmount - debt.balance) / debt.originalAmount) * 100;
                  const daysUntilDue = getDaysUntilDue(debt.nextDueDate);
                  const monthsToPayoff = calculateMonthsToPayoff(debt);

                  return (
                    <Card key={debt.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              debt.type === "credit_card" ? "bg-purple-100" : "bg-blue-100"
                            }`}>
                              {getDebtIcon(debt.type)}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{debt.name}</CardTitle>
                              <p className="text-sm text-gray-500 capitalize">
                                {debt.type.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          {daysUntilDue <= 7 && (
                            <div className="flex items-center space-x-1 text-amber-600">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs font-semibold">
                                {daysUntilDue}d
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm text-gray-500">Current Balance</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(debt.balance)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Min Payment</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(debt.minimumPayment)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{progress.toFixed(0)}% paid off</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-2 border-t text-center">
                          <div>
                            <p className="text-xs text-gray-500">APR</p>
                            <p className="font-semibold">{debt.interestRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payoff Time</p>
                            <p className="font-semibold">{monthsToPayoff}mo</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Next Due</p>
                            <p className="font-semibold">
                              {new Date(debt.nextDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            setSelectedDebt(debt);
                            setIsAddPaymentOpen(true);
                          }}
                        >
                          Record Payment
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payoff">
            <Card>
              <CardHeader>
                <CardTitle>Debt Payoff Strategy</CardTitle>
                <CardDescription>
                  Choose a strategy to pay off your debts faster
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button
                    variant={payoffStrategy === "avalanche" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setPayoffStrategy("avalanche")}
                  >
                    Avalanche Method
                  </Button>
                  <Button
                    variant={payoffStrategy === "snowball" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setPayoffStrategy("snowball")}
                  >
                    Snowball Method
                  </Button>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">
                    {payoffStrategy === "avalanche" ? "Avalanche Method" : "Snowball Method"}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {payoffStrategy === "avalanche"
                      ? "Pay off debts with the highest interest rates first to save money on interest charges."
                      : "Pay off debts with the smallest balances first to build momentum and motivation."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Payoff Order:</h4>
                  {sortedDebts.map((debt, index) => (
                    <div key={debt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{debt.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(debt.balance)} @ {debt.interestRate}% APR
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(debt.minimumPayment)}</p>
                        <p className="text-xs text-gray-500">min payment</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>Debt Payoff Calculator</CardTitle>
                <CardDescription>
                  See how extra payments can accelerate your debt freedom
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Monthly Payment</Label>
                      <Input
                        type="number"
                        defaultValue={totalMinPayment}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Extra Monthly Payment</Label>
                      <Input type="number" defaultValue={0} placeholder="0.00" />
                    </div>
                  </div>

                  <Button className="w-full">Calculate Payoff</Button>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500">Time to Pay Off</p>
                        <p className="text-2xl font-bold text-blue-600">48 months</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500">Interest Saved</p>
                        <p className="text-2xl font-bold text-green-600">$8,450</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Record Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebt?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                defaultValue={selectedDebt?.minimumPayment}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="Add any notes..." />
            </div>
            <Button className="w-full">Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
