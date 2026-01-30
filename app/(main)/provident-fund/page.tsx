"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useProvidentFundStore,
  type PFType,
  type ProvidentFund,
} from "@/store/provident-fund-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Loader2, Plus, Trash2, Edit3, PiggyBank } from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const pfTypes: PFType[] = ["EPF", "PPF", "VPF", "Other"];

export default function ProvidentFundPage() {
  const { format } = useFormatCurrency();
  const { funds, load, add, update, remove, loading } = useProvidentFundStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProvidentFund | null>(null);
  const [form, setForm] = useState<Omit<ProvidentFund, "id">>({
    name: "",
    type: "EPF",
    balance: 0,
    annualInterestRate: 8,
    employeeContribution: 0,
    employerContribution: 0,
    lastInterestCredit: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const balance = funds.reduce((sum, f) => sum + f.balance, 0);
    const employee = funds.reduce((sum, f) => sum + f.employeeContribution, 0);
    const employer = funds.reduce((sum, f) => sum + f.employerContribution, 0);
    return { balance, employee, employer };
  }, [funds]);

  const resetForm = () => {
    setForm({
      name: "",
      type: "EPF",
      balance: 0,
      annualInterestRate: 8,
      employeeContribution: 0,
      employerContribution: 0,
      lastInterestCredit: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await update(editing.id, form);
    } else {
      await add(form);
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openEdit = (fund: ProvidentFund) => {
    setEditing(fund);
    setForm({
      name: fund.name,
      type: fund.type,
      balance: fund.balance,
      annualInterestRate: fund.annualInterestRate,
      employeeContribution: fund.employeeContribution,
      employerContribution: fund.employerContribution,
      lastInterestCredit:
        fund.lastInterestCredit ?? new Date().toISOString().split("T")[0],
      startDate: fund.startDate ?? new Date().toISOString().split("T")[0],
      notes: fund.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provident Fund</h1>
          <p className="text-sm text-gray-600">
            Track EPF/PPF/VPF balances, contributions, and interest accrual.
            Stored locally in your browser.
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
              Add PF
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit PF" : "Add Provident Fund"}
              </DialogTitle>
              <DialogDescription>
                Capture balances and contributions to keep PF in sync with your
                net worth.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g., EPF - Company ABC"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((p) => ({ ...p, type: val as PFType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {pfTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Balance</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        balance: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Interest Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.annualInterestRate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        annualInterestRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Contribution (monthly)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.employeeContribution}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        employeeContribution: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employer Contribution (monthly)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.employerContribution}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        employerContribution: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Interest Credit</Label>
                  <Input
                    type="date"
                    value={form.lastInterestCredit}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        lastInterestCredit: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Account number, UAN, lock-in info, etc."
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Save Changes" : "Add PF"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total PF Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {format(totals.balance)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Contribution</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {format(totals.employee + totals.employer)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {funds.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your PF Accounts</CardTitle>
          <CardDescription>Locally saved list of PF balances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : funds.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No PF accounts yet. Add one above.
            </p>
          ) : (
            funds.map((fund) => (
              <div
                key={fund.id}
                className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{fund.name}</p>
                    <p className="text-xs text-gray-500">
                      {fund.type} • Rate {fund.annualInterestRate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      Start: {fund.startDate || "—"} | Last credit:{" "}
                      {fund.lastInterestCredit || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-gray-500">Balance</p>
                    <p className="font-semibold">{format(fund.balance)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Monthly</p>
                    <p className="font-semibold">
                      {format(
                        fund.employeeContribution + fund.employerContribution,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(fund)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(fund.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
