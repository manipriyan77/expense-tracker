"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useForexStore,
  type ForexEntry,
  type ForexEntryType,
} from "@/store/forex-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { EmptyState } from "@/components/ui/empty-state";

function formatMonth(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ForexPage() {
  const { format } = useFormatCurrency();
  const { entries, load, addEntry, updateEntry, deleteEntry, loading } =
    useForexStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ForexEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<{
    type: ForexEntryType;
    month: string;
    amount: number;
    handler_share_percentage: number;
    notes: string;
  }>({
    type: "withdrawal",
    month: "",
    amount: 0,
    handler_share_percentage: 0,
    notes: "",
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    let totalDeposits = 0;
    let totalProfitWithdrawn = 0;
    let totalHandlerShare = 0;
    let totalPnl = 0;
    for (const e of entries) {
      if (e.type === "deposit") {
        totalDeposits += e.amount;
      } else if (e.type === "withdrawal") {
        const handlerAmount =
          (e.amount * (e.handler_share_percentage ?? 0)) / 100;
        totalProfitWithdrawn += e.amount;
        totalHandlerShare += handlerAmount;
      } else if (e.type === "pnl") {
        totalPnl += e.amount;
      }
    }
    return {
      totalDeposits,
      totalProfitWithdrawn,
      totalHandlerShare,
      totalNetWithdrawals: totalProfitWithdrawn - totalHandlerShare,
      totalPnl,
    };
  }, [entries]);

  const resetForm = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setForm({
      type: "withdrawal",
      month,
      amount: 0,
      handler_share_percentage: 0,
      notes: "",
    });
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateEntry(editing.id, {
        type: form.type,
        month: form.month,
        amount: form.amount,
        handler_share_percentage:
          form.type === "withdrawal" ? form.handler_share_percentage : 0,
        notes: form.notes || undefined,
      });
    } else {
      addEntry({
        type: form.type,
        month: form.month,
        amount: form.amount,
        handler_share_percentage:
          form.type === "withdrawal" ? form.handler_share_percentage : 0,
        notes: form.notes || undefined,
      });
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openEdit = (entry: ForexEntry) => {
    setEditing(entry);
    setForm({
      type: entry.type,
      month: entry.month,
      amount: entry.amount,
      handler_share_percentage: entry.handler_share_percentage ?? 0,
      notes: entry.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteEntry(id);
    setDeleting(null);
  };

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.month > b.month) return -1;
        if (a.month < b.month) return 1;
        return 0;
      }),
    [entries],
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forex</h1>
          <p className="text-sm text-gray-600">
            Track deposits, monthly profit/loss, withdrawals, and the share paid
            to your account handler.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Entry" : "Add Entry"}</DialogTitle>
              <DialogDescription>
                Add a deposit, record monthly profit/loss, or a withdrawal with
                handler share.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val: ForexEntryType) =>
                    setForm((p) => ({ ...p, type: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        Deposit
                      </span>
                    </SelectItem>
                    <SelectItem value="withdrawal">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                        Withdrawal
                      </span>
                    </SelectItem>
                    <SelectItem value="pnl">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Profit / Loss
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={form.month}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, month: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {form.type === "deposit"
                    ? "Deposit Amount (₹)"
                    : form.type === "pnl"
                      ? "Profit / Loss (₹)"
                      : "Profit Amount (₹)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min={form.type === "pnl" ? undefined : "0"}
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder={
                    form.type === "pnl"
                      ? "Positive for profit, negative for loss"
                      : "0.00"
                  }
                  required
                />
                {form.type === "pnl" && (
                  <p className="text-xs text-gray-500">
                    Use positive for profit, negative for loss (e.g. -5000)
                  </p>
                )}
              </div>
              {form.type === "withdrawal" && (
                <div className="space-y-2">
                  <Label>Handler Share (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.handler_share_percentage || ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        handler_share_percentage:
                          parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="e.g. 20"
                  />
                  <p className="text-xs text-gray-500">
                    Percentage of profit paid to the person handling your
                    account
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Optional notes"
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Save Changes" : "Add Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Deposits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">
            {format(totals.totalDeposits)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Profit Withdrawn</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-blue-600">
            {format(totals.totalProfitWithdrawn)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total P&amp;L</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${
              totals.totalPnl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {format(totals.totalPnl)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Handler Share</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">
            {format(totals.totalHandlerShare)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Net (Withdrawals)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-indigo-600">
            {format(totals.totalNetWithdrawals)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <p className="text-sm text-gray-500">
            Deposits, profit/loss, and withdrawals with handler share breakdown
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : sortedEntries.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No entries yet"
              description="Add your first deposit, profit/loss, or withdrawal to start tracking"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Month
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Handler %
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Handler Share
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Your Net
                    </th>
                    <th className="w-24 py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((e) => {
                    if (e.type === "deposit") {
                      return (
                        <tr
                          key={e.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                              <ArrowDownCircle className="h-4 w-4" />
                              Deposit
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {formatMonth(e.month)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            +{format(e.amount)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(e)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(e.id)}
                                disabled={deleting === e.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === e.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    if (e.type === "pnl") {
                      return (
                        <tr
                          key={e.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                              <TrendingUp className="h-4 w-4" />
                              P&amp;L
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {formatMonth(e.month)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              e.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {e.amount >= 0 ? "+" : ""}
                            {format(e.amount)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            —
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(e)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(e.id)}
                                disabled={deleting === e.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === e.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const handlerAmount =
                      (e.amount * (e.handler_share_percentage ?? 0)) / 100;
                    const netAmount = e.amount - handlerAmount;
                    return (
                      <tr
                        key={e.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                            <ArrowUpCircle className="h-4 w-4" />
                            Withdrawal
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatMonth(e.month)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-600">
                          {format(e.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {e.handler_share_percentage ?? 0}%
                        </td>
                        <td className="py-3 px-4 text-right text-amber-600">
                          {format(handlerAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                          {format(netAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(e)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(e.id)}
                              disabled={deleting === e.id}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleting === e.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
