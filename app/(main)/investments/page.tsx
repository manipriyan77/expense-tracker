"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Gem,
  Globe,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronLeft,
  Edit2,
  Trophy,
  Activity,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStocksStore, type Stock } from "@/store/stocks-store";
import {
  useMutualFundsStore,
  type MutualFund,
} from "@/store/mutual-funds-store";
import { useGoldStore, type GoldHolding } from "@/store/gold-store";
import { useSilverStore, type SilverHolding } from "@/store/silver-store";
import { useForexStore, type ForexEntry } from "@/store/forex-store";
import {
  useOtherInvestmentsStore,
  type OtherInvestment,
  type OtherInvestmentType,
} from "@/store/other-investments-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { toast } from "sonner";
import { Toaster } from "sonner";

type AssetClass =
  | "stocks"
  | "mutual-funds"
  | "gold"
  | "silver"
  | "forex"
  | "other-investments";

const ASSET_CLASSES: {
  key: AssetClass;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "stocks",
    label: "Stocks & Equity",
    icon: BarChart3,
    description: "NSE, BSE, ETFs",
    color: "text-blue-500",
    bg: "hover:border-blue-500/50",
  },
  {
    key: "mutual-funds",
    label: "Mutual Funds",
    icon: PieChartIcon,
    description: "Equity, Debt, Hybrid",
    color: "text-purple-500",
    bg: "hover:border-purple-500/50",
  },
  {
    key: "gold",
    label: "Gold & Silver",
    icon: Gem,
    description: "Physical, ETF, SGB",
    color: "text-yellow-500",
    bg: "hover:border-yellow-500/50",
  },
  {
    key: "silver",
    label: "Silver",
    icon: Gem,
    description: "Physical, ETF",
    color: "text-slate-500",
    bg: "hover:border-slate-500/50",
  },
  {
    key: "forex",
    label: "Forex",
    icon: Globe,
    description: "International trading",
    color: "text-green-500",
    bg: "hover:border-green-500/50",
  },
  {
    key: "other-investments",
    label: "Other Investments",
    icon: Trophy,
    description: "PPF, EPF, NPS, LIC, Postal",
    color: "text-indigo-500",
    bg: "hover:border-indigo-500/50",
  },
];

const TYPE_BADGE: Record<AssetClass, { label: string; className: string }> = {
  stocks: {
    label: "Stocks",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  "mutual-funds": {
    label: "Mutual Fund",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  },
  gold: {
    label: "Gold",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  },
  silver: {
    label: "Silver",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
  },
  forex: {
    label: "Forex",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  "other-investments": {
    label: "Other",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
};

// Default form states
const defaultStockForm = {
  name: "",
  symbol: "",
  stockType: "large_cap",
  shares: "",
  avgPurchasePrice: "",
  currentPrice: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  sector: "information_technology",
  subSector: "",
};

const defaultMfForm = {
  name: "",
  symbol: "",
  category: "equity",
  subCategory: "flexi_cap",
  units: "",
  purchaseNav: "",
  nav: "",
  purchaseDate: new Date().toISOString().split("T")[0],
};

const defaultGoldForm = {
  name: "",
  type: "physical",
  quantityGrams: "",
  purity: "24",
  purchasePricePerGram: "",
  currentPricePerGram: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const defaultSilverForm = {
  name: "",
  type: "physical",
  quantityGrams: "",
  purity: "999",
  purchasePricePerGram: "",
  currentPricePerGram: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const defaultForexForm = {
  type: "deposit",
  month: "",
  amount: "",
  handler_share_percentage: "0",
  notes: "",
};

const defaultOtherForm = {
  name: "",
  type: "ppf" as OtherInvestmentType,
  investedAmount: "",
  currentValue: "",
  startDate: new Date().toISOString().split("T")[0],
  maturityDate: "",
  interestRate: "",
  notes: "",
  premiumAmount: "",
  premiumFrequency: "monthly" as
    | "monthly"
    | "quarterly"
    | "semi-annual"
    | "annual",
  sumAssured: "",
};

export default function InvestmentsPage() {
  const { format } = useFormatCurrency();
  const {
    stocks,
    loading: sLoading,
    fetchStocks,
    addStock,
    updateStock,
    deleteStock,
  } = useStocksStore();
  const {
    mutualFunds,
    loading: mLoading,
    fetchMutualFunds,
    addMutualFund,
    updateMutualFund,
    deleteMutualFund,
  } = useMutualFundsStore();
  const {
    holdings,
    loading: gLoading,
    load: loadGold,
    addHolding,
    updateHolding,
    deleteHolding,
    updateAllGoldPrices,
  } = useGoldStore();
  const {
    holdings: silverHoldings,
    load: loadSilver,
    addHolding: addSilverHolding,
    updateHolding: updateSilverHolding,
    deleteHolding: deleteSilverHolding,
    updateAllSilverPrices,
  } = useSilverStore();
  const {
    entries,
    loading: fLoading,
    load: loadForex,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useForexStore();
  const {
    investments: otherInvestments,
    loading: oLoading,
    load: loadOther,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  } = useOtherInvestmentsStore();

  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") ?? "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [selectedClass, setSelectedClass] = useState<AssetClass | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [stockForm, setStockForm] = useState(defaultStockForm);
  const [mfForm, setMfForm] = useState(defaultMfForm);
  const [goldForm, setGoldForm] = useState(defaultGoldForm);
  const [goldPriceUpdate, setGoldPriceUpdate] = useState("");
  const [silverForm, setSilverForm] = useState(defaultSilverForm);
  const [silverPriceUpdate, setSilverPriceUpdate] = useState("");
  const [forexForm, setForexForm] = useState(defaultForexForm);
  const [forexFilterType, setForexFilterType] = useState<
    "all" | "deposit" | "withdrawal" | "pnl"
  >("all");
  const [forexFilterMonth, setForexFilterMonth] = useState("");
  const [forexSortBy, setForexSortBy] = useState<
    "month-desc" | "month-asc" | "amount-desc" | "amount-asc"
  >("month-desc");
  const [forexCollapsed, setForexCollapsed] = useState<Set<string>>(new Set());
  const [otherForm, setOtherForm] = useState(defaultOtherForm);
  const [saving, setSaving] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const [detailItem, setDetailItem] = useState<{
    type: "stocks" | "mutual-funds" | "gold" | "silver";
    data: Stock | MutualFund | GoldHolding | SilverHolding;
  } | null>(null);

  // CSV Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<"stocks" | "mutual-funds">(
    "stocks",
  );
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "done">(
    "upload",
  );
  const [importSaving, setImportSaving] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStocks();
    fetchMutualFunds();
    loadGold();
    loadSilver();
    loadForex();
    loadOther();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Portfolio summary across all asset types
  const portfolio = useMemo(() => {
    const stockInvested = stocks.reduce((s, x) => s + x.investedAmount, 0);
    const stockCurrent = stocks.reduce((s, x) => s + x.currentValue, 0);
    const mfInvested = mutualFunds.reduce((s, x) => s + x.investedAmount, 0);
    const mfCurrent = mutualFunds.reduce((s, x) => s + x.currentValue, 0);
    const goldInvested = holdings.reduce(
      (s, x) => s + x.quantityGrams * x.purchasePricePerGram,
      0,
    );
    const goldCurrent = holdings.reduce(
      (s, x) => s + x.quantityGrams * x.currentPricePerGram,
      0,
    );
    const forexDeposited = entries
      .filter((e) => e.type === "deposit")
      .reduce((s, e) => s + e.amount, 0);
    const forexPnl = entries
      .filter((e) => e.type === "pnl")
      .reduce((s, e) => s + e.amount, 0);
    const forexWithdrawn = entries
      .filter((e) => e.type === "withdrawal")
      .reduce((s, e) => s + e.amount, 0);
    const forexBalance = forexDeposited + forexPnl - forexWithdrawn;

    const otherInvested = otherInvestments.reduce(
      (s, x) => s + x.investedAmount,
      0,
    );
    const otherCurrent = otherInvestments.reduce(
      (s, x) => s + x.currentValue,
      0,
    );

    const totalInvested =
      stockInvested +
      mfInvested +
      goldInvested +
      forexDeposited +
      otherInvested;
    const totalCurrent =
      stockCurrent + mfCurrent + goldCurrent + forexBalance + otherCurrent;
    const totalPnl = totalCurrent - totalInvested;
    const returnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return { totalInvested, totalCurrent, totalPnl, returnPct };
  }, [stocks, mutualFunds, holdings, entries, otherInvestments]);

  const pnlInfo = (pnl: number, invested: number) => {
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    const isPos = pnl >= 0;
    return {
      text: `${isPos ? "+" : ""}${format(pnl)} (${isPos ? "+" : ""}${pct.toFixed(1)}%)`,
      color: isPos
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400",
    };
  };

  const handleRefreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      const res = await fetch("/api/investments/refresh-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh prices");
      if (data.updated > 0) {
        toast.success(
          `Updated ${data.updated} price${data.updated > 1 ? "s" : ""} from market`,
        );
        fetchStocks();
        fetchMutualFunds();
      } else {
        toast.info(
          "No prices updated — check that symbols match Yahoo Finance format (e.g. RELIANCE.NS)",
        );
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRefreshingPrices(false);
    }
  };

  const openAddDialog = (type?: AssetClass) => {
    setEditMode(false);
    setEditId(null);
    setStockForm(defaultStockForm);
    setMfForm(defaultMfForm);
    setGoldForm(defaultGoldForm);
    setSilverForm(defaultSilverForm);
    setForexForm(defaultForexForm);
    setOtherForm(defaultOtherForm);
    if (type) {
      setSelectedClass(type);
      setDialogStep(2);
    } else {
      setSelectedClass(null);
      setDialogStep(1);
    }
    setDialogOpen(true);
  };

  const openEditStock = (s: Stock) => {
    setEditMode(true);
    setEditId(s.id);
    setSelectedClass("stocks");
    setStockForm({
      name: s.name,
      symbol: s.symbol,
      stockType: s.stockType ?? "large_cap",
      shares: String(s.shares),
      avgPurchasePrice: String(s.avgPurchasePrice),
      currentPrice: String(s.currentPrice),
      purchaseDate: s.purchaseDate,
      sector: s.sector ?? "information_technology",
      subSector: s.subSector ?? "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const openEditMf = (f: MutualFund) => {
    setEditMode(true);
    setEditId(f.id);
    setSelectedClass("mutual-funds");
    setMfForm({
      name: f.name,
      symbol: f.symbol,
      category: f.category,
      subCategory: f.subCategory,
      units: String(f.units),
      purchaseNav: String(f.purchaseNav),
      nav: String(f.nav),
      purchaseDate: f.purchaseDate,
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const openEditGold = (g: GoldHolding) => {
    setEditMode(true);
    setEditId(g.id);
    setSelectedClass("gold");
    setGoldForm({
      name: g.name,
      type: g.type,
      quantityGrams: String(g.quantityGrams),
      purity: String(g.purity),
      purchasePricePerGram: String(g.purchasePricePerGram),
      currentPricePerGram: String(g.currentPricePerGram),
      purchaseDate: g.purchaseDate,
      notes: g.notes ?? "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const openEditSilver = (g: SilverHolding) => {
    setEditMode(true);
    setEditId(g.id);
    setSelectedClass("silver");
    setSilverForm({
      name: g.name,
      type: g.type,
      quantityGrams: String(g.quantityGrams),
      purity: String(g.purity),
      purchasePricePerGram: String(g.purchasePricePerGram),
      currentPricePerGram: String(g.currentPricePerGram),
      purchaseDate: g.purchaseDate,
      notes: g.notes ?? "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const openEditForex = (e: ForexEntry) => {
    setEditMode(true);
    setEditId(e.id);
    setSelectedClass("forex");
    setForexForm({
      type: e.type,
      month: e.month,
      amount: String(e.amount),
      handler_share_percentage: String(e.handler_share_percentage),
      notes: e.notes ?? "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const exportForexCSV = () => {
    const rows = [
      [
        "Month",
        "Type",
        "Amount",
        "Handler Share %",
        "Handler Share Amount",
        "My Net",
        "Notes",
      ],
      ...entries.map((e) => {
        const hs =
          e.type === "withdrawal"
            ? (e.amount * e.handler_share_percentage) / 100
            : 0;
        return [
          e.month,
          e.type,
          e.amount,
          e.handler_share_percentage,
          hs.toFixed(2),
          e.type === "withdrawal" ? (e.amount - hs).toFixed(2) : e.amount,
          e.notes ?? "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forex-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditOther = (o: OtherInvestment) => {
    setEditMode(true);
    setEditId(o.id);
    setSelectedClass("other-investments");
    setOtherForm({
      name: o.name,
      type: o.type,
      investedAmount: String(o.investedAmount),
      currentValue: String(o.currentValue),
      startDate: o.startDate,
      maturityDate: o.maturityDate ?? "",
      interestRate: o.interestRate != null ? String(o.interestRate) : "",
      notes: o.notes ?? "",
      premiumAmount: o.premiumAmount != null ? String(o.premiumAmount) : "",
      premiumFrequency: o.premiumFrequency ?? "monthly",
      sumAssured: o.sumAssured != null ? String(o.sumAssured) : "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      if (selectedClass === "stocks") {
        if (!stockForm.name) {
          toast.error("Name is required");
          return;
        }
        const shares = parseFloat(stockForm.shares) || 0;
        const avgP = parseFloat(stockForm.avgPurchasePrice) || 0;
        const curP = parseFloat(stockForm.currentPrice) || 0;
        const payload = {
          name: stockForm.name,
          symbol: stockForm.symbol.toUpperCase(),
          stockType: stockForm.stockType as Stock["stockType"],
          shares,
          avgPurchasePrice: avgP,
          currentPrice: curP,
          investedAmount: shares * avgP,
          currentValue: shares * curP,
          purchaseDate: stockForm.purchaseDate,
          sector: stockForm.sector,
          subSector: stockForm.subSector || null,
        };
        if (editMode && editId) {
          await updateStock(editId, payload);
          toast.success("Stock updated");
        } else {
          await addStock(payload);
          toast.success("Stock added");
        }
      } else if (selectedClass === "mutual-funds") {
        if (!mfForm.name) {
          toast.error("Name is required");
          return;
        }
        const units = parseFloat(mfForm.units) || 0;
        const purchaseNav = parseFloat(mfForm.purchaseNav) || 0;
        const nav = parseFloat(mfForm.nav) || 0;
        const payload = {
          name: mfForm.name,
          symbol: mfForm.symbol,
          category: mfForm.category,
          subCategory: mfForm.subCategory,
          units,
          purchaseNav,
          nav,
          investedAmount: units * purchaseNav,
          currentValue: units * nav,
          purchaseDate: mfForm.purchaseDate,
        };
        if (editMode && editId) {
          await updateMutualFund(editId, payload);
          toast.success("Fund updated");
        } else {
          await addMutualFund(payload);
          toast.success("Fund added");
        }
      } else if (selectedClass === "gold") {
        if (!goldForm.name) {
          toast.error("Name is required");
          return;
        }
        const payload = {
          name: goldForm.name,
          type: goldForm.type as GoldHolding["type"],
          quantityGrams: parseFloat(goldForm.quantityGrams) || 0,
          purity: parseFloat(goldForm.purity) || 24,
          purchasePricePerGram: parseFloat(goldForm.purchasePricePerGram) || 0,
          currentPricePerGram: parseFloat(goldForm.currentPricePerGram) || 0,
          purchaseDate: goldForm.purchaseDate,
          notes: goldForm.notes,
        };
        if (editMode && editId) {
          await updateHolding(editId, payload);
          toast.success("Holding updated");
        } else {
          await addHolding(payload);
          toast.success("Holding added");
        }
      } else if (selectedClass === "silver") {
        if (!silverForm.name) {
          toast.error("Name is required");
          return;
        }
        const payload = {
          name: silverForm.name,
          type: silverForm.type as SilverHolding["type"],
          quantityGrams: parseFloat(silverForm.quantityGrams) || 0,
          purity: parseFloat(silverForm.purity) || 999,
          purchasePricePerGram: parseFloat(silverForm.purchasePricePerGram) || 0,
          currentPricePerGram: parseFloat(silverForm.currentPricePerGram) || 0,
          purchaseDate: silverForm.purchaseDate,
          notes: silverForm.notes,
        };
        if (editMode && editId) {
          await updateSilverHolding(editId, payload);
          toast.success("Holding updated");
        } else {
          await addSilverHolding(payload);
          toast.success("Holding added");
        }
      } else if (selectedClass === "forex") {
        if (!forexForm.month) {
          toast.error("Month is required");
          return;
        }
        const payload = {
          type: forexForm.type as ForexEntry["type"],
          month: forexForm.month,
          amount: parseFloat(forexForm.amount) || 0,
          handler_share_percentage:
            parseFloat(forexForm.handler_share_percentage) || 0,
          notes: forexForm.notes,
        };
        if (editMode && editId) {
          await updateEntry(editId, payload);
          toast.success("Entry updated");
        } else {
          await addEntry(payload);
          toast.success("Entry added");
        }
      } else if (selectedClass === "other-investments") {
        if (!otherForm.name) {
          toast.error("Name is required");
          return;
        }
        const isFDType = otherForm.type === "fd";
        const isRDType = otherForm.type === "rd";
        const fdPrincipal = parseFloat(otherForm.investedAmount) || 0;
        const fdRate = parseFloat(otherForm.interestRate) || 0;
        const fdFreq = otherForm.premiumFrequency || "quarterly";
        const rdInstallment = parseFloat(otherForm.premiumAmount) || 0;
        const rdRate = parseFloat(otherForm.interestRate) || 0;
        const rdMonthsElapsed =
          isRDType && otherForm.startDate
            ? Math.max(
                0,
                Math.floor(
                  (new Date().getTime() -
                    new Date(otherForm.startDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 30.44),
                ),
              )
            : 0;
        const rdTotalMonths =
          isRDType && otherForm.startDate && otherForm.maturityDate
            ? Math.max(
                0,
                Math.round(
                  (new Date(otherForm.maturityDate).getTime() -
                    new Date(otherForm.startDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 30.44),
                ),
              )
            : 0;

        const premAmt =
          !isFDType && !isRDType && otherForm.premiumAmount
            ? parseFloat(otherForm.premiumAmount)
            : isRDType
              ? rdInstallment
              : undefined;
        const autoInvested = isRDType
          ? rdInstallment * rdMonthsElapsed
          : !isFDType && premAmt && otherForm.startDate
            ? calcPremiumsPaid(
                premAmt,
                otherForm.premiumFrequency,
                otherForm.startDate,
              )
            : 0;
        const investedAmount =
          parseFloat(otherForm.investedAmount) || autoInvested || 0;

        const autoCurrentValue =
          isFDType && fdPrincipal && fdRate && otherForm.startDate
            ? calcFdValue(fdPrincipal, fdRate, fdFreq, otherForm.startDate)
            : 0;
        const autoMaturity =
          isFDType &&
          fdPrincipal &&
          fdRate &&
          otherForm.startDate &&
          otherForm.maturityDate
            ? calcFdValue(
                fdPrincipal,
                fdRate,
                fdFreq,
                otherForm.startDate,
                otherForm.maturityDate,
              )
            : isRDType && rdInstallment && rdRate && rdTotalMonths
              ? calcRdMaturity(rdInstallment, rdRate, rdTotalMonths)
              : 0;

        const payload: Omit<OtherInvestment, "id"> = {
          name: otherForm.name,
          type: otherForm.type,
          investedAmount,
          currentValue:
            parseFloat(otherForm.currentValue) ||
            autoCurrentValue ||
            investedAmount ||
            0,
          startDate: otherForm.startDate,
          maturityDate: otherForm.maturityDate || undefined,
          interestRate: otherForm.interestRate
            ? parseFloat(otherForm.interestRate)
            : undefined,
          notes: otherForm.notes || undefined,
          premiumAmount: isRDType
            ? rdInstallment || undefined
            : premAmt || undefined,
          premiumFrequency: isFDType
            ? (fdFreq as typeof otherForm.premiumFrequency)
            : premAmt
              ? otherForm.premiumFrequency
              : undefined,
          sumAssured: otherForm.sumAssured
            ? parseFloat(otherForm.sumAssured)
            : autoMaturity || undefined,
        };
        if (editMode && editId) {
          await updateInvestment(editId, payload);
          toast.success("Investment updated");
        } else {
          await addInvestment(payload);
          toast.success("Investment added");
        }
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: AssetClass, id: string) => {
    try {
      if (type === "stocks") await deleteStock(id);
      else if (type === "mutual-funds") await deleteMutualFund(id);
      else if (type === "gold") await deleteHolding(id);
      else if (type === "silver") await deleteSilverHolding(id);
      else if (type === "forex") await deleteEntry(id);
      else if (type === "other-investments") await deleteInvestment(id);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openImport = (type: "stocks" | "mutual-funds") => {
    setImportType(type);
    setImportRows([]);
    setImportHeaders([]);
    setImportStep("upload");
    setReplaceOnImport(false);
    setImportDialogOpen(true);
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const allLines = text.trim().split(/\r?\n/);
      if (allLines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      // Strip quotes, and non-ASCII chars (handles ₹ encoding issues like "â¹")
      const clean = (s: string) =>
        s
          .trim()
          .replace(/^"|"$/g, "")
          .replace(/[^\x00-\x7F]/g, "")
          .trim();

      // Auto-detect the actual header row (skip metadata rows like TickerTape's top 3 lines)
      let headerIdx = 0;
      for (let i = 0; i < Math.min(allLines.length, 8); i++) {
        const cols = allLines[i]!.split(",").map(clean).filter(Boolean);
        // A header row has several non-empty text fields (not all empty/URLs)
        if (
          cols.length >= 3 &&
          cols.some((c) => /^[a-zA-Z]/.test(c)) &&
          !cols[0]!.startsWith("http")
        ) {
          headerIdx = i;
          break;
        }
      }

      const headers = allLines[headerIdx]!.split(",").map(clean);
      const rows = allLines
        .slice(headerIdx + 1)
        .map((line) => {
          const vals = line.split(",").map(clean);
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            if (h) row[h] = vals[i] ?? "";
          });
          return row;
        })
        .filter((r) => {
          const firstVal = Object.values(r)[0] ?? "";
          // Skip empty rows and "Total" summary row
          return (
            firstVal &&
            firstVal.toLowerCase() !== "total" &&
            Object.values(r).some((v) => v)
          );
        });

      setImportHeaders(headers.filter(Boolean));
      setImportRows(rows);
      setImportStep("preview");
    };
    reader.readAsText(file);
  };

  // Returns a valid YYYY-MM-DD date string, or today's date if the value doesn't look like a date
  const parseDate = (val: string): string => {
    const today = new Date().toISOString().split("T")[0]!;
    if (!val) return today;
    // Must contain at least one letter or dash/slash separator and match a date-like pattern
    if (!/\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val) && !/[a-zA-Z]/.test(val))
      return today;
    const d = new Date(val);
    return isNaN(d.getTime()) ? today : d.toISOString().split("T")[0]!;
  };

  // Find a value in a row by checking multiple possible column name patterns (case-insensitive, partial match)
  const findCol = (
    row: Record<string, string>,
    ...patterns: string[]
  ): string => {
    for (const pat of patterns) {
      const entry = Object.entries(row).find(([k]) =>
        k.toLowerCase().includes(pat.toLowerCase()),
      );
      if (entry?.[1]) return entry[1];
    }
    return "";
  };

  // Generate a short symbol from fund/stock name
  const genSymbol = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 8) || "NA";

  const handleImportConfirm = async () => {
    setImportSaving(true);
    let success = 0,
      failed = 0;
    try {
      if (replaceOnImport) {
        if (importType === "stocks") {
          for (const s of stocks) await deleteStock(s.id);
        } else {
          for (const f of mutualFunds) await deleteMutualFund(f.id);
        }
      }
      for (const row of importRows) {
        try {
          if (importType === "stocks") {
            const nameVal = findCol(row, "name", "stock name", "scrip");
            const shares =
              parseFloat(findCol(row, "shares", "quantity", "qty")) || 0;
            const avgP =
              parseFloat(
                findCol(
                  row,
                  "avg_purchase_price",
                  "avg price",
                  "purchase_price",
                  "buy price",
                ),
              ) || 0;
            const curP =
              parseFloat(
                findCol(row, "current_price", "cmp", "ltp", "close price"),
              ) || 0;
            const symbolVal =
              findCol(row, "symbol", "ticker", "scrip code") ||
              genSymbol(nameVal);
            await addStock({
              name: nameVal,
              symbol: symbolVal.toUpperCase(),
              stockType: (findCol(row, "type", "stock_type", "cap") ||
                "other") as Stock["stockType"],
              shares,
              avgPurchasePrice: avgP,
              currentPrice: curP,
              investedAmount: shares * avgP,
              currentValue: shares * curP,
              purchaseDate: parseDate(
                findCol(row, "purchase_date", "date", "invested since"),
              ),
              sector: findCol(row, "sector") || null,
              subSector: null,
            });
          } else {
            const nameVal = findCol(row, "fund name", "name", "scheme name");
            const units = parseFloat(findCol(row, "units")) || 0;
            // Current NAV column
            const navVal = parseFloat(findCol(row, "nav")) || 0;
            // Invested amount — used to back-calculate purchase NAV
            const investedAmt =
              parseFloat(
                findCol(
                  row,
                  "invested amt",
                  "invested amount",
                  "invested_amount",
                  "purchase amount",
                ),
              ) || 0;
            // Purchase NAV: from explicit column or calculate from invested / units
            const purchaseNavExplicit =
              parseFloat(
                findCol(
                  row,
                  "purchase nav",
                  "purchase_nav",
                  "buy nav",
                  "avg nav",
                ),
              ) || 0;
            const purchaseNav =
              purchaseNavExplicit ||
              (units > 0 && investedAmt > 0 ? investedAmt / units : navVal);
            // Current value
            const currentVal =
              parseFloat(
                findCol(row, "current value", "current_value", "market value"),
              ) || units * navVal;
            const symbolVal =
              findCol(row, "symbol", "isin", "scheme code") ||
              genSymbol(nameVal);
            const categoryVal = (
              findCol(row, "category") || "equity"
            ).toLowerCase();
            const subCatRaw = findCol(
              row,
              "sub-category",
              "sub_category",
              "subcategory",
              "sub category",
            );
            // Normalize sub-category to a simple slug
            const subCatSlug =
              subCatRaw
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/(^_|_$)/g, "") || "other";
            const purchaseDateVal = parseDate(
              findCol(
                row,
                "invested since",
                "purchase_date",
                "purchase date",
                "date",
              ),
            );

            await addMutualFund({
              name: nameVal,
              symbol: symbolVal,
              category: categoryVal,
              subCategory: subCatSlug,
              units,
              purchaseNav,
              nav: navVal,
              investedAmount: investedAmt || units * purchaseNav,
              currentValue: currentVal,
              purchaseDate: purchaseDateVal,
            });
          }
          success++;
        } catch {
          failed++;
        }
      }
      setImportStep("done");
      if (success > 0)
        toast.success(
          `Imported ${success} ${importType === "stocks" ? "stocks" : "funds"}${failed > 0 ? `, ${failed} failed` : ""}`,
        );
      if (failed > 0 && success === 0)
        toast.error(`All ${failed} rows failed to import`);
    } finally {
      setImportSaving(false);
    }
  };

  const isLoading = sLoading || mLoading || gLoading || fLoading || oLoading;

  // Forex summary for the forex tab
  const forexSummary = useMemo(() => {
    const deposited = entries
      .filter((e) => e.type === "deposit")
      .reduce((s, e) => s + e.amount, 0);
    const pnl = entries
      .filter((e) => e.type === "pnl")
      .reduce((s, e) => s + e.amount, 0);
    const withdrawn = entries
      .filter((e) => e.type === "withdrawal")
      .reduce((s, e) => s + e.amount, 0);
    const handlerShare = entries
      .filter((e) => e.type === "withdrawal")
      .reduce((s, e) => s + (e.amount * e.handler_share_percentage) / 100, 0);
    const myProfit = withdrawn - handlerShare;
    return {
      deposited,
      pnl,
      withdrawn,
      balance: deposited + pnl - withdrawn,
      handlerShare,
      myProfit,
    };
  }, [entries]);

  // Forex monthly aggregation for charts
  const forexMonthlyData = useMemo(() => {
    const map: Record<
      string,
      {
        month: string;
        pnl: number;
        deposited: number;
        withdrawn: number;
        handlerShare: number;
        myProfit: number;
      }
    > = {};
    for (const e of entries) {
      if (!map[e.month])
        map[e.month] = {
          month: e.month,
          pnl: 0,
          deposited: 0,
          withdrawn: 0,
          handlerShare: 0,
          myProfit: 0,
        };
      if (e.type === "pnl") map[e.month].pnl += e.amount;
      if (e.type === "deposit") map[e.month].deposited += e.amount;
      if (e.type === "withdrawal") {
        const hs = (e.amount * e.handler_share_percentage) / 100;
        map[e.month].withdrawn += e.amount;
        map[e.month].handlerShare += hs;
        map[e.month].myProfit += e.amount - hs;
      }
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  // Forex running balance over months
  const forexRunningBalance = useMemo(() => {
    let balance = 0;
    return forexMonthlyData.map((m) => {
      balance += m.deposited + m.pnl - m.withdrawn;
      return { month: m.month, balance };
    });
  }, [forexMonthlyData]);

  // Filtered + sorted forex entries
  const filteredForexEntries = useMemo(() => {
    let result = [...entries];
    if (forexFilterType !== "all")
      result = result.filter((e) => e.type === forexFilterType);
    if (forexFilterMonth)
      result = result.filter((e) => e.month === forexFilterMonth);
    result.sort((a, b) => {
      if (forexSortBy === "month-desc") return b.month.localeCompare(a.month);
      if (forexSortBy === "month-asc") return a.month.localeCompare(b.month);
      if (forexSortBy === "amount-desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return result;
  }, [entries, forexFilterType, forexFilterMonth, forexSortBy]);

  // Grouped by month for the entries list
  const forexGroupedEntries = useMemo(() => {
    const groups: Record<string, typeof filteredForexEntries> = {};
    for (const e of filteredForexEntries) {
      if (!groups[e.month]) groups[e.month] = [];
      groups[e.month].push(e);
    }
    const sortedMonths = Object.keys(groups).sort((a, b) =>
      forexSortBy === "month-asc" ? a.localeCompare(b) : b.localeCompare(a),
    );
    return sortedMonths.map((month) => ({ month, entries: groups[month] }));
  }, [filteredForexEntries, forexSortBy]);

  // ── Analytics data ────────────────────────────────────────────────────────

  // Asset allocation pie data
  const allocationData = useMemo(() => {
    const si = stocks.reduce((s, x) => s + x.currentValue, 0);
    const mi = mutualFunds.reduce((s, x) => s + x.currentValue, 0);
    const gi = holdings.reduce(
      (s, x) => s + x.quantityGrams * x.currentPricePerGram,
      0,
    );
    const fi = forexSummary.balance;
    return [
      { name: "Stocks", value: si, color: "#3b82f6" },
      { name: "Mutual Funds", value: mi, color: "#8b5cf6" },
      { name: "Gold", value: gi, color: "#f59e0b" },
      { name: "Forex", value: fi > 0 ? fi : 0, color: "#22c55e" },
      {
        name: "Other",
        value: otherInvestments.reduce((s, x) => s + x.currentValue, 0),
        color: "#6366f1",
      },
    ].filter((d) => d.value > 0);
  }, [stocks, mutualFunds, holdings, forexSummary, otherInvestments]);

  // Per-asset-type performance
  const assetPerf = useMemo(() => {
    const si = stocks.reduce((s, x) => s + x.investedAmount, 0);
    const sc = stocks.reduce((s, x) => s + x.currentValue, 0);
    const mi = mutualFunds.reduce((s, x) => s + x.investedAmount, 0);
    const mc = mutualFunds.reduce((s, x) => s + x.currentValue, 0);
    const gi = holdings.reduce(
      (s, x) => s + x.quantityGrams * x.purchasePricePerGram,
      0,
    );
    const gc = holdings.reduce(
      (s, x) => s + x.quantityGrams * x.currentPricePerGram,
      0,
    );
    const fi = forexSummary.deposited;
    const fc = forexSummary.balance;
    return [
      {
        key: "stocks",
        label: "Stocks",
        invested: si,
        current: sc,
        pnl: sc - si,
        color: "#3b82f6",
        count: stocks.length,
      },
      {
        key: "mutual-funds",
        label: "Mutual Funds",
        invested: mi,
        current: mc,
        pnl: mc - mi,
        color: "#8b5cf6",
        count: mutualFunds.length,
      },
      {
        key: "gold",
        label: "Gold",
        invested: gi,
        current: gc,
        pnl: gc - gi,
        color: "#f59e0b",
        count: holdings.length,
      },
      {
        key: "forex",
        label: "Forex",
        invested: fi,
        current: fc,
        pnl: forexSummary.pnl,
        color: "#22c55e",
        count: entries.length,
      },
      {
        key: "other-investments",
        label: "Other",
        invested: otherInvestments.reduce((s, x) => s + x.investedAmount, 0),
        current: otherInvestments.reduce((s, x) => s + x.currentValue, 0),
        pnl:
          otherInvestments.reduce((s, x) => s + x.currentValue, 0) -
          otherInvestments.reduce((s, x) => s + x.investedAmount, 0),
        color: "#6366f1",
        count: otherInvestments.length,
      },
    ].filter((a) => a.count > 0);
  }, [stocks, mutualFunds, holdings, entries, forexSummary, otherInvestments]);

  // Bar chart data: invested vs current per asset type
  const assetBarData = useMemo(
    () =>
      assetPerf.map((a) => ({
        name: a.label,
        Invested: a.invested,
        Current: a.current,
      })),
    [assetPerf],
  );

  // Top 5 holdings by current value (combined)
  const topHoldings = useMemo(() => {
    const all: {
      name: string;
      type: string;
      invested: number;
      current: number;
      badge: string;
      color: string;
    }[] = [];
    stocks.forEach((s) =>
      all.push({
        name: s.name,
        type: "stocks",
        invested: s.investedAmount,
        current: s.currentValue,
        badge: "Stocks",
        color: "#3b82f6",
      }),
    );
    mutualFunds.forEach((f) =>
      all.push({
        name: f.name,
        type: "mutual-funds",
        invested: f.investedAmount,
        current: f.currentValue,
        badge: "MF",
        color: "#8b5cf6",
      }),
    );
    holdings.forEach((g) =>
      all.push({
        name: g.name,
        type: "gold",
        invested: g.quantityGrams * g.purchasePricePerGram,
        current: g.quantityGrams * g.currentPricePerGram,
        badge: "Gold",
        color: "#f59e0b",
      }),
    );
    otherInvestments.forEach((o) =>
      all.push({
        name: o.name,
        type: "other-investments",
        invested: o.investedAmount,
        current: o.currentValue,
        badge: "Other",
        color: "#6366f1",
      }),
    );
    return all.sort((a, b) => b.current - a.current).slice(0, 5);
  }, [stocks, mutualFunds, holdings, otherInvestments]);

  // Best performers by return %
  const performers = useMemo(() => {
    const all: {
      name: string;
      badge: string;
      returnPct: number;
      pnl: number;
      color: string;
    }[] = [];
    stocks.forEach((s) => {
      if (s.investedAmount > 0)
        all.push({
          name: s.name,
          badge: "Stocks",
          returnPct:
            ((s.currentValue - s.investedAmount) / s.investedAmount) * 100,
          pnl: s.currentValue - s.investedAmount,
          color: "#3b82f6",
        });
    });
    mutualFunds.forEach((f) => {
      if (f.investedAmount > 0)
        all.push({
          name: f.name,
          badge: "MF",
          returnPct:
            ((f.currentValue - f.investedAmount) / f.investedAmount) * 100,
          pnl: f.currentValue - f.investedAmount,
          color: "#8b5cf6",
        });
    });
    holdings.forEach((g) => {
      const inv = g.quantityGrams * g.purchasePricePerGram;
      const cur = g.quantityGrams * g.currentPricePerGram;
      if (inv > 0)
        all.push({
          name: g.name,
          badge: "Gold",
          returnPct: ((cur - inv) / inv) * 100,
          pnl: cur - inv,
          color: "#f59e0b",
        });
    });
    all.sort((a, b) => b.returnPct - a.returnPct);
    return { best: all.slice(0, 3), worst: all.slice(-3).reverse() };
  }, [stocks, mutualFunds, holdings]);

  // Sector breakdown for stocks
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    stocks.forEach((s) => {
      const sec = s.sector?.replace(/_/g, " ") ?? "Other";
      map[sec] = (map[sec] || 0) + s.currentValue;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [stocks]);

  // MF category breakdown
  const mfCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    mutualFunds.forEach((f) => {
      map[f.category] = (map[f.category] || 0) + f.currentValue;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
  }, [mutualFunds]);

  const SECTOR_COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#22c55e",
    "#ef4444",
    "#06b6d4",
    "#f97316",
    "#6366f1",
    "#ec4899",
    "#14b8a6",
  ];

  const hasAnyData =
    stocks.length > 0 ||
    mutualFunds.length > 0 ||
    holdings.length > 0 ||
    entries.length > 0 ||
    otherInvestments.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                Investments
              </p>
              <p className="text-xs text-slate-500">
                All your investment holdings in one place
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:text-white"
                onClick={handleRefreshPrices}
                disabled={refreshingPrices}
                title="Fetch latest prices from Yahoo Finance"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshingPrices ? "animate-spin" : ""}`}
                />
                {refreshingPrices ? "Refreshing..." : "Refresh Prices"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:text-white"
                onClick={() => openAddDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Investment
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Total Invested
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {format(portfolio.totalInvested)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Current Value
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {format(portfolio.totalCurrent)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Total P&L
              </p>
              <p
                className={`font-mono text-base font-semibold ${portfolio.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {portfolio.totalPnl >= 0 ? "+" : ""}
                {format(portfolio.totalPnl)}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Overall Return
              </p>
              <p
                className={`font-mono text-base font-semibold ${portfolio.returnPct >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {portfolio.returnPct >= 0 ? "+" : ""}
                {portfolio.returnPct.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 lg:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="stocks">
              Stocks
              {stocks.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {stocks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mutual-funds">
              Funds
              {mutualFunds.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {mutualFunds.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="gold">
              Gold
              {holdings.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {holdings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="forex">Forex</TabsTrigger>
            <TabsTrigger value="other-investments">
              Other
              {otherInvestments.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {otherInvestments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="silver">Silver</TabsTrigger>
          </TabsList>

          {/* ALL TAB — Investment Dashboard */}
          <TabsContent value="all" className="space-y-4 mt-4">
            {!hasAnyData ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold text-foreground mb-1">
                    No investments yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start tracking your portfolio
                  </p>
                  <Button onClick={() => openAddDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Investment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Asset Type Performance Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {assetPerf.map((a) => {
                    const ret = a.invested > 0 ? (a.pnl / a.invested) * 100 : 0;
                    const isPos = a.pnl >= 0;
                    return (
                      <Card
                        key={a.key}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setActiveTab(a.key)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {a.label}
                            </span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: a.color }}
                            />
                          </div>
                          <div className="font-mono text-base font-semibold text-foreground">
                            {format(a.current)}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-mono">
                              {format(a.invested)}
                            </span>{" "}
                            invested
                          </div>
                          <div
                            className={`font-mono text-sm font-semibold mt-1 flex items-center gap-1 ${isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {isPos ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {isPos ? "+" : ""}
                            {ret.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {a.count} {a.count === 1 ? "holding" : "holdings"}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Asset Allocation Pie */}
                  {allocationData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                          Asset Allocation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {allocationData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: unknown) => [format(v as number)]}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: 12,
                              }}
                            />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Invested vs Current Bar */}
                  {assetBarData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                          Invested vs Current Value
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={assetBarData}
                            barCategoryGap="30%"
                            barGap={4}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="rgba(128,128,128,0.15)"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) =>
                                v >= 100000
                                  ? `${(v / 100000).toFixed(1)}L`
                                  : v >= 1000
                                    ? `${(v / 1000).toFixed(0)}K`
                                    : String(v)
                              }
                            />
                            <Tooltip
                              formatter={(v: unknown) => [format(v as number)]}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: 12,
                              }}
                            />
                            <Legend
                              iconType="circle"
                              iconSize={8}
                              wrapperStyle={{ fontSize: 12 }}
                            />
                            <Bar
                              dataKey="Invested"
                              fill="#94a3b8"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="Current"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Top Holdings + Best/Worst Performers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top Holdings by Value */}
                  {topHoldings.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Top Holdings by Value
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {topHoldings.map((h, i) => {
                          const pnl = h.current - h.invested;
                          const ret =
                            h.invested > 0 ? (pnl / h.invested) * 100 : 0;
                          const total = topHoldings[0].current || 1;
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-bold w-4 text-muted-foreground">
                                    #{i + 1}
                                  </span>
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: h.color }}
                                  />
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {h.name}
                                  </span>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <div className="text-sm font-semibold text-foreground">
                                    {format(h.current)}
                                  </div>
                                  <div
                                    className={`text-xs ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                                  >
                                    {pnl >= 0 ? "+" : ""}
                                    {ret.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(h.current / total) * 100}%`,
                                    backgroundColor: h.color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* Best & Worst Performers */}
                  {(performers.best.length > 0 ||
                    performers.worst.length > 0) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          Performance Leaders
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {performers.best.length > 0 && (
                          <>
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">
                              Best Performers
                            </p>
                            <div className="space-y-2 mb-4">
                              {performers.best.map((p, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                                      style={{
                                        backgroundColor: p.color + "25",
                                        color: p.color,
                                      }}
                                    >
                                      {p.badge}
                                    </span>
                                    <span className="text-sm text-foreground truncate">
                                      {p.name}
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold text-green-600 shrink-0 ml-2">
                                    +{p.returnPct.toFixed(1)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {performers.worst.length > 0 &&
                          performers.worst[0]?.returnPct < 0 && (
                            <>
                              <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-2">
                                Needs Attention
                              </p>
                              <div className="space-y-2">
                                {performers.worst
                                  .filter((p) => p.returnPct < 0)
                                  .map((p, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                                          style={{
                                            backgroundColor: p.color + "25",
                                            color: p.color,
                                          }}
                                        >
                                          {p.badge}
                                        </span>
                                        <span className="text-sm text-foreground truncate">
                                          {p.name}
                                        </span>
                                      </div>
                                      <div className="text-sm font-semibold text-red-500 shrink-0 ml-2">
                                        {p.returnPct.toFixed(1)}%
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </>
                          )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sector & Category Breakdown */}
                {(sectorData.length > 0 || mfCategoryData.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sectorData.length > 0 && (
                      <Card className="overflow-hidden p-0">
                        <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Stock Sector Allocation
                          </p>
                        </CardHeader>
                        <div className="divide-y divide-border">
                          {(() => {
                            const total = sectorData.reduce(
                              (s, d) => s + d.value,
                              0,
                            );
                            return sectorData.slice(0, 6).map((item, i) => {
                              const pct =
                                total > 0 ? (item.value / total) * 100 : 0;
                              const color =
                                SECTOR_COLORS[i % SECTOR_COLORS.length];
                              return (
                                <div key={item.name} className="px-4 py-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-sm font-medium capitalize">
                                        {item.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {pct.toFixed(1)}%
                                      </span>
                                      <span className="font-mono font-semibold text-sm">
                                        {format(item.value)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </Card>
                    )}

                    {mfCategoryData.length > 0 && (
                      <Card className="overflow-hidden p-0">
                        <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Mutual Fund Categories
                          </p>
                        </CardHeader>
                        <div className="divide-y divide-border">
                          {(() => {
                            const total = mfCategoryData.reduce(
                              (s, d) => s + d.value,
                              0,
                            );
                            return mfCategoryData.map((item, i) => {
                              const pct =
                                total > 0 ? (item.value / total) * 100 : 0;
                              const color =
                                SECTOR_COLORS[i % SECTOR_COLORS.length];
                              return (
                                <div key={item.name} className="px-4 py-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-sm font-medium">
                                        {item.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {pct.toFixed(1)}%
                                      </span>
                                      <span className="font-mono font-semibold text-sm">
                                        {format(item.value)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: color,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* STOCKS TAB */}
          <TabsContent value="stocks" className="space-y-3 mt-4">
            <TabHeader
              count={stocks.length}
              label="holding"
              onAdd={() => openAddDialog("stocks")}
              onImport={() => openImport("stocks")}
            />
            {stocks.length > 0 &&
              (() => {
                const inv = stocks.reduce((s, x) => s + x.investedAmount, 0);
                const cur = stocks.reduce((s, x) => s + x.currentValue, 0);
                const pnl = cur - inv;
                const ret = inv > 0 ? (pnl / inv) * 100 : 0;
                return (
                  <Card className="overflow-hidden p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Invested
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(inv)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Current Value
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(cur)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Returns
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {format(pnl)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Overall Return
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {ret >= 0 ? "+" : ""}
                          {ret.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {/* Sector chart + performance ranking */}
            {stocks.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {sectorData.length > 0 && (
                  <Card className="overflow-hidden p-0">
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <CardTitle className="text-sm font-semibold">
                        Sector Allocation
                      </CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-border">
                      {(() => {
                        const total = sectorData.reduce(
                          (s, d) => s + d.value,
                          0,
                        );
                        return sectorData.slice(0, 7).map((item, i) => {
                          const pct =
                            total > 0 ? (item.value / total) * 100 : 0;
                          const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                          return (
                            <div key={item.name} className="px-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium capitalize">
                                    {item.name.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {pct.toFixed(1)}%
                                  </span>
                                  <span className="font-mono font-semibold text-sm">
                                    {format(item.value)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Card>
                )}

                <Card className="overflow-hidden p-0">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <CardTitle className="text-sm font-semibold">
                      Performance Ranking
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-border">
                    {[...stocks]
                      .sort((a, b) => {
                        const ra =
                          a.investedAmount > 0
                            ? (a.currentValue - a.investedAmount) /
                              a.investedAmount
                            : 0;
                        const rb =
                          b.investedAmount > 0
                            ? (b.currentValue - b.investedAmount) /
                              b.investedAmount
                            : 0;
                        return rb - ra;
                      })
                      .slice(0, 7)
                      .map((s, i) => {
                        const pnl = s.currentValue - s.investedAmount;
                        const ret =
                          s.investedAmount > 0
                            ? (pnl / s.investedAmount) * 100
                            : 0;
                        return (
                          <div
                            key={s.id}
                            className="px-4 py-2.5 flex items-center gap-3"
                          >
                            <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {s.name}
                              </p>
                              {s.symbol && (
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {s.symbol}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={`font-mono text-sm font-semibold ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {ret >= 0 ? "+" : ""}
                                {ret.toFixed(1)}%
                              </p>
                              <p
                                className={`font-mono text-[10px] ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {format(pnl)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </div>
            )}

            {stocks.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                label="No stocks added yet"
                onAdd={() => openAddDialog("stocks")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...stocks]
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .map((s) => {
                    const pnl = s.currentValue - s.investedAmount;
                    const isPos = pnl >= 0;
                    const d = pnlInfo(pnl, s.investedAmount);
                    return (
                      <Card
                        key={s.id}
                        className="cursor-pointer hover:border-blue-400/60 transition-colors overflow-hidden"
                        onClick={() =>
                          setDetailItem({ type: "stocks", data: s })
                        }
                      >
                        <CardContent className="p-0">
                          <div
                            className={`h-1 w-full ${isPos ? "bg-green-500" : "bg-red-500"}`}
                          />
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate leading-tight">
                                  {s.name}
                                </p>
                                {s.symbol && (
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    {s.symbol}
                                  </p>
                                )}
                              </div>
                              {s.stockType && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize shrink-0"
                                >
                                  {s.stockType.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs mb-2 bg-muted/40 rounded px-2 py-1.5">
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  Shares
                                </p>
                                <p className="font-mono font-medium">
                                  {s.shares}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  Avg Cost
                                </p>
                                <p className="font-mono font-medium">
                                  {format(s.avgPurchasePrice)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  LTP
                                </p>
                                <p
                                  className={`font-mono font-medium ${isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                >
                                  {format(s.currentPrice)}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Invested
                                </span>
                                <span className="font-mono">
                                  {format(s.investedAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Current
                                </span>
                                <span className="font-mono font-semibold">
                                  {format(s.currentValue)}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`mt-2 flex items-center justify-between rounded px-2 py-1 ${isPos ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}
                            >
                              <span
                                className={`text-xs font-medium ${isPos ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                              >
                                P&L
                              </span>
                              <p
                                className={`font-mono text-xs font-semibold ${d.color}`}
                              >
                                {d.text}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* MUTUAL FUNDS TAB */}
          <TabsContent value="mutual-funds" className="space-y-3 mt-4">
            <TabHeader
              count={mutualFunds.length}
              label="fund"
              onAdd={() => openAddDialog("mutual-funds")}
              addLabel="Add Fund"
              onImport={() => openImport("mutual-funds")}
            />
            {mutualFunds.length > 0 &&
              (() => {
                const inv = mutualFunds.reduce(
                  (s, x) => s + x.investedAmount,
                  0,
                );
                const cur = mutualFunds.reduce((s, x) => s + x.currentValue, 0);
                const pnl = cur - inv;
                const ret = inv > 0 ? (pnl / inv) * 100 : 0;
                return (
                  <Card className="overflow-hidden p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Invested
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(inv)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Current Value
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(cur)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Returns
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {format(pnl)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Overall Return
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {ret >= 0 ? "+" : ""}
                          {ret.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {/* Category chart + performance ranking */}
            {mutualFunds.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {mfCategoryData.length > 0 && (
                  <Card className="overflow-hidden p-0">
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <CardTitle className="text-sm font-semibold">
                        Category Breakdown
                      </CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-border">
                      {(() => {
                        const total = mfCategoryData.reduce(
                          (s, d) => s + d.value,
                          0,
                        );
                        return mfCategoryData.map((item, i) => {
                          const pct =
                            total > 0 ? (item.value / total) * 100 : 0;
                          const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                          return (
                            <div key={item.name} className="px-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium capitalize">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {pct.toFixed(1)}%
                                  </span>
                                  <span className="font-mono font-semibold text-sm">
                                    {format(item.value)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Card>
                )}

                <Card className="overflow-hidden p-0">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <CardTitle className="text-sm font-semibold">
                      Performance Ranking
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-border">
                    {[...mutualFunds]
                      .sort((a, b) => {
                        const ra =
                          a.investedAmount > 0
                            ? (a.currentValue - a.investedAmount) /
                              a.investedAmount
                            : 0;
                        const rb =
                          b.investedAmount > 0
                            ? (b.currentValue - b.investedAmount) /
                              b.investedAmount
                            : 0;
                        return rb - ra;
                      })
                      .slice(0, 7)
                      .map((f, i) => {
                        const pnl = f.currentValue - f.investedAmount;
                        const ret =
                          f.investedAmount > 0
                            ? (pnl / f.investedAmount) * 100
                            : 0;
                        return (
                          <div
                            key={f.id}
                            className="px-4 py-2.5 flex items-center gap-3"
                          >
                            <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate leading-tight">
                                {f.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {f.category}
                                {f.subCategory
                                  ? ` · ${f.subCategory.replace(/_/g, " ")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className={`font-mono text-sm font-semibold ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {ret >= 0 ? "+" : ""}
                                {ret.toFixed(1)}%
                              </p>
                              <p
                                className={`font-mono text-[10px] ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {format(pnl)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </div>
            )}

            {mutualFunds.length === 0 ? (
              <EmptyState
                icon={PieChartIcon}
                label="No mutual funds added yet"
                onAdd={() => openAddDialog("mutual-funds")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...mutualFunds]
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .map((f) => {
                    const pnl = f.currentValue - f.investedAmount;
                    const isPos = pnl >= 0;
                    const d = pnlInfo(pnl, f.investedAmount);
                    const navChangePct =
                      f.purchaseNav > 0
                        ? ((f.nav - f.purchaseNav) / f.purchaseNav) * 100
                        : 0;
                    return (
                      <Card
                        key={f.id}
                        className="cursor-pointer hover:border-purple-400/60 transition-colors overflow-hidden"
                        onClick={() =>
                          setDetailItem({ type: "mutual-funds", data: f })
                        }
                      >
                        <CardContent className="p-0">
                          <div
                            className={`h-1 w-full ${isPos ? "bg-green-500" : "bg-red-500"}`}
                          />
                          <div className="p-3">
                            <div className="mb-2">
                              <p className="font-semibold text-sm leading-tight line-clamp-2">
                                {f.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                                {f.category}
                                {f.subCategory
                                  ? ` · ${f.subCategory.replace(/_/g, " ")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-2 bg-muted/40 rounded px-2 py-1.5">
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  Units
                                </p>
                                <p className="font-mono font-medium">
                                  {f.units.toFixed(3)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  Buy NAV
                                </p>
                                <p className="font-mono font-medium">
                                  {format(f.purchaseNav)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground text-[10px]">
                                  Curr NAV
                                </p>
                                <p
                                  className={`font-mono font-medium ${navChangePct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                >
                                  {format(f.nav)}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Invested
                                </span>
                                <span className="font-mono">
                                  {format(f.investedAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Current
                                </span>
                                <span className="font-mono font-semibold">
                                  {format(f.currentValue)}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`mt-2 flex items-center justify-between rounded px-2 py-1 ${isPos ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}
                            >
                              <span
                                className={`text-xs font-medium ${isPos ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                              >
                                P&L
                              </span>
                              <p
                                className={`font-mono text-xs font-semibold ${d.color}`}
                              >
                                {d.text}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* GOLD TAB */}
          <TabsContent value="gold" className="space-y-3 mt-4">
            <TabHeader
              count={holdings.length}
              label="holding"
              onAdd={() => openAddDialog("gold")}
              addLabel="Add Gold"
            />

            {holdings.length > 0 &&
              (() => {
                const inv = holdings.reduce(
                  (s, x) => s + x.quantityGrams * x.purchasePricePerGram,
                  0,
                );
                const cur = holdings.reduce(
                  (s, x) => s + x.quantityGrams * x.currentPricePerGram,
                  0,
                );
                const pnl = cur - inv;
                const ret = inv > 0 ? (pnl / inv) * 100 : 0;
                const totalGrams = holdings.reduce(
                  (s, x) => s + x.quantityGrams,
                  0,
                );
                return (
                  <Card className="overflow-hidden p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Weight
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {totalGrams.toFixed(2)}g
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Invested
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(inv)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Current Value
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(cur)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Returns
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {format(pnl)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Overall Return
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {ret >= 0 ? "+" : ""}
                          {ret.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {holdings.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Type breakdown */}
                <Card className="overflow-hidden p-0">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <CardTitle className="text-sm font-semibold">
                      Holdings by Type
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-border">
                    {(() => {
                      const typeMap: Record<
                        string,
                        { grams: number; value: number }
                      > = {};
                      holdings.forEach((g) => {
                        if (!typeMap[g.type])
                          typeMap[g.type] = { grams: 0, value: 0 };
                        typeMap[g.type].grams += g.quantityGrams;
                        typeMap[g.type].value +=
                          g.quantityGrams * g.currentPricePerGram;
                      });
                      const total = Object.values(typeMap).reduce(
                        (s, v) => s + v.value,
                        0,
                      );
                      const typeColors: Record<string, string> = {
                        physical: "#f59e0b",
                        etf: "#3b82f6",
                        sov: "#8b5cf6",
                        other: "#6b7280",
                      };
                      const typeLabels: Record<string, string> = {
                        physical: "Physical Gold",
                        etf: "Gold ETF",
                        sov: "Sovereign Bond (SGB)",
                        other: "Other",
                      };
                      return Object.entries(typeMap)
                        .sort(([, a], [, b]) => b.value - a.value)
                        .map(([type, data]) => {
                          const pct =
                            total > 0 ? (data.value / total) * 100 : 0;
                          const color = typeColors[type] ?? "#6b7280";
                          return (
                            <div key={type} className="px-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {typeLabels[type] ?? type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {data.grams.toFixed(2)}g
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {pct.toFixed(1)}%
                                  </span>
                                  <span className="font-mono font-semibold text-sm">
                                    {format(data.value)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                </Card>

                {/* Gold Price Update */}
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                          Gold Price
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                          Updates all holding values at once
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          Current / gram
                        </p>
                        <p className="font-mono font-bold text-amber-900 dark:text-amber-300 text-xl">
                          {format(holdings[0]?.currentPricePerGram ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label
                          htmlFor="gold-price"
                          className="text-xs font-medium mb-1 block text-amber-800 dark:text-amber-300"
                        >
                          New Price (₹/gram)
                        </Label>
                        <Input
                          id="gold-price"
                          type="number"
                          placeholder="Enter current price per gram"
                          value={goldPriceUpdate}
                          onChange={(e) => setGoldPriceUpdate(e.target.value)}
                          className="text-sm h-9"
                          step="0.01"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-9 bg-amber-600 hover:bg-amber-700"
                        onClick={async () => {
                          const priceValue =
                            parseFloat(goldPriceUpdate) ||
                            holdings[0]?.currentPricePerGram ||
                            0;
                          try {
                            await updateAllGoldPrices(priceValue);
                            setGoldPriceUpdate("");
                            toast.success(
                              "Gold prices updated for all holdings!",
                            );
                          } catch (error) {
                            toast.error("Failed to update gold prices");
                          }
                        }}
                      >
                        Update All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {holdings.length === 0 ? (
              <EmptyState
                icon={Gem}
                label="No gold holdings added yet"
                onAdd={() => openAddDialog("gold")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {holdings.map((g) => {
                  const invested = g.quantityGrams * g.purchasePricePerGram;
                  const current = g.quantityGrams * g.currentPricePerGram;
                  const pnl = current - invested;
                  const isPos = pnl >= 0;
                  const d = pnlInfo(pnl, invested);
                  return (
                    <Card
                      key={g.id}
                      className="cursor-pointer hover:border-yellow-400/60 transition-colors overflow-hidden"
                      onClick={() => setDetailItem({ type: "gold", data: g })}
                    >
                      <CardContent className="p-0">
                        <div className="h-1 w-full bg-amber-400" />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="font-semibold text-sm truncate">
                              {g.name}
                            </p>
                            <div className="flex gap-1 shrink-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {g.type.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {g.purity}k
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-2 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Weight
                              </p>
                              <p className="font-mono font-medium">
                                {g.quantityGrams}g
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Buy/g
                              </p>
                              <p className="font-mono font-medium">
                                {format(g.purchasePricePerGram)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Curr/g
                              </p>
                              <p
                                className={`font-mono font-medium ${isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {format(g.currentPricePerGram)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Invested
                              </span>
                              <span className="font-mono">
                                {format(invested)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Current
                              </span>
                              <span className="font-mono font-semibold">
                                {format(current)}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`mt-2 flex items-center justify-between rounded px-2 py-1 ${isPos ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}
                          >
                            <span
                              className={`text-xs font-medium ${isPos ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                            >
                              P&L
                            </span>
                            <p
                              className={`font-mono text-xs font-semibold ${d.color}`}
                            >
                              {d.text}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* SILVER TAB */}
          <TabsContent value="silver" className="space-y-3 mt-4">
            <TabHeader
              count={silverHoldings.length}
              label="holding"
              onAdd={() => openAddDialog("silver")}
              addLabel="Add Silver"
            />

            {silverHoldings.length > 0 &&
              (() => {
                const inv = silverHoldings.reduce(
                  (s, x) => s + x.quantityGrams * x.purchasePricePerGram,
                  0,
                );
                const cur = silverHoldings.reduce(
                  (s, x) => s + x.quantityGrams * x.currentPricePerGram,
                  0,
                );
                const pnl = cur - inv;
                const ret = inv > 0 ? (pnl / inv) * 100 : 0;
                const totalGrams = silverHoldings.reduce(
                  (s, x) => s + x.quantityGrams,
                  0,
                );
                return (
                  <Card className="overflow-hidden p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Weight
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {totalGrams.toFixed(2)}g
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Invested
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(inv)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Current Value
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(cur)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Returns
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {format(pnl)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Overall Return
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {ret >= 0 ? "+" : ""}
                          {ret.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {silverHoldings.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Type breakdown */}
                <Card className="overflow-hidden p-0">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <CardTitle className="text-sm font-semibold">
                      Holdings by Type
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-border">
                    {(() => {
                      const typeMap: Record<
                        string,
                        { grams: number; value: number }
                      > = {};
                      silverHoldings.forEach((g) => {
                        if (!typeMap[g.type])
                          typeMap[g.type] = { grams: 0, value: 0 };
                        typeMap[g.type].grams += g.quantityGrams;
                        typeMap[g.type].value +=
                          g.quantityGrams * g.currentPricePerGram;
                      });
                      const total = Object.values(typeMap).reduce(
                        (s, v) => s + v.value,
                        0,
                      );
                      const typeColors: Record<string, string> = {
                        physical: "#94a3b8",
                        etf: "#3b82f6",
                        other: "#6b7280",
                      };
                      const typeLabels: Record<string, string> = {
                        physical: "Physical Silver",
                        etf: "Silver ETF",
                        other: "Other",
                      };
                      return Object.entries(typeMap)
                        .sort(([, a], [, b]) => b.value - a.value)
                        .map(([type, data]) => {
                          const pct =
                            total > 0 ? (data.value / total) * 100 : 0;
                          const color = typeColors[type] ?? "#6b7280";
                          return (
                            <div key={type} className="px-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {typeLabels[type] ?? type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {data.grams.toFixed(2)}g
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {pct.toFixed(1)}%
                                  </span>
                                  <span className="font-mono font-semibold text-sm">
                                    {format(data.value)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                </Card>

                {/* Silver Price Update */}
                <Card className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                          Silver Price
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                          Updates all holding values at once
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          Current / gram
                        </p>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-300 text-xl">
                          {format(silverHoldings[0]?.currentPricePerGram ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label
                          htmlFor="silver-price"
                          className="text-xs font-medium mb-1 block text-slate-700 dark:text-slate-300"
                        >
                          New Price (₹/gram)
                        </Label>
                        <Input
                          id="silver-price"
                          type="number"
                          placeholder="Enter current price per gram"
                          value={silverPriceUpdate}
                          onChange={(e) => setSilverPriceUpdate(e.target.value)}
                          className="text-sm h-9"
                          step="0.01"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-9 bg-slate-600 hover:bg-slate-700"
                        onClick={async () => {
                          const priceValue =
                            parseFloat(silverPriceUpdate) ||
                            silverHoldings[0]?.currentPricePerGram ||
                            0;
                          try {
                            await updateAllSilverPrices(priceValue);
                            setSilverPriceUpdate("");
                            toast.success(
                              "Silver prices updated for all holdings!",
                            );
                          } catch {
                            toast.error("Failed to update silver prices");
                          }
                        }}
                      >
                        Update All
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {silverHoldings.length === 0 ? (
              <EmptyState
                icon={Gem}
                label="No silver holdings added yet"
                onAdd={() => openAddDialog("silver")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {silverHoldings.map((g) => {
                  const invested = g.quantityGrams * g.purchasePricePerGram;
                  const current = g.quantityGrams * g.currentPricePerGram;
                  const pnl = current - invested;
                  const isPos = pnl >= 0;
                  const d = pnlInfo(pnl, invested);
                  return (
                    <Card
                      key={g.id}
                      className="cursor-pointer hover:border-slate-400/60 transition-colors overflow-hidden"
                      onClick={() => setDetailItem({ type: "silver", data: g })}
                    >
                      <CardContent className="p-0">
                        <div className="h-1 w-full bg-slate-400" />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="font-semibold text-sm truncate">
                              {g.name}
                            </p>
                            <div className="flex gap-1 shrink-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {g.type.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {g.purity} fine
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-2 bg-slate-50 dark:bg-slate-950/30 rounded px-2 py-1.5">
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Weight
                              </p>
                              <p className="font-mono font-medium">
                                {g.quantityGrams}g
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Buy/g
                              </p>
                              <p className="font-mono font-medium">
                                {format(g.purchasePricePerGram)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-muted-foreground text-[10px]">
                                Curr/g
                              </p>
                              <p
                                className={`font-mono font-medium ${isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {format(g.currentPricePerGram)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Invested
                              </span>
                              <span className="font-mono">
                                {format(invested)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Current
                              </span>
                              <span className="font-mono font-semibold">
                                {format(current)}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`mt-2 flex items-center justify-between rounded px-2 py-1 ${isPos ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}
                          >
                            <span
                              className={`text-xs font-medium ${isPos ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                            >
                              P&L
                            </span>
                            <p
                              className={`font-mono text-xs font-semibold ${d.color}`}
                            >
                              {d.text}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* FOREX TAB */}
          <TabsContent value="forex" className="space-y-3 mt-4">
            <TabHeader
              count={entries.length}
              label="entry"
              onAdd={() => openAddDialog("forex")}
              addLabel="Add Entry"
            />
            {entries.length > 0 && (
              <>
                {(() => {
                  const profitRate =
                    forexSummary.deposited > 0
                      ? (forexSummary.pnl / forexSummary.deposited) * 100
                      : 0;
                  const summaryCards = [
                    {
                      label: "Deposited",
                      value: format(forexSummary.deposited),
                      color: "text-blue-600",
                      bg: "bg-blue-50 dark:bg-blue-950/20",
                      sub: null,
                    },
                    {
                      label: "P&L",
                      value: `${forexSummary.pnl >= 0 ? "+" : ""}${format(forexSummary.pnl)}`,
                      color:
                        forexSummary.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      bg:
                        forexSummary.pnl >= 0
                          ? "bg-green-50 dark:bg-green-950/20"
                          : "bg-red-50 dark:bg-red-950/20",
                      sub: `${profitRate >= 0 ? "+" : ""}${profitRate.toFixed(1)}% return`,
                    },
                    {
                      label: "Withdrawn",
                      value: format(forexSummary.withdrawn),
                      color: "text-orange-600 dark:text-orange-400",
                      bg: "bg-orange-50 dark:bg-orange-950/20",
                      sub: null,
                    },
                    {
                      label: "My Profit",
                      value: `${forexSummary.myProfit >= 0 ? "+" : ""}${format(forexSummary.myProfit)}`,
                      color:
                        forexSummary.myProfit >= 0
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-red-600 dark:text-red-400",
                      bg:
                        forexSummary.myProfit >= 0
                          ? "bg-violet-50 dark:bg-violet-950/20"
                          : "bg-red-50 dark:bg-red-950/20",
                      sub:
                        forexSummary.handlerShare > 0
                          ? `After ${format(forexSummary.handlerShare)} handler cut`
                          : null,
                    },
                    {
                      label: "Handler Paid",
                      value: format(forexSummary.handlerShare),
                      color: "text-purple-600 dark:text-purple-400",
                      bg: "bg-purple-50 dark:bg-purple-950/20",
                      sub:
                        forexSummary.withdrawn > 0
                          ? `${((forexSummary.handlerShare / forexSummary.withdrawn) * 100).toFixed(1)}% of withdrawals`
                          : null,
                    },
                    {
                      label: "Balance",
                      value: format(forexSummary.balance),
                      color:
                        forexSummary.balance >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      bg: "bg-muted/40",
                      sub: null,
                    },
                  ];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {summaryCards.map((item) => (
                        <Card
                          key={item.label}
                          className={`overflow-hidden ${item.bg}`}
                        >
                          <CardContent className="p-3">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                              {item.label}
                            </p>
                            <p
                              className={`text-base font-bold font-mono ${item.color}`}
                            >
                              {item.value}
                            </p>
                            {item.sub && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {item.sub}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}

                {/* Portfolio Breakdown + Monthly Performance side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Portfolio breakdown donut */}
                  {(() => {
                    const totalPnl = entries
                      .filter((e) => e.type === "pnl")
                      .reduce((s, e) => s + e.amount, 0);
                    const donutData = [
                      {
                        name: "Deposited",
                        value: forexSummary.deposited,
                        color: "#3b82f6",
                      },
                      {
                        name: "P&L",
                        value: Math.abs(totalPnl),
                        color: totalPnl >= 0 ? "#22c55e" : "#ef4444",
                      },
                      {
                        name: "My Profit",
                        value:
                          forexSummary.myProfit > 0 ? forexSummary.myProfit : 0,
                        color: "#10b981",
                      },
                      {
                        name: "Handler Share",
                        value: forexSummary.handlerShare,
                        color: "#a855f7",
                      },
                    ].filter((d) => d.value > 0);

                    if (donutData.length === 0) return null;

                    const total =
                      forexSummary.deposited +
                      Math.abs(totalPnl) +
                      forexSummary.myProfit +
                      forexSummary.handlerShare;

                    return (
                      <Card>
                        <CardHeader className="pb-0">
                          <CardTitle className="text-sm font-semibold">
                            Portfolio Breakdown
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Donut with center balance label */}
                            <div className="relative shrink-0">
                              <ResponsiveContainer width={200} height={200}>
                                <PieChart>
                                  <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={62}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                  >
                                    {donutData.map((entry, i) => (
                                      <Cell
                                        key={i}
                                        fill={entry.color}
                                        strokeWidth={0}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(v: unknown) => [
                                      format(v as number),
                                    ]}
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                      fontSize: 12,
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Center label */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                  Balance
                                </p>
                                <p
                                  className={`font-mono font-bold text-base leading-tight ${forexSummary.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                >
                                  {format(forexSummary.balance)}
                                </p>
                              </div>
                            </div>

                            {/* Legend with amounts and % */}
                            <div className="flex-1 space-y-3 w-full">
                              {donutData.map((item) => {
                                const pct =
                                  total > 0 ? (item.value / total) * 100 : 0;
                                return (
                                  <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: item.color,
                                          }}
                                        />
                                        <span className="text-sm font-medium">
                                          {item.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          {pct.toFixed(1)}%
                                        </span>
                                        <span className="font-mono font-semibold text-sm">
                                          {format(item.value)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: item.color,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* P&L vs My Profit grouped bar chart */}
                  {forexMonthlyData.length > 1 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">
                            Monthly Performance
                          </CardTitle>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
                              P&L
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />
                              My Profit
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={forexMonthlyData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            barCategoryGap="30%"
                            barGap={4}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) =>
                                `₹${(v / 1000).toFixed(0)}k`
                              }
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(
                                v: unknown,
                                name: string | undefined,
                              ) => [format(v as number), name ?? ""]}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: 12,
                              }}
                              cursor={{
                                fill: "hsl(var(--muted))",
                                opacity: 0.4,
                              }}
                            />
                            <ReferenceLine y={0} stroke="hsl(var(--border))" />
                            <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                              {forexMonthlyData.map((m, i) => (
                                <Cell
                                  key={i}
                                  fill={m.pnl >= 0 ? "#22c55e" : "#ef4444"}
                                />
                              ))}
                            </Bar>
                            <Bar
                              dataKey="myProfit"
                              name="My Profit"
                              fill="#7c3aed"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
            {entries.length === 0 ? (
              <EmptyState
                icon={Globe}
                label="No forex entries yet"
                onAdd={() => openAddDialog("forex")}
              />
            ) : (
              <div className="space-y-3">
                {/* Filter / Sort / Export bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type filter pills */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    {(["all", "deposit", "withdrawal", "pnl"] as const).map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => setForexFilterType(t)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${forexFilterType === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {t === "all"
                            ? "All"
                            : t === "pnl"
                              ? "P&L"
                              : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Month filter */}
                  <input
                    type="month"
                    value={forexFilterMonth}
                    onChange={(e) => setForexFilterMonth(e.target.value)}
                    className="text-xs border rounded-lg px-2.5 py-1.5 bg-background text-foreground h-8"
                  />
                  {forexFilterMonth && (
                    <button
                      onClick={() => setForexFilterMonth("")}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      Clear
                    </button>
                  )}

                  {/* Sort */}
                  <div className="flex items-center gap-1 ml-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    <select
                      value={forexSortBy}
                      onChange={(e) =>
                        setForexSortBy(e.target.value as typeof forexSortBy)
                      }
                      className="text-xs border rounded-lg px-2 py-1.5 bg-background text-foreground h-8"
                    >
                      <option value="month-desc">Month ↓</option>
                      <option value="month-asc">Month ↑</option>
                      <option value="amount-desc">Amount ↓</option>
                      <option value="amount-asc">Amount ↑</option>
                    </select>
                  </div>

                  {/* Export CSV */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={exportForexCSV}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>

                {/* Empty filter result */}
                {filteredForexEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No entries match the current filter.
                  </p>
                )}

                {/* Grouped by month */}
                {forexGroupedEntries.map(({ month, entries: monthEntries }) => {
                  const isCollapsed = forexCollapsed.has(month);
                  const monthPnl = monthEntries
                    .filter((e) => e.type === "pnl")
                    .reduce((s, e) => s + e.amount, 0);
                  const monthDeposited = monthEntries
                    .filter((e) => e.type === "deposit")
                    .reduce((s, e) => s + e.amount, 0);
                  const monthWithdrawn = monthEntries
                    .filter((e) => e.type === "withdrawal")
                    .reduce((s, e) => s + e.amount, 0);
                  const monthHandlerShare = monthEntries
                    .filter((e) => e.type === "withdrawal")
                    .reduce(
                      (s, e) =>
                        s + (e.amount * e.handler_share_percentage) / 100,
                      0,
                    );
                  const monthMyProfit = monthWithdrawn - monthHandlerShare;

                  return (
                    <div key={month} className="space-y-1.5">
                      {/* Month group header */}
                      <button
                        onClick={() =>
                          setForexCollapsed((prev) => {
                            const next = new Set(prev);
                            next.has(month)
                              ? next.delete(month)
                              : next.add(month);
                            return next;
                          })
                        }
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm font-mono">
                            {month}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {monthEntries.length}{" "}
                            {monthEntries.length === 1 ? "entry" : "entries"}
                          </span>
                          {monthDeposited > 0 && (
                            <span className="text-[10px] font-mono text-blue-600">
                              +{format(monthDeposited)}
                            </span>
                          )}
                          {monthWithdrawn > 0 && (
                            <span className="text-[10px] font-mono text-orange-500">
                              -{format(monthWithdrawn)}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold font-mono ${monthPnl >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            P&L {monthPnl >= 0 ? "+" : ""}
                            {format(monthPnl)}
                          </span>
                          {monthMyProfit > 0 && (
                            <span className="text-[10px] font-semibold font-mono text-violet-600 dark:text-violet-400">
                              My Profit +{format(monthMyProfit)}
                            </span>
                          )}
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Entries in this month */}
                      {!isCollapsed && (
                        <div className="space-y-1.5 pl-2">
                          {monthEntries.map((e) => {
                            const isDeposit = e.type === "deposit";
                            const isWithdrawal = e.type === "withdrawal";
                            const isPnlPos = e.type === "pnl" && e.amount >= 0;
                            const handlerAmt =
                              isWithdrawal && e.handler_share_percentage > 0
                                ? (e.amount * e.handler_share_percentage) / 100
                                : 0;
                            const myNet = isWithdrawal
                              ? e.amount - handlerAmt
                              : 0;

                            const accent = isDeposit
                              ? "#3b82f6"
                              : isWithdrawal
                                ? "#f97316"
                                : isPnlPos
                                  ? "#22c55e"
                                  : "#ef4444";
                            const typeBg = isDeposit
                              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                              : isWithdrawal
                                ? "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300"
                                : isPnlPos
                                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300";
                            const amountColor = isDeposit
                              ? "text-blue-600 dark:text-blue-400"
                              : isWithdrawal
                                ? "text-orange-600 dark:text-orange-400"
                                : isPnlPos
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400";

                            return (
                              <div
                                key={e.id}
                                className="flex items-stretch rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div
                                  className="w-1 shrink-0"
                                  style={{ backgroundColor: accent }}
                                />
                                <div className="flex-1 px-4 py-3 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span
                                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBg}`}
                                        >
                                          {e.type === "pnl" ? "P&L" : e.type}
                                        </span>
                                      </div>
                                      <p
                                        className={`font-bold text-lg font-mono leading-none ${amountColor}`}
                                      >
                                        {e.type === "pnl" && e.amount >= 0
                                          ? "+"
                                          : ""}
                                        {format(e.amount)}
                                      </p>
                                      {isWithdrawal && handlerAmt > 0 && (
                                        <div className="flex items-center gap-3 mt-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                            <span className="text-[11px] text-muted-foreground">
                                              My net
                                            </span>
                                            <span className="text-[11px] font-semibold font-mono text-violet-600 dark:text-violet-400">
                                              {format(myNet)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                            <span className="text-[11px] text-muted-foreground">
                                              Handler{" "}
                                              {e.handler_share_percentage}%
                                            </span>
                                            <span className="text-[11px] font-semibold font-mono text-purple-500">
                                              {format(handlerAmt)}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {e.notes && (
                                        <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                                          {e.notes}
                                        </p>
                                      )}
                                    </div>
                                    <RowActions
                                      onEdit={() => openEditForex(e)}
                                      onDelete={() =>
                                        handleDelete("forex", e.id)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* OTHER INVESTMENTS TAB */}
          <TabsContent value="other-investments" className="space-y-3 mt-4">
            <TabHeader
              count={otherInvestments.length}
              label="investment"
              onAdd={() => openAddDialog("other-investments")}
              addLabel="Add Investment"
            />
            {otherInvestments.length > 0 &&
              (() => {
                const inv = otherInvestments.reduce(
                  (s, x) => s + x.investedAmount,
                  0,
                );
                const cur = otherInvestments.reduce(
                  (s, x) => s + x.currentValue,
                  0,
                );
                const pnl = cur - inv;
                const ret = inv > 0 ? (pnl / inv) * 100 : 0;
                return (
                  <Card className="overflow-hidden p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Invested
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(inv)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Current Value
                        </p>
                        <p className="font-mono font-semibold text-sm">
                          {format(cur)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Total Returns
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {format(pnl)}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                          Overall Return
                        </p>
                        <p
                          className={`font-mono font-semibold text-sm ${ret >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {ret >= 0 ? "+" : ""}
                          {ret.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

            {/* Type breakdown chart */}
            {otherInvestments.length > 0 &&
              (() => {
                const typeMap: Record<
                  string,
                  { invested: number; current: number; count: number }
                > = {};
                otherInvestments.forEach((o) => {
                  if (!typeMap[o.type])
                    typeMap[o.type] = { invested: 0, current: 0, count: 0 };
                  typeMap[o.type].invested += o.investedAmount;
                  typeMap[o.type].current += o.currentValue;
                  typeMap[o.type].count += 1;
                });
                const typeLabels: Record<string, string> = {
                  fd: "Fixed Deposit",
                  rd: "Recurring Deposit",
                  ppf: "PPF",
                  epf: "EPF / PF",
                  nps: "NPS",
                  postal: "Postal Savings",
                  lic: "LIC / Insurance",
                  other: "Other",
                };
                const total = Object.values(typeMap).reduce(
                  (s, v) => s + v.current,
                  0,
                );
                const sorted = Object.entries(typeMap).sort(
                  ([, a], [, b]) => b.current - a.current,
                );
                return (
                  <Card className="overflow-hidden p-0">
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <CardTitle className="text-sm font-semibold">
                        Breakdown by Type
                      </CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-border">
                      {sorted.map(([type, data], i) => {
                        const pct =
                          total > 0 ? (data.current / total) * 100 : 0;
                        const pnl = data.current - data.invested;
                        const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                        return (
                          <div key={type} className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <div>
                                  <span className="text-sm font-medium">
                                    {typeLabels[type] ?? type.toUpperCase()}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-2">
                                    {data.count} holding
                                    {data.count > 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-right">
                                <span
                                  className={`font-mono text-[10px] ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                                >
                                  {pnl >= 0 ? "+" : ""}
                                  {format(pnl)}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {pct.toFixed(1)}%
                                </span>
                                <span className="font-mono font-semibold text-sm">
                                  {format(data.current)}
                                </span>
                              </div>
                            </div>
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })()}
            {otherInvestments.length === 0 ? (
              <EmptyState
                icon={Trophy}
                label="No other investments yet"
                onAdd={() => openAddDialog("other-investments")}
              />
            ) : (
              otherInvestments.map((o) => {
                const pnl = o.currentValue - o.investedAmount;
                const d = pnlInfo(pnl, o.investedAmount);
                return (
                  <Card key={o.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">
                              {o.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs uppercase"
                            >
                              {o.type === "epf"
                                ? "EPF/PF"
                                : o.type === "fd"
                                  ? "FD"
                                  : o.type === "rd"
                                    ? "RD"
                                    : o.type.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Invested
                              </span>
                              <p className="font-mono font-medium">
                                {format(o.investedAmount)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Current Value
                              </span>
                              <p className="font-mono font-medium">
                                {format(o.currentValue)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Returns
                              </span>
                              <p className={`font-mono font-medium ${d.color}`}>
                                {d.text}
                              </p>
                            </div>
                            {o.interestRate != null && (
                              <div>
                                <span className="text-muted-foreground">
                                  Rate
                                </span>
                                <p className="font-mono font-medium">
                                  {o.interestRate}%
                                </p>
                              </div>
                            )}
                            {o.type === "fd" && o.premiumFrequency && (
                              <div>
                                <span className="text-muted-foreground">
                                  Compounding
                                </span>
                                <p className="font-mono font-medium capitalize">
                                  {o.premiumFrequency === "semi-annual"
                                    ? "Semi-Annual"
                                    : o.premiumFrequency
                                        .charAt(0)
                                        .toUpperCase() +
                                      o.premiumFrequency.slice(1)}
                                </p>
                              </div>
                            )}
                            {o.type === "rd" && o.premiumAmount != null && (
                              <div>
                                <span className="text-muted-foreground">
                                  Instalment
                                </span>
                                <p className="font-mono font-medium">
                                  {format(o.premiumAmount)}/mo
                                </p>
                              </div>
                            )}
                            {o.type !== "fd" &&
                              o.type !== "rd" &&
                              o.premiumAmount != null && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Premium
                                  </span>
                                  <p className="font-mono font-medium">
                                    {format(o.premiumAmount)}/
                                    {o.premiumFrequency === "monthly"
                                      ? "mo"
                                      : o.premiumFrequency === "quarterly"
                                        ? "qtr"
                                        : o.premiumFrequency === "semi-annual"
                                          ? "6mo"
                                          : "yr"}
                                  </p>
                                </div>
                              )}
                            {o.sumAssured != null && (
                              <div>
                                <span className="text-muted-foreground">
                                  {o.type === "fd" || o.type === "rd"
                                    ? "Maturity Amt"
                                    : "Sum Assured"}
                                </span>
                                <p className="font-mono font-medium">
                                  {format(o.sumAssured)}
                                </p>
                              </div>
                            )}
                            {o.startDate && (
                              <div>
                                <span className="text-muted-foreground">
                                  Start Date
                                </span>
                                <p>{o.startDate}</p>
                              </div>
                            )}
                            {o.maturityDate && (
                              <div>
                                <span className="text-muted-foreground">
                                  Maturity
                                </span>
                                <p>{o.maturityDate}</p>
                              </div>
                            )}
                          </div>
                          {o.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {o.notes}
                            </p>
                          )}
                        </div>
                        <RowActions
                          onEdit={() => openEditOther(o)}
                          onDelete={() =>
                            handleDelete("other-investments", o.id)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

        </Tabs>
      </main>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode
                ? `Edit ${ASSET_CLASSES.find((a) => a.key === selectedClass)?.label}`
                : dialogStep === 1
                  ? "Add Investment — Select Asset Class"
                  : `Add ${ASSET_CLASSES.find((a) => a.key === selectedClass)?.label}`}
            </DialogTitle>
            {!editMode && dialogStep === 2 && (
              <p className="text-sm text-muted-foreground">
                Step 2 of 2: Fill in the details
              </p>
            )}
          </DialogHeader>

          {/* Step 1: Asset class grid */}
          {dialogStep === 1 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {ASSET_CLASSES.map((cls) => {
                const Icon = cls.icon;
                return (
                  <button
                    key={cls.key}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border transition-all text-center ${cls.bg} hover:bg-muted/40`}
                    onClick={() => {
                      setSelectedClass(cls.key);
                      setDialogStep(2);
                    }}
                  >
                    <Icon className={`h-9 w-9 ${cls.color}`} />
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        {cls.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {cls.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Forms */}
          {dialogStep === 2 && selectedClass === "stocks" && (
            <StockForm form={stockForm} onChange={setStockForm} />
          )}
          {dialogStep === 2 && selectedClass === "mutual-funds" && (
            <MfForm form={mfForm} onChange={setMfForm} />
          )}
          {dialogStep === 2 && selectedClass === "gold" && (
            <GoldForm form={goldForm} onChange={setGoldForm} />
          )}
          {dialogStep === 2 && selectedClass === "silver" && (
            <SilverForm form={silverForm} onChange={setSilverForm} />
          )}
          {dialogStep === 2 && selectedClass === "forex" && (
            <ForexForm form={forexForm} onChange={setForexForm} />
          )}
          {dialogStep === 2 && selectedClass === "other-investments" && (
            <OtherForm form={otherForm} onChange={setOtherForm} />
          )}

          {dialogStep === 2 && (
            <div className="flex justify-between pt-2">
              {!editMode ? (
                <Button variant="outline" onClick={() => setDialogStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editMode
                      ? "Save Changes"
                      : "Add Investment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {detailItem?.type === "stocks"
                ? (detailItem.data as Stock).name
                : detailItem?.type === "mutual-funds"
                  ? (detailItem.data as MutualFund).name
                  : (detailItem?.data as GoldHolding)?.name}
            </DialogTitle>
          </DialogHeader>
          {detailItem?.type === "stocks" &&
            (() => {
              const s = detailItem.data as Stock;
              const pnl = s.currentValue - s.investedAmount;
              const d = pnlInfo(pnl, s.investedAmount);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {s.symbol && (
                      <Badge variant="outline" className="font-mono">
                        {s.symbol}
                      </Badge>
                    )}
                    {s.stockType && (
                      <Badge variant="outline" className="capitalize">
                        {s.stockType.replace("_", " ")}
                      </Badge>
                    )}
                    {s.sector && (
                      <Badge variant="outline" className="capitalize">
                        {s.sector.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Shares
                      </p>
                      <p className="font-mono font-medium">{s.shares}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Avg Price
                      </p>
                      <p className="font-mono font-medium">
                        {format(s.avgPurchasePrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        CMP
                      </p>
                      <p className="font-mono font-medium">
                        {format(s.currentPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Invested
                      </p>
                      <p className="font-mono font-medium">
                        {format(s.investedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current Value
                      </p>
                      <p className="font-mono font-medium">
                        {format(s.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        P&L
                      </p>
                      <p className={`font-mono font-medium ${d.color}`}>
                        {d.text}
                      </p>
                    </div>
                    {s.purchaseDate && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Purchase Date
                        </p>
                        <p>{s.purchaseDate}</p>
                      </div>
                    )}
                    {s.subSector && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Sub Sector
                        </p>
                        <p className="capitalize">
                          {s.subSector.replace(/_/g, " ")}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDetailItem(null);
                        openEditStock(s);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleDelete("stocks", s.id);
                        setDetailItem(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })()}
          {detailItem?.type === "mutual-funds" &&
            (() => {
              const f = detailItem.data as MutualFund;
              const pnl = f.currentValue - f.investedAmount;
              const d = pnlInfo(pnl, f.investedAmount);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {f.symbol && (
                      <Badge variant="outline" className="font-mono">
                        {f.symbol}
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {f.category}
                    </Badge>
                    {f.subCategory && (
                      <Badge variant="outline" className="capitalize">
                        {f.subCategory.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Units
                      </p>
                      <p className="font-mono font-medium">{f.units}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Purchase NAV
                      </p>
                      <p className="font-mono font-medium">
                        {format(f.purchaseNav)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current NAV
                      </p>
                      <p className="font-mono font-medium">{format(f.nav)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Invested
                      </p>
                      <p className="font-mono font-medium">
                        {format(f.investedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current Value
                      </p>
                      <p className="font-mono font-medium">
                        {format(f.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        P&L
                      </p>
                      <p className={`font-mono font-medium ${d.color}`}>
                        {d.text}
                      </p>
                    </div>
                    {f.purchaseDate && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Purchase Date
                        </p>
                        <p>{f.purchaseDate}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDetailItem(null);
                        openEditMf(f);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleDelete("mutual-funds", f.id);
                        setDetailItem(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })()}
          {detailItem?.type === "gold" &&
            (() => {
              const g = detailItem.data as GoldHolding;
              const invested = g.quantityGrams * g.purchasePricePerGram;
              const current = g.quantityGrams * g.currentPricePerGram;
              const pnl = current - invested;
              const d = pnlInfo(pnl, invested);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="capitalize">
                      {g.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{g.purity}k purity</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Quantity
                      </p>
                      <p className="font-mono font-medium">
                        {g.quantityGrams}g
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Buy ₹/g
                      </p>
                      <p className="font-mono font-medium">
                        {format(g.purchasePricePerGram)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current ₹/g
                      </p>
                      <p className="font-mono font-medium">
                        {format(g.currentPricePerGram)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Invested
                      </p>
                      <p className="font-mono font-medium">
                        {format(invested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current Value
                      </p>
                      <p className="font-mono font-medium">{format(current)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        P&L
                      </p>
                      <p className={`font-mono font-medium ${d.color}`}>
                        {d.text}
                      </p>
                    </div>
                    {g.purchaseDate && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Purchase Date
                        </p>
                        <p>{g.purchaseDate}</p>
                      </div>
                    )}
                    {g.notes && (
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Notes
                        </p>
                        <p>{g.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDetailItem(null);
                        openEditGold(g);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleDelete("gold", g.id);
                        setDetailItem(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })()}
          {detailItem?.type === "silver" &&
            (() => {
              const g = detailItem.data as SilverHolding;
              const invested = g.quantityGrams * g.purchasePricePerGram;
              const current = g.quantityGrams * g.currentPricePerGram;
              const pnl = current - invested;
              const d = pnlInfo(pnl, invested);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="capitalize">
                      {g.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{g.purity} fine</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Quantity
                      </p>
                      <p className="font-mono font-medium">
                        {g.quantityGrams}g
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Buy ₹/g
                      </p>
                      <p className="font-mono font-medium">
                        {format(g.purchasePricePerGram)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current ₹/g
                      </p>
                      <p className="font-mono font-medium">
                        {format(g.currentPricePerGram)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Invested
                      </p>
                      <p className="font-mono font-medium">
                        {format(invested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current Value
                      </p>
                      <p className="font-mono font-medium">{format(current)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        P&L
                      </p>
                      <p className={`font-mono font-medium ${d.color}`}>
                        {d.text}
                      </p>
                    </div>
                    {g.purchaseDate && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Purchase Date
                        </p>
                        <p>{g.purchaseDate}</p>
                      </div>
                    )}
                    {g.notes && (
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Notes
                        </p>
                        <p>{g.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDetailItem(null);
                        openEditSilver(g);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleDelete("silver", g.id);
                        setDetailItem(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(v) => {
          setImportDialogOpen(v);
          if (!v) setImportStep("upload");
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Import {importType === "stocks" ? "Stocks" : "Mutual Funds"} from
              CSV
            </DialogTitle>
          </DialogHeader>

          {importStep === "upload" && (
            <div className="space-y-4 pt-2">
              {/* Expected columns info */}
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
                <p className="font-medium">Expected CSV columns:</p>
                {importType === "stocks" ? (
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-mono text-foreground">name</span> —
                      Stock name *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">symbol</span>{" "}
                      — Ticker (e.g. RELIANCE)
                    </span>
                    <span>
                      <span className="font-mono text-foreground">shares</span>{" "}
                      — Number of shares *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        avg_purchase_price
                      </span>{" "}
                      — Avg buy price *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        current_price
                      </span>{" "}
                      — Current price *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        purchase_date
                      </span>{" "}
                      — YYYY-MM-DD
                    </span>
                    <span>
                      <span className="font-mono text-foreground">sector</span>{" "}
                      — e.g. information_technology
                    </span>
                    <span>
                      <span className="font-mono text-foreground">type</span> —
                      large_cap / mid_cap / small_cap / etf
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-mono text-foreground">name</span> —
                      Fund name *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">symbol</span>{" "}
                      — ISIN or scheme code
                    </span>
                    <span>
                      <span className="font-mono text-foreground">units</span> —
                      Number of units *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        purchase_nav
                      </span>{" "}
                      — NAV at purchase *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">nav</span> —
                      Current NAV *
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        category
                      </span>{" "}
                      — equity / debt / hybrid
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        sub_category
                      </span>{" "}
                      — flexi_cap / elss etc.
                    </span>
                    <span>
                      <span className="font-mono text-foreground">
                        purchase_date
                      </span>{" "}
                      — YYYY-MM-DD
                    </span>
                  </div>
                )}
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => importFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImportFile(file);
                }}
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">
                  Click or drag a CSV file here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .csv files exported from any broker
                </p>
              </div>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </div>
          )}

          {importStep === "preview" && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {importRows.length} row{importRows.length !== 1 ? "s" : ""}{" "}
                  detected
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportStep("upload")}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Change file
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {importHeaders.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        {importHeaders.map((h) => (
                          <td
                            key={h}
                            className="px-3 py-2 text-foreground whitespace-nowrap max-w-[150px] truncate"
                          >
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2 border-t">
                    + {importRows.length - 10} more rows
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-destructive cursor-pointer"
                    checked={replaceOnImport}
                    onChange={(e) => setReplaceOnImport(e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    Replace existing{" "}
                    {importType === "stocks" ? "stocks" : "funds"}
                    {replaceOnImport && (
                      <span className="ml-1 text-destructive font-medium">
                        (
                        {importType === "stocks"
                          ? stocks.length
                          : mutualFunds.length}{" "}
                        will be deleted)
                      </span>
                    )}
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportConfirm}
                    disabled={importSaving}
                    variant={replaceOnImport ? "destructive" : "default"}
                  >
                    {importSaving
                      ? "Importing..."
                      : replaceOnImport
                        ? `Replace & Import ${importRows.length} rows`
                        : `Import ${importRows.length} rows`}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {importStep === "done" && (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-foreground text-lg">
                Import Complete
              </p>
              <p className="text-sm text-muted-foreground">
                Your {importType === "stocks" ? "stocks" : "mutual funds"} have
                been imported.
              </p>
              <Button onClick={() => setImportDialogOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────

function TabHeader({
  count,
  label,
  onAdd,
  addLabel = "Add Stock",
  onImport,
}: {
  count: number;
  label: string;
  onAdd: () => void;
  addLabel?: string;
  onImport?: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-sm text-muted-foreground">
        {count} {count === 1 ? label : `${label}s`}
      </p>
      <div className="flex gap-2">
        {onImport && (
          <Button size="sm" variant="outline" onClick={onImport}>
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Button>
        )}
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  label,
  onAdd,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onAdd: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">{label}</p>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardContent>
    </Card>
  );
}

function HoldingRow({
  badge,
  name,
  subtitle,
  invested,
  current,
  pnl,
  pnlColor,
  onEdit,
  onDelete,
}: {
  badge: { label: string; className: string };
  name: string;
  subtitle: string;
  invested: string;
  current: string;
  pnl: string;
  pnlColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
              >
                {badge.label}
              </span>
              <span className="font-semibold text-foreground truncate">
                {name}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
              <Metric label="Invested" value={invested} />
              <Metric label="Current" value={current} />
              {pnl && <Metric label="P&L" value={pnl} valueClass={pnlColor} />}
            </div>
          </div>
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-0.5 shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
        <Edit2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Form components ───────────────────────────────────────────────────────

function StockForm({
  form,
  onChange,
}: {
  form: typeof defaultStockForm;
  onChange: (f: typeof defaultStockForm) => void;
}) {
  const s = (k: keyof typeof defaultStockForm, v: string) =>
    onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Stock Name *</Label>
        <Input
          placeholder="e.g. Reliance Industries"
          value={form.name}
          onChange={(e) => s("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Ticker Symbol</Label>
        <Input
          placeholder="e.g. RELIANCE"
          value={form.symbol}
          onChange={(e) => s("symbol", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Stock Type</Label>
        <Select value={form.stockType} onValueChange={(v) => s("stockType", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              ["large_cap", "Large Cap"],
              ["mid_cap", "Mid Cap"],
              ["small_cap", "Small Cap"],
              ["etf", "ETF"],
              ["other", "Other"],
            ].map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Number of Shares *</Label>
        <Input
          type="number"
          placeholder="0"
          value={form.shares}
          onChange={(e) => s("shares", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Avg Purchase Price *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.avgPurchasePrice}
          onChange={(e) => s("avgPurchasePrice", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Current Market Price *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.currentPrice}
          onChange={(e) => s("currentPrice", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => s("purchaseDate", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Sector</Label>
        <Select value={form.sector} onValueChange={(v) => s("sector", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              ["information_technology", "Information Technology"],
              ["financial_services", "Financial Services"],
              ["healthcare", "Healthcare & Pharma"],
              ["fmcg", "FMCG & Consumer Goods"],
              ["energy", "Energy & Oil/Gas"],
              ["automobiles", "Automobiles"],
              ["metals_mining", "Metals & Mining"],
              ["telecom", "Telecom"],
              ["real_estate", "Real Estate"],
              ["infrastructure", "Infrastructure"],
              ["power", "Power & Utilities"],
              ["chemicals", "Chemicals"],
              ["consumer_durables", "Consumer Durables"],
              ["media", "Media & Entertainment"],
              ["other", "Other"],
            ].map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>
          Sub-sector{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          placeholder="e.g. Software, Banking, EV"
          value={form.subSector}
          onChange={(e) => s("subSector", e.target.value)}
        />
      </div>
    </div>
  );
}

function MfForm({
  form,
  onChange,
}: {
  form: typeof defaultMfForm;
  onChange: (f: typeof defaultMfForm) => void;
}) {
  const s = (k: keyof typeof defaultMfForm, v: string) =>
    onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Fund Name *</Label>
        <Input
          placeholder="e.g. HDFC Mid Cap Opportunities"
          value={form.name}
          onChange={(e) => s("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Symbol / ISIN</Label>
        <Input
          placeholder="e.g. HDFCMIDCAP"
          value={form.symbol}
          onChange={(e) => s("symbol", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => s("category", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "equity",
              "debt",
              "hybrid",
              "index",
              "international",
              "other",
            ].map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Units *</Label>
        <Input
          type="number"
          placeholder="0.000"
          value={form.units}
          onChange={(e) => s("units", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase NAV *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.purchaseNav}
          onChange={(e) => s("purchaseNav", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Current NAV *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.nav}
          onChange={(e) => s("nav", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => s("purchaseDate", e.target.value)}
        />
      </div>
    </div>
  );
}

function GoldForm({
  form,
  onChange,
}: {
  form: typeof defaultGoldForm;
  onChange: (f: typeof defaultGoldForm) => void;
}) {
  const s = (k: keyof typeof defaultGoldForm, v: string) =>
    onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Name *</Label>
        <Input
          placeholder="e.g. Sovereign Gold Bond 2025"
          value={form.name}
          onChange={(e) => s("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => s("type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="etf">ETF</SelectItem>
            <SelectItem value="sov">Sovereign Gold Bond</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Purity (Karat)</Label>
        <Select value={form.purity} onValueChange={(v) => s("purity", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">24k (99.9%)</SelectItem>
            <SelectItem value="22">22k (91.6%)</SelectItem>
            <SelectItem value="18">18k (75%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Quantity (grams) *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.quantityGrams}
          onChange={(e) => s("quantityGrams", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Price / gram *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.purchasePricePerGram}
          onChange={(e) => s("purchasePricePerGram", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Current Price / gram *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.currentPricePerGram}
          onChange={(e) => s("currentPricePerGram", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => s("purchaseDate", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input
          placeholder="Optional"
          value={form.notes}
          onChange={(e) => s("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function SilverForm({
  form,
  onChange,
}: {
  form: typeof defaultSilverForm;
  onChange: (f: typeof defaultSilverForm) => void;
}) {
  const s = (k: keyof typeof defaultSilverForm, v: string) =>
    onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Name *</Label>
        <Input
          placeholder="e.g. Silver Coins 100g"
          value={form.name}
          onChange={(e) => s("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => s("type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="etf">ETF</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Purity</Label>
        <Select value={form.purity} onValueChange={(v) => s("purity", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="999">999 Fine (99.9%)</SelectItem>
            <SelectItem value="925">925 Sterling (92.5%)</SelectItem>
            <SelectItem value="800">800 (80%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Quantity (grams) *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.quantityGrams}
          onChange={(e) => s("quantityGrams", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Price / gram *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.purchasePricePerGram}
          onChange={(e) => s("purchasePricePerGram", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Current Price / gram *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.currentPricePerGram}
          onChange={(e) => s("currentPricePerGram", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => s("purchaseDate", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input
          placeholder="Optional"
          value={form.notes}
          onChange={(e) => s("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function ForexForm({
  form,
  onChange,
}: {
  form: typeof defaultForexForm;
  onChange: (f: typeof defaultForexForm) => void;
}) {
  const s = (k: keyof typeof defaultForexForm, v: string) =>
    onChange({ ...form, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5">
        <Label>Entry Type *</Label>
        <Select value={form.type} onValueChange={(v) => s("type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="pnl">P&L</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Month *</Label>
        <Input
          type="month"
          value={form.month}
          onChange={(e) => s("month", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Amount *</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => s("amount", e.target.value)}
        />
      </div>
      {form.type === "withdrawal" && (
        <div className="space-y-1.5">
          <Label>Handler Share %</Label>
          <Input
            type="number"
            placeholder="0"
            value={form.handler_share_percentage}
            onChange={(e) => s("handler_share_percentage", e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notes</Label>
        <Input
          placeholder="Optional"
          value={form.notes}
          onChange={(e) => s("notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function calcPremiumsPaid(
  premiumAmount: number,
  frequency: string,
  startDate: string,
): number {
  const start = new Date(startDate);
  const now = new Date();
  if (isNaN(start.getTime()) || start > now) return 0;
  const periodsPerYear =
    frequency === "monthly"
      ? 12
      : frequency === "quarterly"
        ? 4
        : frequency === "semi-annual"
          ? 2
          : 1;
  const years =
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years * periodsPerYear) * premiumAmount;
}

// Compound interest: P × (1 + r/(n×100))^(n×t)
function calcFdValue(
  principal: number,
  annualRate: number,
  frequency: string,
  startDate: string,
  toDate?: string,
): number {
  const start = new Date(startDate);
  const end = toDate ? new Date(toDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end)
    return principal;
  const n =
    frequency === "monthly"
      ? 12
      : frequency === "quarterly"
        ? 4
        : frequency === "semi-annual"
          ? 2
          : 1; // annual
  const t = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return principal * Math.pow(1 + annualRate / (n * 100), n * t);
}

// RD maturity formula: n = months, r = annual rate
function calcRdMaturity(
  monthlyInstallment: number,
  annualRate: number,
  months: number,
): number {
  if (months <= 0) return 0;
  const r = annualRate / (12 * 100);
  return monthlyInstallment * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

const INVESTMENT_TYPES = [
  ["fd", "FD (Fixed Deposit)"],
  ["rd", "RD (Recurring Deposit)"],
  ["ppf", "PPF (Public Provident Fund)"],
  ["epf", "EPF / PF (Employee Provident Fund)"],
  ["nps", "NPS (National Pension System)"],
  ["postal", "Postal Savings (NSC / KVP / MIS)"],
  ["lic", "LIC / Life Insurance"],
  ["other", "Other"],
] as const;

function OtherForm({
  form,
  onChange,
}: {
  form: typeof defaultOtherForm;
  onChange: (f: typeof defaultOtherForm) => void;
}) {
  const s = (k: keyof typeof defaultOtherForm, v: string) =>
    onChange({ ...form, [k]: v });

  const isFD = form.type === "fd";
  const isRD = form.type === "rd";
  const isPremiumBased = !isFD && !isRD && !!form.premiumAmount;

  // FD auto-calculations
  const fdPrincipal = parseFloat(form.investedAmount) || 0;
  const fdRate = parseFloat(form.interestRate) || 0;
  const fdFreq = form.premiumFrequency || "quarterly";
  const autoFdCurrentValue =
    isFD && fdPrincipal && fdRate && form.startDate
      ? calcFdValue(fdPrincipal, fdRate, fdFreq, form.startDate)
      : 0;
  const autoFdMaturity =
    isFD && fdPrincipal && fdRate && form.startDate && form.maturityDate
      ? calcFdValue(
          fdPrincipal,
          fdRate,
          fdFreq,
          form.startDate,
          form.maturityDate,
        )
      : 0;

  // RD auto-calculations
  const rdInstallment = parseFloat(form.premiumAmount) || 0;
  const rdRate = parseFloat(form.interestRate) || 0;
  const rdMonths =
    isRD && form.startDate
      ? Math.max(
          0,
          Math.floor(
            (new Date().getTime() - new Date(form.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30.44),
          ),
        )
      : 0;
  const autoRdInvested = isRD ? rdInstallment * rdMonths : 0;
  const rdTotalMonths =
    isRD && form.startDate && form.maturityDate
      ? Math.max(
          0,
          Math.round(
            (new Date(form.maturityDate).getTime() -
              new Date(form.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30.44),
          ),
        )
      : 0;
  const autoRdMaturity =
    isRD && rdInstallment && rdRate && rdTotalMonths
      ? calcRdMaturity(rdInstallment, rdRate, rdTotalMonths)
      : 0;

  // Premium-based auto-calc (LIC / Postal)
  const autoPremiumsPaid =
    isPremiumBased && form.startDate
      ? calcPremiumsPaid(
          parseFloat(form.premiumAmount) || 0,
          form.premiumFrequency,
          form.startDate,
        )
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Investment Name *</Label>
        <Input
          placeholder="e.g. SBI FD, Post Office RD"
          value={form.name}
          onChange={(e) => s("name", e.target.value)}
        />
      </div>
      <div className="space-y-1.5 min-w-0 sm:col-span-2">
        <Label>Type *</Label>
        <Select value={form.type} onValueChange={(v) => s("type", v)}>
          <SelectTrigger className="w-full truncate">
            <SelectValue className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {INVESTMENT_TYPES.map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── FD fields ── */}
      {isFD && (
        <>
          <div className="space-y-1.5">
            <Label>Principal Amount *</Label>
            <Input
              type="number"
              placeholder="e.g. 100000"
              value={form.investedAmount}
              onChange={(e) => s("investedAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Interest Rate (% per annum) *</Label>
            <Input
              type="number"
              placeholder="e.g. 7.5"
              value={form.interestRate}
              onChange={(e) => s("interestRate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Interest Compounding</Label>
            <Select
              value={form.premiumFrequency || "quarterly"}
              onValueChange={(v) => s("premiumFrequency", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Current Value{" "}
              {autoFdCurrentValue > 0 && (
                <span className="text-muted-foreground text-xs">
                  (auto: ₹
                  {Math.round(autoFdCurrentValue).toLocaleString("en-IN")})
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder={
                autoFdCurrentValue > 0
                  ? String(Math.round(autoFdCurrentValue))
                  : "0.00"
              }
              value={form.currentValue}
              onChange={(e) => s("currentValue", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => s("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Maturity Date{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="date"
              value={form.maturityDate}
              onChange={(e) => s("maturityDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Maturity Amount{" "}
              {autoFdMaturity > 0 && (
                <span className="text-muted-foreground text-xs">
                  (auto: ₹{Math.round(autoFdMaturity).toLocaleString("en-IN")})
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder={
                autoFdMaturity > 0
                  ? String(Math.round(autoFdMaturity))
                  : "e.g. 115000"
              }
              value={form.sumAssured}
              onChange={(e) => s("sumAssured", e.target.value)}
            />
          </div>
        </>
      )}

      {/* ── RD fields ── */}
      {isRD && (
        <>
          <div className="space-y-1.5">
            <Label>Monthly Installment *</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={form.premiumAmount}
              onChange={(e) => s("premiumAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Interest Rate (% per annum) *</Label>
            <Input
              type="number"
              placeholder="e.g. 6.8"
              value={form.interestRate}
              onChange={(e) => s("interestRate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => s("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Maturity Date{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="date"
              value={form.maturityDate}
              onChange={(e) => s("maturityDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Total Invested{" "}
              {autoRdInvested > 0 && (
                <span className="text-muted-foreground text-xs">
                  (auto: ₹{autoRdInvested.toLocaleString("en-IN")} · {rdMonths}{" "}
                  instalments)
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder={autoRdInvested > 0 ? String(autoRdInvested) : "0.00"}
              value={form.investedAmount}
              onChange={(e) => s("investedAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Maturity Amount{" "}
              {autoRdMaturity > 0 && (
                <span className="text-muted-foreground text-xs">
                  (auto: ₹{Math.round(autoRdMaturity).toLocaleString("en-IN")})
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder={
                autoRdMaturity > 0
                  ? String(Math.round(autoRdMaturity))
                  : "e.g. 65000"
              }
              value={form.sumAssured}
              onChange={(e) => s("sumAssured", e.target.value)}
            />
          </div>
        </>
      )}

      {/* ── Generic / PPF / EPF / LIC / Postal fields ── */}
      {!isFD && !isRD && (
        <>
          <div className="space-y-1.5">
            <Label>Interest / Return Rate (%)</Label>
            <Input
              type="number"
              placeholder="e.g. 7.1"
              value={form.interestRate}
              onChange={(e) => s("interestRate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Premium Amount{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="number"
              placeholder="e.g. 1580"
              value={form.premiumAmount}
              onChange={(e) => s("premiumAmount", e.target.value)}
            />
          </div>
          {form.premiumAmount && (
            <div className="space-y-1.5">
              <Label>Premium Frequency</Label>
              <Select
                value={form.premiumFrequency}
                onValueChange={(v) => s("premiumFrequency", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => s("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Maturity Date{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="date"
              value={form.maturityDate}
              onChange={(e) => s("maturityDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              {isPremiumBased ? "Total Invested" : "Amount Invested"}{" "}
              {isPremiumBased && (
                <span className="text-muted-foreground text-xs">
                  (auto: ₹{autoPremiumsPaid.toLocaleString("en-IN")})
                </span>
              )}
              {!isPremiumBased && <span className="text-foreground">*</span>}
            </Label>
            <Input
              type="number"
              placeholder={isPremiumBased ? String(autoPremiumsPaid) : "0.00"}
              value={form.investedAmount}
              onChange={(e) => s("investedAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Current Value{" "}
              <span className="text-muted-foreground text-xs">
                (defaults to invested)
              </span>
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.currentValue}
              onChange={(e) => s("currentValue", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Sum Assured / Maturity Amount{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              type="number"
              placeholder="e.g. 400000"
              value={form.sumAssured}
              onChange={(e) => s("sumAssured", e.target.value)}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Notes</Label>
        <Input
          placeholder="Optional"
          value={form.notes}
          onChange={(e) => s("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
