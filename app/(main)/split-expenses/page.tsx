"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AnimatedEmptyState } from "@/components/ui/empty-state";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Split,
  IndianRupee,
  Check,
} from "lucide-react";
import {
  useSplitExpensesStore,
  type SplitExpense,
} from "@/store/split-expenses-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { toast, Toaster } from "sonner";

const participantSchema = z.object({
  name: z.string().min(1, "Name required"),
  amount: z.string().min(1, "Amount required"),
});

const splitFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  totalAmount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  participants: z.array(participantSchema).min(2, "Need at least 2 participants"),
  notes: z.string().optional(),
});

type SplitFormData = z.infer<typeof splitFormSchema>;

export default function SplitExpensesPage() {
  const { format } = useFormatCurrency();
  const {
    splits,
    addSplit,
    deleteSplit,
    markParticipantPaid,
    markSettled,
    hydrateFromStorage,
  } = useSplitExpensesStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  const activeSplits = splits.filter((s) => !s.settled);
  const settledSplits = splits.filter((s) => s.settled);
  const totalOutstanding = activeSplits.reduce(
    (sum, s) => sum + s.participants.filter((p) => !p.paid).reduce((a, p) => a + p.amount, 0),
    0
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SplitFormData>({
    resolver: zodResolver(splitFormSchema),
    defaultValues: {
      description: "",
      totalAmount: "",
      date: new Date().toISOString().split("T")[0],
      participants: [
        { name: "", amount: "" },
        { name: "", amount: "" },
      ],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "participants" });
  const watchedTotal = watch("totalAmount");
  const watchedParticipants = watch("participants");

  const handleEvenSplit = () => {
    const total = parseFloat(watchedTotal);
    if (!total || fields.length === 0) return;
    const each = (total / fields.length).toFixed(2);
    fields.forEach((_, i) => setValue(`participants.${i}.amount`, each));
  };

  const onSubmit = (data: SplitFormData) => {
    addSplit({
      description: data.description,
      totalAmount: parseFloat(data.totalAmount),
      date: data.date,
      settled: false,
      notes: data.notes,
      participants: data.participants.map((p) => ({
        name: p.name,
        amount: parseFloat(p.amount),
        paid: false,
      })),
    });
    reset();
    setIsAddOpen(false);
    toast.success("Split expense added");
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Expense Splitting</p>
            <h1 className="text-2xl font-bold">Split Expenses</h1>
            <p className="text-sm text-slate-400 mt-1">Track who owes what</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4 mr-2" />
                Add Split
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Split Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="e.g., Dinner at restaurant" {...register("description")} />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <Input type="number" placeholder="0.00" step="0.01" {...register("totalAmount")} />
                    {errors.totalAmount && (
                      <p className="text-xs text-destructive">{errors.totalAmount.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" {...register("date")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="Any additional notes" {...register("notes")} />
                </div>

                {/* Participants */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Participants</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEvenSplit}
                      className="h-7 text-xs"
                    >
                      Even Split
                    </Button>
                  </div>
                  {fields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Name"
                        className="flex-1"
                        {...register(`participants.${i}.name`)}
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        step="0.01"
                        className="w-28"
                        {...register(`participants.${i}.amount`)}
                      />
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => remove(i)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {errors.participants && (
                    <p className="text-xs text-destructive">At least 2 participants required</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", amount: "" })}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Participant
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">Add Split</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Outstanding</p>
            <p className="font-mono text-lg font-semibold text-amber-400">{format(totalOutstanding)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Active Splits</p>
            <p className="font-mono text-lg font-semibold">{activeSplits.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Settled</p>
            <p className="font-mono text-lg font-semibold text-green-400">{settledSplits.length}</p>
          </div>
        </div>
      </div>

      {/* Active Splits */}
      {activeSplits.length === 0 ? (
        <AnimatedEmptyState
          illustration="🤝"
          title="No active splits"
          description="Add a split expense to start tracking who owes what."
          actionLabel="Add Split"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {activeSplits.map((split) => (
            <SplitCard
              key={split.id}
              split={split}
              format={format}
              onMarkPaid={markParticipantPaid}
              onMarkSettled={markSettled}
              onDelete={deleteSplit}
            />
          ))}
        </div>
      )}

      {/* Settled Splits */}
      {settledSplits.length > 0 && (
        <div>
          <button
            onClick={() => setShowSettled(!showSettled)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="h-4 w-4" />
            {showSettled ? "Hide" : "Show"} {settledSplits.length} settled split{settledSplits.length > 1 ? "s" : ""}
          </button>
          {showSettled && (
            <div className="space-y-3 mt-3">
              {settledSplits.map((split) => (
                <SplitCard
                  key={split.id}
                  split={split}
                  format={format}
                  onMarkPaid={markParticipantPaid}
                  onMarkSettled={markSettled}
                  onDelete={deleteSplit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SplitCardProps {
  split: SplitExpense;
  format: (n: number) => string;
  onMarkPaid: (splitId: string, participantName: string) => void;
  onMarkSettled: (splitId: string) => void;
  onDelete: (id: string) => void;
}

function SplitCard({ split, format, onMarkPaid, onMarkSettled, onDelete }: SplitCardProps) {
  const unpaidCount = split.participants.filter((p) => !p.paid).length;
  const outstanding = split.participants
    .filter((p) => !p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className={split.settled ? "opacity-70" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{split.description}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {split.date}
              {split.notes && <span> · {split.notes}</span>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono font-semibold text-sm">{format(split.totalAmount)}</p>
            {!split.settled && outstanding > 0 && (
              <p className="text-[10px] text-amber-600 font-medium">{format(outstanding)} owed</p>
            )}
            {split.settled && (
              <Badge variant="secondary" className="text-[10px]">Settled</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {split.participants.map((p) => (
          <div
            key={p.name}
            className={`flex items-center gap-2 rounded-lg p-2 ${
              p.paid
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-muted/50"
            }`}
          >
            {p.paid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{p.name}</span>
            <span className="font-mono text-sm">{format(p.amount)}</span>
            {!p.paid && !split.settled && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => onMarkPaid(split.id, p.name)}
              >
                <Check className="h-3 w-3 mr-1" />
                Paid
              </Button>
            )}
          </div>
        ))}

        {!split.settled && (
          <div className="flex gap-2 pt-1">
            {unpaidCount === 0 ? (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onMarkSettled(split.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Mark Settled
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onMarkSettled(split.id)}
              >
                Settle All
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(split.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
