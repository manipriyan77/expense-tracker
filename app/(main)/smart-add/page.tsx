"use client";

import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowDownToLine,
  Wand2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionsStore } from "@/store/transactions-store";
import { useCategorizationRulesStore } from "@/store/categorization-rules-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import {
  parseTransactions,
  extractKeyword,
  getSubtypesFor,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type ParsedTransaction,
  type TransactionType,
} from "@/lib/utils/parse-transaction";

interface DraftRow extends ParsedTransaction {
  id: string;
  /** Category/subtype shown to the user before any manual edit — used to
   *  detect corrections so the system can learn from them. */
  suggestedCategory: string;
  suggestedSubtype: string;
  /** True when a previously-learned rule drove the suggestion. */
  learned: boolean;
}

const EXAMPLES = [
  "bus expense 120",
  "lunch at restaurant 350",
  "groceries 1.2k",
  "electricity bill 890",
  "got salary 55000",
  "petrol 1500",
  "netflix subscription 199",
  "doctor visit 600",
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SmartAddPage() {
  const { fetchTransactions } = useTransactionsStore();
  const { rules, fetchRules, learnRule } = useCategorizationRulesStore();
  const { format } = useFormatCurrency();

  const [inputText, setInputText] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<DraftRow[]>([]);

  // Load previously-learned categorisation rules once.
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Apply a learned rule (if any) on top of the keyword parser. A user
  // correction wins over the built-in guess for matching text. Reading from
  // `rules` directly keeps this in sync as new corrections are learned.
  const applyLearning = useMemo(() => {
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    return (p: ParsedTransaction): { result: ParsedTransaction; learned: boolean } => {
      const lower = p.raw.toLowerCase();
      const match = sorted.find((r) => lower.includes(r.keyword.toLowerCase()));
      if (!match) return { result: p, learned: false };
      return {
        result: {
          ...p,
          category: match.category,
          subtype: match.subtype || p.subtype,
          confidence: 1,
        },
        learned: true,
      };
    };
  }, [rules]);

  // Live preview of what the current input will parse into (read-only feedback).
  const livePreview = useMemo<ParsedTransaction[]>(
    () =>
      inputText.trim()
        ? parseTransactions(inputText).map((p) => applyLearning(p).result)
        : [],
    [inputText, applyLearning],
  );

  const handleParse = () => {
    const lines = parseTransactions(inputText);
    if (lines.length === 0) {
      toast.error("Type something like \"bus expense 120\" first");
      return;
    }
    const parsed = lines.map((line) => {
      const { result: p, learned } = applyLearning(line);
      return {
        ...p,
        id: newId(),
        suggestedCategory: p.category,
        suggestedSubtype: p.subtype,
        learned,
      };
    });
    setDrafts((prev) => [...prev, ...parsed]);
    setInputText("");
  };

  const updateDraft = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...patch };
        // Keep subtype valid when type/category changes.
        if (patch.type || patch.category) {
          const subs = getSubtypesFor(next.category, next.type);
          if (!subs.includes(next.subtype)) next.subtype = subs[0];
        }
        return next;
      }),
    );
  };

  const removeDraft = (id: string) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));

  const saveAll = async () => {
    const invalid = drafts.find((d) => !d.amount || d.amount <= 0);
    if (invalid) {
      toast.error(`Set an amount for "${invalid.description}"`);
      return;
    }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const succeeded: DraftRow[] = [];
    try {
      for (const d of drafts) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: d.amount,
            description: d.description,
            category: d.category,
            subtype: d.subtype,
            type: d.type,
            date: today,
          }),
        });
        if (res.ok) succeeded.push(d);
      }
      if (succeeded.length > 0) {
        await fetchTransactions();

        // Learn from any corrections the user made before saving.
        const corrected = succeeded.filter(
          (d) =>
            d.category !== d.suggestedCategory ||
            d.subtype !== d.suggestedSubtype,
        );
        let learnedCount = 0;
        for (const d of corrected) {
          const keyword = extractKeyword(d.raw);
          if (!keyword) continue;
          try {
            await learnRule(keyword, d.category, d.subtype);
            learnedCount += 1;
          } catch {
            // best effort — saving the transaction already succeeded
          }
        }
        if (learnedCount > 0) {
          await fetchRules();
          toast.success(
            `Learned ${learnedCount} new categorisation${learnedCount > 1 ? "s" : ""} for next time`,
          );
        }

        setAdded((prev) => [...succeeded, ...prev].slice(0, 20));
        setDrafts((prev) =>
          prev.filter((d) => !succeeded.some((s) => s.id === d.id)),
        );
        toast.success(
          `Added ${succeeded.length} transaction${succeeded.length > 1 ? "s" : ""}`,
        );
      }
      if (succeeded.length < drafts.length) {
        toast.error("Some transactions could not be saved");
      }
    } catch {
      toast.error("Failed to save transactions");
    } finally {
      setSaving(false);
    }
  };

  const totalDraft = drafts.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-full">
      <Toaster position="top-right" richColors />
      <PageHeader
        title="Smart Add"
        description="Type naturally — like “bus expense 120” — and we’ll sort the category, amount and type for you."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Compose */}
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Wand2 className="h-4 w-4 text-primary" />
              What did you spend or earn?
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleParse();
                }
              }}
              placeholder={"bus expense 120\nlunch 350\ngot salary 55000"}
              className="min-h-[96px] text-base"
            />

            {/* Live feedback chips */}
            {livePreview.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {livePreview.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
                  >
                    {p.type === "income" ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <span className="font-medium">{p.category}</span>
                    <span className="text-muted-foreground">/ {p.subtype}</span>
                    {p.amount != null && (
                      <span className="font-semibold">{format(p.amount)}</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Tip: add one per line. Press{" "}
                <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
                  ⌘/Ctrl + Enter
                </kbd>{" "}
                to add to review.
              </p>
              <Button onClick={handleParse} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Parse
              </Button>
            </div>

            {/* Example chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() =>
                    setInputText((t) => (t ? `${t}\n${ex}` : ex))
                  }
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Review drafts */}
        {drafts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Review &amp; confirm ({drafts.length})
              </h2>
              <span className="text-sm text-muted-foreground">
                Total {format(totalDraft)}
              </span>
            </div>

            {drafts.map((d) => {
              const categories =
                d.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
              const subtypes = getSubtypesFor(d.category, d.type);
              return (
                <Card key={d.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {d.learned ? (
                          <Badge
                            variant="outline"
                            className="border-primary/40 text-primary gap-1"
                          >
                            <Wand2 className="h-3 w-3" />
                            Remembered
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              d.confidence >= 0.65
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                            }
                          >
                            {d.confidence >= 0.65 ? "High match" : "Check this"}
                          </Badge>
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                          “{d.raw}”
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraft(d.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {/* Type */}
                      <div className="col-span-1">
                        <label className="text-xs text-muted-foreground">Type</label>
                        <Select
                          value={d.type}
                          onValueChange={(v) =>
                            updateDraft(d.id, { type: v as TransactionType })
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount */}
                      <div className="col-span-1">
                        <label className="text-xs text-muted-foreground">Amount</label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={d.amount ?? ""}
                          onChange={(e) =>
                            updateDraft(d.id, {
                              amount: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          className="mt-1 h-9"
                          placeholder="0"
                        />
                      </div>

                      {/* Category */}
                      <div className="col-span-1">
                        <label className="text-xs text-muted-foreground">
                          Category
                        </label>
                        <Select
                          value={d.category}
                          onValueChange={(v) => updateDraft(d.id, { category: v })}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subtype */}
                      <div className="col-span-1">
                        <label className="text-xs text-muted-foreground">
                          Subtype
                        </label>
                        <Select
                          value={d.subtype}
                          onValueChange={(v) => updateDraft(d.id, { subtype: v })}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subtypes.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Description
                      </label>
                      <Input
                        value={d.description}
                        onChange={(e) =>
                          updateDraft(d.id, { description: e.target.value })
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex items-center gap-2">
              <Button
                onClick={saveAll}
                disabled={saving}
                className="gap-2 flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                Add {drafts.length} transaction{drafts.length > 1 ? "s" : ""}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDrafts([])}
                disabled={saving}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Recently added this session */}
        {added.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Added this session
            </h2>
            <Card>
              <CardContent className="py-2 divide-y divide-border">
                {added.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {a.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.category} · {a.subtype}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        a.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {a.type === "income" ? "+" : "-"}
                      {format(a.amount || 0)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {drafts.length === 0 && added.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Your parsed transactions will appear here for a quick review before
            saving.
          </div>
        )}
      </div>
    </div>
  );
}
