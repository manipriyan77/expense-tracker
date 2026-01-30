"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useFixedDepositsStore,
  type FixedDeposit,
  type Compounding,
  type Payout,
} from "@/store/fixed-deposits-store";
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
import { Loader2, Plus, Trash2, Edit3, Landmark } from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const compoundingOptions: { value: Compounding; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

const payoutOptions: { value: Payout; label: string }[] = [
  { value: "reinvest", label: "Reinvest (cumulative)" },
  { value: "payout", label: "Payout (interest out)" },
];

export default function FixedDepositsPage() {
  const { format } = useFormatCurrency();
  const { deposits, load, add, update, remove, loading } =
    useFixedDepositsStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FixedDeposit | null>(null);
  const [form, setForm] = useState<Omit<FixedDeposit, "id">>({
    institution: "",
    principal: 0,
    rate: 7,
    compounding: "quarterly",
    payout: "reinvest",
    startDate: new Date().toISOString().split("T")[0],
    maturityDate: new Date().toISOString().split("T")[0],
    tenureMonths: 12,
    notes: "",
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const principal = deposits.reduce((sum, d) => sum + d.principal, 0);
    return { principal };
  }, [deposits]);

  const resetForm = () => {
    setForm({
      institution: "",
      principal: 0,
      rate: 7,
      compounding: "quarterly",
      payout: "reinvest",
      startDate: new Date().toISOString().split("T")[0],
      maturityDate: new Date().toISOString().split("T")[0],
      tenureMonths: 12,
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

  const openEdit = (fd: FixedDeposit) => {
    setEditing(fd);
    setForm({
      institution: fd.institution,
      principal: fd.principal,
      rate: fd.rate,
      compounding: fd.compounding,
      payout: fd.payout,
      startDate: fd.startDate,
      maturityDate: fd.maturityDate,
      tenureMonths: fd.tenureMonths,
      notes: fd.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  const estimateMaturity = (fd: FixedDeposit) => {
    // Simple compound interest estimate
    const periodsPerYear =
      fd.compounding === "monthly"
        ? 12
        : fd.compounding === "quarterly"
          ? 4
          : fd.compounding === "semiannual"
            ? 2
            : 1;
    const years = fd.tenureMonths / 12;
    const maturity =
      fd.payout === "payout"
        ? fd.principal + fd.principal * (fd.rate / 100) * years
        : fd.principal *
          Math.pow(1 + fd.rate / 100 / periodsPerYear, periodsPerYear * years);
    return maturity;
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixed Deposits</h1>
          <p className="text-sm text-gray-600">
            Track principal, rate, tenure, and see estimated maturity values.
            Data is stored locally in your browser.
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
              Add FD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit FD" : "Add Fixed Deposit"}
              </DialogTitle>
              <DialogDescription>
                Capture key FD details to monitor maturity and laddering.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Institution</Label>
                <Input
                  value={form.institution}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, institution: e.target.value }))
                  }
                  placeholder="Bank / NBFC name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Principal</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.principal}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        principal: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate (p.a. %)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Compounding</Label>
                  <Select
                    value={form.compounding}
                    onValueChange={(val) =>
                      setForm((p) => ({
                        ...p,
                        compounding: val as Compounding,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {compoundingOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interest Handling</Label>
                  <Select
                    value={form.payout}
                    onValueChange={(val) =>
                      setForm((p) => ({ ...p, payout: val as Payout }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maturity Date</Label>
                  <Input
                    type="date"
                    value={form.maturityDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, maturityDate: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tenure (months)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.tenureMonths}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      tenureMonths: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Receipt number, auto-renewal, special rate, etc."
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Save Changes" : "Add FD"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Principal</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {format(totals.principal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FD Count</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {deposits.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Fixed Deposits</CardTitle>
          <CardDescription>
            Locally saved list with estimated maturity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No FDs yet. Add one above.
            </p>
          ) : (
            deposits.map((fd) => {
              const maturity = estimateMaturity(fd);
              return (
                <div
                  key={fd.id}
                  className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{fd.institution}</p>
                      <p className="text-xs text-gray-500">
                        {fd.tenureMonths} mo @ {fd.rate}% • {fd.compounding},{" "}
                        {fd.payout}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fd.startDate} → {fd.maturityDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">Principal</p>
                      <p className="font-semibold">{format(fd.principal)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Est. Maturity</p>
                      <p className="font-semibold">{format(maturity)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(fd)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(fd.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
