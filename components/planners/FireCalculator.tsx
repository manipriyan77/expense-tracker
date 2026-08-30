"use client";

import { useMemo, useState } from "react";
import {
  Flame,
  Gauge,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  Leaf,
  Sofa,
} from "lucide-react";
import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SliderInput, StatTile } from "@/components/planners/SipSwpPlanner";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return fmt(n);
};

const fmtYears = (months: number | null) => {
  if (months === null) return "50+ yrs";
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  if (y <= 0) return `${m} mo`;
  return m > 0 ? `${y} yr ${m} mo` : `${y} yr`;
};

// ─── calc ─────────────────────────────────────────────────────────────────────

interface FireYearRow {
  year: number;
  corpus: number;
  invested: number;
  leanTarget: number; // that year's inflation-adjusted target, not today's ₹
  regularTarget: number;
  fatTarget: number;
  leanPct: number;
  regularPct: number;
  fatPct: number;
}

/**
 * Targets aren't fixed — the cost of living rises with inflation every year,
 * so each tier's ₹ target is re-inflated year over year (a "moving target"),
 * the same way the corpus itself grows.
 */
function buildFireProjection(
  startingCorpus: number,
  monthlySIP: number,
  returnPct: number,
  stepUpPct: number,
  inflationPct: number,
  years: number,
  leanBase: number,
  regularBase: number,
  fatBase: number,
): FireYearRow[] {
  const rows: FireYearRow[] = [];
  const r = returnPct / 12 / 100;
  let corpus = startingCorpus;
  let invested = startingCorpus;
  let sip = monthlySIP;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + sip) * (1 + r);
      invested += sip;
    }
    const infl = Math.pow(1 + inflationPct / 100, y);
    const leanTarget = leanBase * infl;
    const regularTarget = regularBase * infl;
    const fatTarget = fatBase * infl;
    rows.push({
      year: y,
      corpus: Math.round(corpus),
      invested: Math.round(invested),
      leanTarget: Math.round(leanTarget),
      regularTarget: Math.round(regularTarget),
      fatTarget: Math.round(fatTarget),
      leanPct: leanTarget > 0 ? Math.min(150, (corpus / leanTarget) * 100) : 0,
      regularPct:
        regularTarget > 0 ? Math.min(150, (corpus / regularTarget) * 100) : 0,
      fatPct: fatTarget > 0 ? Math.min(150, (corpus / fatTarget) * 100) : 0,
    });
    sip *= 1 + stepUpPct / 100;
  }
  return rows;
}

/**
 * First month (1-indexed) the corpus reaches `baseTarget`, or null within
 * `maxMonths`. The target itself inflates every month it isn't reached yet —
 * e.g. a ₹1.5L/mo budget needs a bigger corpus 12 years from now than it
 * would today, because ₹1.5L won't buy the same lifestyle by then.
 */
function monthsToReach(
  startingCorpus: number,
  monthlySIP: number,
  returnPct: number,
  stepUpPct: number,
  inflationPct: number,
  baseTarget: number,
  maxMonths = 600,
): number | null {
  if (baseTarget <= 0) return 0;
  if (startingCorpus >= baseTarget) return 0;
  const r = returnPct / 12 / 100;
  const rInfl = Math.pow(1 + inflationPct / 100, 1 / 12) - 1;
  let corpus = startingCorpus;
  let sip = monthlySIP;
  let target = baseTarget;
  for (let m = 1; m <= maxMonths; m++) {
    corpus = (corpus + sip) * (1 + r);
    target *= 1 + rInfl;
    if (corpus >= target) return m;
    if (m % 12 === 0) sip *= 1 + stepUpPct / 100;
  }
  return null;
}

/** What a today's-₹ amount will actually cost after `years` of inflation. */
const inflateAmount = (amount: number, inflationPct: number, years: number) =>
  amount * Math.pow(1 + inflationPct / 100, years);

// ─── FIRE Calculator ────────────────────────────────────────────────────────

export function FireCalculator() {
  const [monthlyBudget, setMonthlyBudget] = useState(50000);
  const [leanPct, setLeanPct] = useState(70);
  const [fatPct, setFatPct] = useState(150);
  const [swrPct, setSwrPct] = useState(4);
  const [currentInvestments, setCurrentInvestments] = useState(500000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(20000);
  const [returnPct, setReturnPct] = useState(12);
  const [inflationPct, setInflationPct] = useState(6);
  const [stepUp, setStepUp] = useState(false);
  const [stepUpPct, setStepUpPct] = useState(10);
  const [currentAge, setCurrentAge] = useState(30);
  const [coastTargetAge, setCoastTargetAge] = useState(45);
  const [showTable, setShowTable] = useState(false);
  const [showCoast, setShowCoast] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const multiplier = swrPct > 0 ? 100 / swrPct : 0;
  const annualBudget = monthlyBudget * 12;

  const leanTarget = annualBudget * (leanPct / 100) * multiplier;
  const regularTarget = annualBudget * multiplier;
  const fatTarget = annualBudget * (fatPct / 100) * multiplier;

  // Coast FIRE — the amount needed today, left untouched, to reach the
  // Regular FIRE number purely through growth by `coastTargetAge`. The
  // target itself inflates over those years too, so this discounts by the
  // *real* return (return minus inflation), not the raw nominal return.
  const coastYears = Math.max(0, coastTargetAge - currentAge);
  const coastFireNumber =
    regularTarget *
    Math.pow(
      (1 + inflationPct / 100) / (1 + returnPct / 100),
      coastYears,
    );
  const coastGap = coastFireNumber - currentInvestments;
  const coastAchieved = coastGap <= 0;

  const monthsToLean = useMemo(
    () =>
      monthsToReach(
        currentInvestments,
        monthlyInvestment,
        returnPct,
        stepUp ? stepUpPct : 0,
        inflationPct,
        leanTarget,
      ),
    [
      currentInvestments,
      monthlyInvestment,
      returnPct,
      stepUp,
      stepUpPct,
      inflationPct,
      leanTarget,
    ],
  );
  const monthsToRegular = useMemo(
    () =>
      monthsToReach(
        currentInvestments,
        monthlyInvestment,
        returnPct,
        stepUp ? stepUpPct : 0,
        inflationPct,
        regularTarget,
      ),
    [
      currentInvestments,
      monthlyInvestment,
      returnPct,
      stepUp,
      stepUpPct,
      inflationPct,
      regularTarget,
    ],
  );
  const monthsToFat = useMemo(
    () =>
      monthsToReach(
        currentInvestments,
        monthlyInvestment,
        returnPct,
        stepUp ? stepUpPct : 0,
        inflationPct,
        fatTarget,
      ),
    [
      currentInvestments,
      monthlyInvestment,
      returnPct,
      stepUp,
      stepUpPct,
      inflationPct,
      fatTarget,
    ],
  );

  // The ₹ actually needed by the time each tier is reached, once inflation
  // has done its work — this is the number that matters, not today's ₹.
  const leanTargetAtCrossover =
    monthsToLean === null
      ? null
      : inflateAmount(leanTarget, inflationPct, monthsToLean / 12);
  const regularTargetAtCrossover =
    monthsToRegular === null
      ? null
      : inflateAmount(regularTarget, inflationPct, monthsToRegular / 12);
  const fatTargetAtCrossover =
    monthsToFat === null
      ? null
      : inflateAmount(fatTarget, inflationPct, monthsToFat / 12);

  // Chart/table horizon — extend a little past whichever tier takes longest.
  const horizonYears = Math.min(
    60,
    Math.max(
      10,
      Math.ceil((monthsToFat ?? 600) / 12) + 2,
    ),
  );

  const rows = useMemo(
    () =>
      buildFireProjection(
        currentInvestments,
        monthlyInvestment,
        returnPct,
        stepUp ? stepUpPct : 0,
        inflationPct,
        horizonYears,
        leanTarget,
        regularTarget,
        fatTarget,
      ),
    [
      currentInvestments,
      monthlyInvestment,
      returnPct,
      stepUp,
      stepUpPct,
      inflationPct,
      horizonYears,
      leanTarget,
      regularTarget,
      fatTarget,
    ],
  );

  // A concrete illustration: what today's monthly budget will actually cost
  // at a handful of future horizons, so "₹1.5L now ≠ ₹1.5L in 12 years" is
  // visible at a glance.
  const inflationLadderYears = Array.from(
    new Set([5, 10, 15, 20, 25, 30, Math.round(coastYears)]),
  )
    .filter((y) => y > 0 && y <= 40)
    .sort((a, b) => a - b);

  const TOOLTIP_STYLE = {
    backgroundColor: "var(--background, #fff)",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  const tiers = [
    {
      key: "lean",
      label: "Lean FIRE",
      sub: `Bare-bones · ${leanPct}% of budget`,
      target: leanTarget,
      targetAtCrossover: leanTargetAtCrossover,
      months: monthsToLean,
      color: "#22c55e",
      bg: "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/40",
    },
    {
      key: "regular",
      label: "FIRE",
      sub: "Your lifestyle today",
      target: regularTarget,
      targetAtCrossover: regularTargetAtCrossover,
      months: monthsToRegular,
      color: "#8b5cf6",
      bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40",
    },
    {
      key: "fat",
      label: "Fat FIRE",
      sub: `Upgraded life · ${fatPct}% of budget`,
      target: fatTarget,
      targetAtCrossover: fatTargetAtCrossover,
      months: monthsToFat,
      color: "#f59e0b",
      bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40",
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">FIRE</span>{" "}
          (Financial Independence, Retire Early) means saving up a big enough
          nest egg that you could live off it forever, without a job. Just
          enter your monthly budget below — everything else is filled in with
          sensible defaults you can tweak later.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-green-500" />
            <b className="text-foreground">Lean FIRE</b> — bare-bones, cut-back living
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-violet-500" />
            <b className="text-foreground">FIRE</b> — your lifestyle today
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sofa className="h-3.5 w-3.5 text-amber-500" />
            <b className="text-foreground">Fat FIRE</b> — a more comfortable, upgraded life
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* Input panel */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b bg-muted/30">
            <p className="font-semibold text-sm">Your Numbers</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Just 3 numbers to start — adjust sliders or type values directly
            </p>
          </div>
          <div className="p-5 space-y-6">
            <SliderInput
              label="Monthly Budget"
              value={monthlyBudget}
              onChange={setMonthlyBudget}
              min={5000}
              max={1000000}
              step={1000}
              prefix="₹"
              format={(v) => fmtShort(v).replace("₹", "")}
              accentColor="#8b5cf6"
              info="What you spend each month to live comfortably today — this is the baseline your FIRE numbers are built from"
            />
            <SliderInput
              label="Current Investments"
              value={currentInvestments}
              onChange={setCurrentInvestments}
              min={0}
              max={100000000}
              step={10000}
              prefix="₹"
              format={(v) => fmtShort(v).replace("₹", "")}
              accentColor="#3b82f6"
              info="Savings and investments you already have, put toward retirement"
            />
            <SliderInput
              label="Monthly Investment"
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              min={0}
              max={500000}
              step={500}
              prefix="₹"
              format={(v) => fmtShort(v).replace("₹", "")}
              accentColor="#3b82f6"
              info="How much you invest every month, on top of what you already have"
            />

            {/* Advanced — collapsed by default, sensible defaults already applied */}
            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="w-full flex items-center justify-between group"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <SlidersHorizontal className="h-4 w-4 text-violet-500" />
                  Advanced settings
                </span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                Optional — fine-tune the assumptions behind your numbers
              </p>

              {showAdvanced && (
                <div className="mt-5 space-y-5">
                  <SliderInput
                    label="Expected Return"
                    value={returnPct}
                    onChange={setReturnPct}
                    min={1}
                    max={20}
                    step={0.5}
                    suffix="% p.a."
                    accentColor="#06b6d4"
                    info="The average yearly growth you expect on your investments"
                  />
                  <SliderInput
                    label="Withdrawal Rate"
                    value={swrPct}
                    onChange={setSwrPct}
                    min={2}
                    max={6}
                    step={0.25}
                    suffix="% /yr"
                    accentColor="#06b6d4"
                    info={`Roughly how much of your savings you'll spend each year once retired. Lower = safer, but needs a bigger nest egg. ${swrPct}% here means you need about ${multiplier.toFixed(0)}× your yearly spending saved up`}
                  />
                  <SliderInput
                    label="Lean FIRE Spend"
                    value={leanPct}
                    onChange={setLeanPct}
                    min={40}
                    max={100}
                    step={5}
                    suffix="% of budget"
                    accentColor="#22c55e"
                    info="If you cut back, what % of your current budget would you need? Lower = smaller Lean FIRE number"
                  />
                  <SliderInput
                    label="Fat FIRE Spend"
                    value={fatPct}
                    onChange={setFatPct}
                    min={100}
                    max={300}
                    step={10}
                    suffix="% of budget"
                    accentColor="#f59e0b"
                    info="For a more comfortable retirement, what % of your current budget would you want? Higher = bigger Fat FIRE number"
                  />
                  <SliderInput
                    label="Current Age"
                    value={currentAge}
                    onChange={setCurrentAge}
                    min={16}
                    max={70}
                    suffix=" yr"
                    accentColor="#94a3b8"
                    info="Used to show the age you'd reach each FIRE number"
                  />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Annual Step-Up</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Increase your monthly investment every year
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={stepUp}
                        onChange={(e) => setStepUp(e.target.checked)}
                        className="h-4 w-4 accent-violet-600"
                      />
                    </div>
                    {stepUp && (
                      <SliderInput
                        label="Step-Up Rate"
                        value={stepUpPct}
                        onChange={setStepUpPct}
                        min={1}
                        max={30}
                        suffix="% /yr"
                        accentColor="#f59e0b"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Hero: FIRE range */}
          <div className="rounded-2xl border bg-linear-to-br from-orange-500 via-amber-500 to-rose-500 text-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5" />
              <div>
                <p className="text-sm text-white/80 font-medium">
                  Your FIRE Range
                </p>
                <p className="text-xs text-white/70">
                  Based on {fmt(monthlyBudget)}/mo at a {swrPct}% withdrawal
                  rate ({multiplier.toFixed(0)}×)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {tiers.map((t) => (
                <div
                  key={t.key}
                  className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-3 text-center"
                >
                  <p className="text-[10px] text-white/70 uppercase tracking-wider">
                    {t.label}
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {fmtShort(t.target)}
                  </p>
                  <p className="text-[10px] text-white/70 mt-1">
                    in {fmtYears(t.months)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tier detail cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tiers.map((t) => (
              <div key={t.key} className={`rounded-2xl border p-4 ${t.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: t.color }}>
                    {t.label}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {t.sub}
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: t.color }}>
                  {fmtShort(t.target)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmt(t.target / multiplier / 12)}/mo lifestyle
                </p>
                <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden mt-3">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (currentInvestments / t.target) * 100)}%`,
                      background: t.color,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {t.months === 0
                    ? "Already there"
                    : `Reach it in ${fmtYears(t.months)} · age ${
                        t.months === null
                          ? "60+"
                          : Math.round(currentAge + t.months / 12)
                      }`}
                </p>
                {t.months !== null && t.months > 0 && t.targetAtCrossover && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Inflation means you&apos;ll actually need{" "}
                    <span className="font-semibold" style={{ color: t.color }}>
                      {fmtShort(t.targetAtCrossover)}
                    </span>{" "}
                    by then
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Inflation reality check */}
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-rose-500" />
              <p className="text-sm font-semibold">Inflation reality check</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Prices keep rising, so your {fmt(monthlyBudget)}/mo budget today
              won&apos;t buy the same lifestyle later — every target above
              already accounts for this, growing every year until your corpus
              catches up.
            </p>
            <SliderInput
              label="Inflation Rate"
              value={inflationPct}
              onChange={setInflationPct}
              min={0}
              max={15}
              step={0.5}
              suffix="% /yr"
              accentColor="#ef4444"
              info="How fast prices rise each year. India's long-run average is roughly 5-7%"
            />
            {monthsToRegular !== null && monthsToRegular > 0 && (
              <p className="text-xs text-muted-foreground">
                Example: your {fmt(monthlyBudget)}/mo budget will cost about{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {fmt(
                    inflateAmount(
                      monthlyBudget,
                      inflationPct,
                      monthsToRegular / 12,
                    ),
                  )}
                  /mo
                </span>{" "}
                by the time you reach FIRE ({fmtYears(monthsToRegular)} from
                now).
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {inflationLadderYears.map((y) => (
                <div
                  key={y}
                  className="rounded-lg border bg-card px-2 py-2 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">
                    in {y} yr{y > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {fmtShort(inflateAmount(monthlyBudget, inflationPct, y))}
                    /mo
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Coast FIRE */}
          <div className="rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCoast((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-sky-500" />
                  Coast FIRE check
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Could you stop investing today and still reach FIRE just by
                  waiting?
                </span>
              </span>
              {showCoast ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {showCoast && (
              <div className="px-4 pb-4 space-y-4">
                <SliderInput
                  label="Target Retirement Age"
                  value={coastTargetAge}
                  onChange={setCoastTargetAge}
                  min={currentAge + 1}
                  max={75}
                  suffix=" yr"
                  accentColor="#0ea5e9"
                  info="Coast FIRE = the amount you need invested today, left untouched, to hit your Regular FIRE number purely through compounding by this age"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatTile
                    label="Coast FIRE number (today)"
                    value={fmtShort(coastFireNumber)}
                    color="#0ea5e9"
                    bg="bg-card border-sky-100 dark:border-sky-900"
                    sub={`grows to ${fmtShort(inflateAmount(regularTarget, inflationPct, coastYears))} by ${coastTargetAge}`}
                  />
                  <StatTile
                    label="You currently have"
                    value={fmtShort(currentInvestments)}
                    color="#8b5cf6"
                    bg="bg-card border-sky-100 dark:border-sky-900"
                  />
                  <StatTile
                    label={coastAchieved ? "Surplus" : "Still need"}
                    value={fmtShort(Math.abs(coastGap))}
                    color={coastAchieved ? "#22c55e" : "#ef4444"}
                    bg="bg-card border-sky-100 dark:border-sky-900"
                    sub={
                      coastAchieved
                        ? "You could stop investing and still coast to FIRE"
                        : "more, invested today, to coast from here"
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Return scenarios */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="h-4 w-4 text-cyan-500" />
              <p className="text-sm font-semibold">
                How your FIRE number changes with withdrawal rate
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[3, swrPct, 5]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .sort((a, b) => a - b)
                .map((s) => {
                  const mult = 100 / s;
                  const val = annualBudget * mult;
                  const isCurrent = s === swrPct;
                  return (
                    <div
                      key={s}
                      className={`rounded-xl border p-3 text-center ${
                        isCurrent
                          ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40"
                          : "bg-muted/30"
                      }`}
                    >
                      <p className="text-[10px] text-muted-foreground">
                        {s}% SWR ({mult.toFixed(0)}×){isCurrent ? " ← current" : ""}
                      </p>
                      <p
                        className="text-sm font-bold mt-1"
                        style={{ color: isCurrent ? "#8b5cf6" : undefined }}
                      >
                        {fmtShort(val)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-semibold">
              Corpus Growth vs FIRE Targets
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Target lines rise with inflation — they&apos;re not flat
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart
                data={rows}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fireCorpus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="year"
                  tickFormatter={(v) => `Y${v}`}
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  tickFormatter={(v) => fmtShort(v).replace("₹", "").trim()}
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  width={52}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE} // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string | undefined) => [
                    fmtShort(Number(v)),
                    name ?? "",
                  ]}
                  labelFormatter={(l) => `Year ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="corpus"
                  name="Your Corpus"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#fireCorpus)"
                />
                <Line
                  type="monotone"
                  dataKey="leanTarget"
                  name="Lean FIRE (inflated)"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="regularTarget"
                  name="FIRE (inflated)"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fatTarget"
                  name="Fat FIRE (inflated)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-5 mt-3">
              {[
                { color: "#3b82f6", label: "Your Corpus" },
                { color: "#22c55e", label: "Lean FIRE" },
                { color: "#8b5cf6", label: "FIRE" },
                { color: "#f59e0b", label: "Fat FIRE" },
              ].map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div
                    className="w-3 h-0.5 rounded-full"
                    style={{ background: l.color }}
                  />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Year table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 border-b hover:bg-muted/30 transition-colors"
          onClick={() => setShowTable((s) => !s)}
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Year-by-Year Progress</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              % columns compare your corpus to that year&apos;s
              inflation-adjusted target
            </p>
          </div>
          {showTable ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-right">Invested</th>
                  <th className="px-4 py-3 text-right">Corpus</th>
                  <th className="px-4 py-3 text-right text-green-600">
                    Lean FIRE
                  </th>
                  <th className="px-4 py-3 text-right text-violet-600">
                    FIRE
                  </th>
                  <th className="px-4 py-3 text-right text-amber-600">
                    Fat FIRE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.year} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-semibold">Y{r.year}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {fmtShort(r.invested)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">
                      {fmtShort(r.corpus)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-medium">
                      {r.leanPct.toFixed(0)}%
                      {r.leanPct >= 100 && (
                        <Sparkles className="inline h-3 w-3 ml-1 -mt-0.5" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-violet-600 dark:text-violet-400 font-medium">
                      {r.regularPct.toFixed(0)}%
                      {r.regularPct >= 100 && (
                        <Sparkles className="inline h-3 w-3 ml-1 -mt-0.5" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                      {r.fatPct.toFixed(0)}%
                      {r.fatPct >= 100 && (
                        <Sparkles className="inline h-3 w-3 ml-1 -mt-0.5" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
