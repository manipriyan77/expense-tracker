"use client";

import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Zap, Tag as TagIcon, RotateCcw, Loader2 } from "lucide-react";
import { useLookupsStore, type LookupKind } from "@/store/lookups-store";
import { useCategorizationRulesStore } from "@/store/categorization-rules-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useIgnoredRecurringPatternsStore } from "@/store/ignored-recurring-patterns-store";
import { CardSkeleton } from "@/components/ui/skeleton";

function LookupSection({
  title,
  description,
  kind,
  usageCounts,
}: {
  title: string;
  description: string;
  kind: LookupKind;
  usageCounts: Record<string, number>;
}) {
  const { categories, accounts, tags, addLookup, deleteLookup } = useLookupsStore();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = kind === "category" ? categories : kind === "account" ? accounts : tags;

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await addLookup(kind, trimmed);
      setName("");
    } catch {
      toast.error(`Could not add ${kind}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLookup(id);
      toast.success(`Removed from ${kind} list`);
    } catch {
      toast.error(`Could not remove ${kind}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex gap-2">
          <Input
            placeholder={`New ${kind} name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button onClick={handleAdd} disabled={adding || !name.trim()} className="gap-1.5 shrink-0">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-6">
            No {kind}s yet
          </p>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {usageCounts[item.name.toLowerCase()] ?? 0} transaction
                      {(usageCounts[item.name.toLowerCase()] ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
        <p className="text-[11px] text-muted-foreground">
          Removing a {kind} only affects future pickers — it doesn&apos;t change existing transactions.
        </p>
      </CardContent>
    </Card>
  );
}

export default function RulesPage() {
  const { fetchLookups, loading: lookupsLoading, fetched: lookupsFetched } = useLookupsStore();
  const { rules, loading: rulesLoading, fetchRules, addRule, updateRule, deleteRule } = useCategorizationRulesStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { ignoredKeys, fetchIgnored, restoreAll } = useIgnoredRecurringPatternsStore();

  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");
  const [newRuleSubtype, setNewRuleSubtype] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchLookups();
    fetchRules();
    fetchTransactions();
    fetchIgnored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      const key = (t.category || "").toLowerCase();
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const accountUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      const key = (t.account || "").toLowerCase();
      if (!key) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const tagUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      for (const tag of t.tags ?? []) {
        const key = tag.toLowerCase();
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [transactions]);

  const handleAddRule = async () => {
    if (!newRuleKeyword || !newRuleCategory) {
      toast.error("Keyword and category are required");
      return;
    }
    setAddingRule(true);
    try {
      await addRule({ keyword: newRuleKeyword, category: newRuleCategory, subtype: newRuleSubtype || null, priority: 0 });
      setNewRuleKeyword("");
      setNewRuleCategory("");
      setNewRuleSubtype("");
      toast.success("Rule added");
    } catch {
      toast.error("Failed to add rule");
    } finally {
      setAddingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    setDeletingRuleId(id);
    try {
      await deleteRule(id);
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setDeletingRuleId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restoreAll();
      toast.success("Ignored suggestions restored");
    } catch {
      toast.error("Could not restore suggestions");
    } finally {
      setRestoring(false);
    }
  };

  if (!lookupsFetched && (lookupsLoading || rulesLoading)) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Toaster position="top-center" />
      <div>
        <h1 className="text-xl font-bold">Rules & Tags</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage categories, accounts, tags, and auto-categorization rules.
        </p>
      </div>

      <LookupSection
        title="Categories"
        description="Managed category list shown in pickers across the app"
        kind="category"
        usageCounts={categoryUsage}
      />
      <LookupSection
        title="Accounts"
        description="Bank accounts, cards, or wallets used to tag transactions"
        kind="account"
        usageCounts={accountUsage}
      />
      <LookupSection
        title="Tags"
        description="Simple labels for organizing transactions — no category required"
        kind="tag"
        usageCounts={tagUsage}
      />

      <Card>
        <CardHeader className="pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Auto-Categorization Rules
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When a transaction&apos;s merchant contains a keyword, auto-fill its category
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Keyword, e.g. Swiggy" value={newRuleKeyword} onChange={(e) => setNewRuleKeyword(e.target.value)} />
            <Input placeholder="Category, e.g. Food" value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)} />
            <Input placeholder="Subtype (optional)" value={newRuleSubtype} onChange={(e) => setNewRuleSubtype(e.target.value)} />
          </div>
          <Button onClick={handleAddRule} disabled={addingRule} className="gap-2">
            {addingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Rule
          </Button>

          {rules.length === 0 ? (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-6">
              No rules yet
            </p>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-border">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
                      <span className={`font-medium text-sm ${rule.enabled === false ? "text-muted-foreground line-through" : ""}`}>
                        {rule.keyword}
                      </span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{rule.category}</span>
                      {rule.subtype && <span className="text-[10px] text-muted-foreground">· {rule.subtype}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={rule.enabled !== false}
                        onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                        aria-label={rule.enabled === false ? "Enable rule" : "Disable rule"}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deletingRuleId === rule.id}
                      >
                        {deletingRuleId === rule.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Recurring detection
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suggestions you dismiss on the Recurring page stay hidden. Restore them to see all suggestions again.
          </p>
        </CardHeader>
        <CardContent className="pt-4 flex items-center justify-between">
          <p className="text-sm">
            {ignoredKeys.length} ignored suggestion{ignoredKeys.length === 1 ? "" : "s"}
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRestore} disabled={restoring || ignoredKeys.length === 0}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restore ignored suggestions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
