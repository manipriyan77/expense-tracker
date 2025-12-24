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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  status: "pending" | "paid" | "overdue";
  recurring: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    dueDate: "",
    category: "",
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const mockReminders: BillReminder[] = [
      {
        id: "1",
        title: "Electricity Bill",
        amount: 120,
        dueDate: "2024-12-25",
        category: "Bills",
        status: "pending",
        recurring: true,
      },
      {
        id: "2",
        title: "Internet Bill",
        amount: 60,
        dueDate: "2024-12-28",
        category: "Bills",
        status: "pending",
        recurring: true,
      },
      {
        id: "3",
        title: "Credit Card Payment",
        amount: 450,
        dueDate: "2024-12-20",
        category: "Bills",
        status: "overdue",
        recurring: false,
      },
      {
        id: "4",
        title: "Car Insurance",
        amount: 200,
        dueDate: "2024-12-15",
        category: "Insurance",
        status: "paid",
        recurring: false,
      },
    ];
    setReminders(mockReminders);
  };

  const handleAddReminder = () => {
    if (!formData.title || !formData.amount || !formData.dueDate) return;

    const newReminder: BillReminder = {
      id: Date.now().toString(),
      title: formData.title,
      amount: parseFloat(formData.amount),
      dueDate: formData.dueDate,
      category: formData.category || "Bills",
      status: "pending",
      recurring: false,
    };

    setReminders([newReminder, ...reminders]);
    setFormData({ title: "", amount: "", dueDate: "", category: "" });
    setIsAddDialogOpen(false);
  };

  const markAsPaid = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, status: "paid" as const } : r))
    );
  };

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const overdueReminders = reminders.filter((r) => r.status === "overdue");
  const paidReminders = reminders.filter((r) => r.status === "paid");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Bill Reminders</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReminders.length}</div>
              <p className="text-xs text-muted-foreground">Due this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overdueReminders.length}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {paidReminders.length}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Reminder */}
        <div className="mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Bill Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Bill Reminder</DialogTitle>
                <DialogDescription>
                  Never miss a payment deadline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Bill Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Electricity Bill"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Bills, Insurance"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>

                <Button onClick={handleAddReminder} className="w-full">
                  Add Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reminders List */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingReminders.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({overdueReminders.length})
            </TabsTrigger>
            <TabsTrigger value="paid">Paid ({paidReminders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingReminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Bell className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">{reminder.title}</p>
                        <p className="text-sm text-gray-500">{reminder.category}</p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Due: {new Date(reminder.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold">${reminder.amount.toFixed(2)}</p>
                      <Button
                        onClick={() => markAsPaid(reminder.id)}
                        variant="outline"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingReminders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No pending reminders
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            {overdueReminders.map((reminder) => (
              <Card key={reminder.id} className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-red-900">
                          {reminder.title}
                        </p>
                        <p className="text-sm text-red-600">{reminder.category}</p>
                        <div className="flex items-center space-x-1 text-xs text-red-600 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Due: {new Date(reminder.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-red-600">
                        ${reminder.amount.toFixed(2)}
                      </p>
                      <Button
                        onClick={() => markAsPaid(reminder.id)}
                        variant="outline"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {overdueReminders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No overdue reminders
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            {paidReminders.map((reminder) => (
              <Card key={reminder.id} className="opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold">{reminder.title}</p>
                        <p className="text-sm text-gray-500">{reminder.category}</p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Paid: {new Date(reminder.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-green-600">
                        ${reminder.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {paidReminders.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No paid bills yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
