"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

type Step = "upload" | "map" | "preview" | "done";

const REQUIRED_FIELDS = ["date", "amount", "description", "type"] as const;
const OPTIONAL_FIELDS = ["category", "subtype"] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;
type Field = (typeof ALL_FIELDS)[number];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((v) => v.trim().replace(/^"|"$/g, "")),
  );
  return { headers, rows };
}

function autoDetect(headers: string[]): Record<Field, string> {
  const mapping: Record<Field, string> = {
    date: "",
    amount: "",
    description: "",
    type: "",
    category: "",
    subtype: "",
  };
  const lower = headers.map((h) => h.toLowerCase());
  lower.forEach((h, i) => {
    const orig = headers[i]!;
    if (/date/i.test(h)) mapping.date = mapping.date || orig;
    if (/amount|sum|value/i.test(h)) mapping.amount = mapping.amount || orig;
    if (/desc|narration|note|details|particulars/i.test(h))
      mapping.description = mapping.description || orig;
    if (/type|txn_type|transaction_type|debit_credit/i.test(h))
      mapping.type = mapping.type || orig;
    if (/categor/i.test(h)) mapping.category = mapping.category || orig;
    if (/sub|subtype|tag/i.test(h)) mapping.subtype = mapping.subtype || orig;
  });
  return mapping;
}

export function CsvImportModal({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<Field, string>>({
    date: "",
    amount: "",
    description: "",
    type: "",
    category: "",
    subtype: "",
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({ date: "", amount: "", description: "", type: "", category: "", subtype: "" });
    setImporting(false);
    setResult(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        toast.error("Could not parse CSV file. Make sure it has a header row.");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoDetect(parsed.headers));
      setStep("map");
    };
    reader.readAsText(file);
  };

  const preview = rows.slice(0, 5).map((row) => {
    const get = (field: Field) => {
      const col = mapping[field];
      if (!col) return "";
      const idx = headers.indexOf(col);
      return idx >= 0 ? (row[idx] ?? "") : "";
    };
    return {
      date: get("date"),
      amount: get("amount"),
      description: get("description"),
      type: get("type"),
      category: get("category"),
      subtype: get("subtype"),
    };
  });

  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);

  const handleImport = async () => {
    setImporting(true);
    const transactions = rows
      .map((row) => {
        const get = (field: Field) => {
          const col = mapping[field];
          if (!col) return "";
          const idx = headers.indexOf(col);
          return idx >= 0 ? (row[idx] ?? "") : "";
        };
        const rawType = get("type").toLowerCase();
        const type = rawType.includes("income") || rawType.includes("credit")
          ? "income"
          : "expense";
        const amount = parseFloat(get("amount").replace(/[^\d.-]/g, ""));
        return {
          date: get("date"),
          amount: isNaN(amount) ? null : Math.abs(amount),
          description: get("description"),
          type,
          category: get("category") || "Other",
          subtype: get("subtype") || "Other",
        };
      })
      .filter((t) => t.amount !== null && t.date && t.description);

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({ imported: data.imported, skipped: data.skipped ?? 0 });
      setStep("done");
      onImported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file and map its columns to transaction fields.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports bank statement exports and manual CSV files
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rows.length} rows found. Map each field to the right column.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ALL_FIELDS.map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="capitalize">
                    {field}
                    {REQUIRED_FIELDS.includes(field as (typeof REQUIRED_FIELDS)[number]) && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Select
                    value={mapping[field]}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— not mapped —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— not mapped —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button
                disabled={missingRequired.length > 0}
                onClick={() => setStep("preview")}
              >
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing first 5 rows. {rows.length} total rows will be imported.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-muted">
                  <tr>
                    {["Date", "Amount", "Type", "Description", "Category"].map((h) => (
                      <th key={h} className="text-left p-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.date}</td>
                      <td className="p-2">{row.amount}</td>
                      <td className="p-2 capitalize">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            row.type.includes("income")
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.type.includes("income") ? "income" : "expense"}
                        </span>
                      </td>
                      <td className="p-2 max-w-40 truncate">{row.description}</td>
                      <td className="p-2">{row.category || "Other"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Import {rows.length} Transactions
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-semibold">{result.imported} transactions imported</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {result.skipped} rows skipped (missing required fields)
                </p>
              )}
            </div>
            <Button onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
