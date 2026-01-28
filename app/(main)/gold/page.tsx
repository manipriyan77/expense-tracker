"use client";

import { useEffect, useMemo, useState } from "react";
import { useGoldStore, type GoldHolding, type GoldType } from "@/store/gold-store";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Edit3, Gem } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export default function GoldPage() {
  const { holdings, load, addHolding, updateHolding, deleteHolding, loading } = useGoldStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoldHolding | null>(null);
  const [form, setForm] = useState<Omit<GoldHolding, "id">>({
    name: "",
    type: "physical",
    quantityGrams: 0,
    purity: 24,
    purchasePricePerGram: 0,
    currentPricePerGram: 0,
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const invested = holdings.reduce(
      (sum, h) => sum + h.quantityGrams * h.purchasePricePerGram,
      0
    );
    const current = holdings.reduce(
      (sum, h) => sum + h.quantityGrams * h.currentPricePerGram,
      0
    );
    const grams = holdings.reduce((sum, h) => sum + h.quantityGrams, 0);
    return {
      invested,
      current,
      pnl: current - invested,
      grams,
    };
  }, [holdings]);

  const resetForm = () => {
    setForm({
      name: "",
      type: "physical",
      quantityGrams: 0,
      purity: 24,
      purchasePricePerGram: 0,
      currentPricePerGram: 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateHolding(editing.id, form);
    } else {
      await addHolding(form);
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const openEdit = (holding: GoldHolding) => {
    setEditing(holding);
    setForm({
      name: holding.name,
      type: holding.type,
      quantityGrams: holding.quantityGrams,
      purity: holding.purity,
      purchasePricePerGram: holding.purchasePricePerGram,
      currentPricePerGram: holding.currentPricePerGram,
      purchaseDate: holding.purchaseDate,
      notes: holding.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gold Holdings</h1>
          <p className="text-sm text-gray-600">
            Track physical gold, ETFs, or sovereign gold bonds. Values persist locally in your browser.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Holding" : "Add Holding"}</DialogTitle>
              <DialogDescription>
                Enter quantity, purity, and prices to see mark-to-market P&amp;L.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., 24K Coins or Gold ETF"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((p) => ({ ...p, type: val as GoldType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="sov">Sovereign Gold Bond</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity (grams)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantityGrams}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, quantityGrams: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purity (Karat)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={form.purity}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, purity: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price / gram</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePricePerGram}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        purchasePricePerGram: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Price / gram</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentPricePerGram}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        currentPricePerGram: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Add certificate info or ETF ticker"
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Save Changes" : "Add Holding"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Gold</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.grams.toFixed(2)} g</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invested</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(totals.invested)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(totals.current)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>P&amp;L</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${
              totals.pnl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(totals.pnl)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Gold Holdings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : holdings.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No holdings yet. Add your first gold item.
            </p>
          ) : (
            holdings.map((holding) => {
              const invested = holding.quantityGrams * holding.purchasePricePerGram;
              const current = holding.quantityGrams * holding.currentPricePerGram;
              const pnl = current - invested;
              return (
                <div
                  key={holding.id}
                  className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100 text-amber-700">
                      <Gem className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{holding.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{holding.type}</p>
                      <p className="text-xs text-gray-500">
                        {holding.quantityGrams} g @ ₹{holding.currentPricePerGram.toFixed(2)} |{" "}
                        {holding.purity}K
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-gray-500">Invested</p>
                      <p className="font-semibold">{formatCurrency(invested)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="font-semibold">{formatCurrency(current)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">P&amp;L</p>
                      <p
                        className={`font-semibold ${
                          pnl >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(pnl)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(holding)}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteHolding(holding.id)}
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
