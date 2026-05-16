"use client";

import { useState } from "react";
import { useWorkout, BodyMeasurement } from "../workout-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";
import { toast } from "sonner";

type MeasurementKey = keyof Omit<BodyMeasurement, "id" | "date" | "notes">;

const MEASUREMENT_FIELDS: { key: MeasurementKey; label: string; unit: string }[] = [
  { key: "body_weight", label: "Body Weight", unit: "kg" },
  { key: "body_fat_pct", label: "Body Fat", unit: "%" },
  { key: "chest_cm", label: "Chest", unit: "cm" },
  { key: "waist_cm", label: "Waist", unit: "cm" },
  { key: "hips_cm", label: "Hips", unit: "cm" },
  { key: "left_arm_cm", label: "Left Arm", unit: "cm" },
  { key: "right_arm_cm", label: "Right Arm", unit: "cm" },
  { key: "left_thigh_cm", label: "Left Thigh", unit: "cm" },
  { key: "right_thigh_cm", label: "Right Thigh", unit: "cm" },
];

type ChartField = "body_weight" | "body_fat_pct" | "waist_cm" | "chest_cm";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Delta({ current, previous, unit }: { current: number | null; previous: number | null; unit: string }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> No change</span>;
  const isDown = diff < 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isDown ? "text-green-500" : "text-red-500"}`}>
      {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {diff > 0 ? "+" : ""}{diff.toFixed(1)} {unit}
    </span>
  );
}

export default function BodyMeasurementsPage() {
  const { bodyMeasurements, addBodyMeasurement, deleteBodyMeasurement } = useWorkout();
  const [showAdd, setShowAdd] = useState(false);
  const [chartField, setChartField] = useState<ChartField>("body_weight");
  const [form, setForm] = useState<Record<string, string>>({
    date: new Date().toISOString().split("T")[0],
    body_weight: "", body_fat_pct: "", chest_cm: "", waist_cm: "", hips_cm: "",
    left_arm_cm: "", right_arm_cm: "", left_thigh_cm: "", right_thigh_cm: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const sorted = [...bodyMeasurements].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const prev = sorted[sorted.length - 2] ?? null;

  const chartData = sorted.map((m) => ({
    date: formatDate(m.date),
    value: m[chartField] ?? null,
  })).filter((d) => d.value != null);

  const chartFieldMeta = MEASUREMENT_FIELDS.find((f) => f.key === chartField);

  const handleSave = async () => {
    const payload: Record<string, string | number | null> = { date: form.date, notes: form.notes || null };
    for (const f of MEASUREMENT_FIELDS) {
      payload[f.key] = form[f.key] ? parseFloat(form[f.key]) : null;
    }
    if (!Object.values(payload).some((v) => v !== null && v !== form.date && v !== (form.notes || null))) {
      toast.error("Enter at least one measurement");
      return;
    }
    setSaving(true);
    await addBodyMeasurement(payload as unknown as Omit<BodyMeasurement, "id">);
    setSaving(false);
    toast.success("Measurements saved");
    setShowAdd(false);
    setForm({ date: new Date().toISOString().split("T")[0], body_weight: "", body_fat_pct: "", chest_cm: "", waist_cm: "", hips_cm: "", left_arm_cm: "", right_arm_cm: "", left_thigh_cm: "", right_thigh_cm: "", notes: "" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this measurement?")) return;
    await deleteBodyMeasurement(id);
    toast.success("Deleted");
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Body Measurements</h1>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Log
        </Button>
      </div>

      {/* Latest stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MEASUREMENT_FIELDS.filter((f) => latest[f.key] != null).map((f) => (
            <Card key={f.key}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-xl font-bold">{latest[f.key]} <span className="text-sm font-normal text-muted-foreground">{f.unit}</span></p>
                <Delta current={latest[f.key] as number} previous={prev?.[f.key] as number ?? null} unit={f.unit} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Progress Chart</CardTitle>
              <select value={chartField} onChange={(e) => setChartField(e.target.value as ChartField)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                {(["body_weight", "body_fat_pct", "waist_cm", "chest_cm"] as ChartField[]).map((f) => {
                  const meta = MEASUREMENT_FIELDS.find((m) => m.key === f);
                  return <option key={f} value={f}>{meta?.label}</option>;
                })}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} ${chartFieldMeta?.unit ?? ""}`, chartFieldMeta?.label ?? ""]}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bodyMeasurements.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Scale className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
              <p className="text-sm text-muted-foreground">No measurements logged yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {[...bodyMeasurements].sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium">{formatDate(m.date)}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {MEASUREMENT_FIELDS.filter((f) => m[f.key] != null).map((f) => (
                      <span key={f.key} className="text-xs text-muted-foreground">
                        {f.label}: <span className="text-foreground font-medium">{m[f.key]} {f.unit}</span>
                      </span>
                    ))}
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground italic mt-1">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Measurements</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MEASUREMENT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label} ({f.unit})</Label>
                  <Input type="number" value={form[f.key]} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="—" className="h-8 text-sm" inputMode="decimal" step="0.1" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional…" className="h-8" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
