"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Rocket, Calculator, Shield, Sparkles } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FinancialFreedomPlanner } from "@/components/planners/FinancialFreedomPlanner";
import { SipSwpPlanner } from "@/components/planners/SipSwpPlanner";
import { EmergencyFundPlanner } from "@/components/planners/EmergencyFundPlanner";

type PlannerTab = "fi" | "sip" | "emergency";

const TABS: {
  id: PlannerTab;
  label: string;
  short: string;
  icon: typeof Rocket;
  blurb: string;
  accent: string;
}[] = [
  {
    id: "fi",
    label: "Financial Freedom",
    short: "FI",
    icon: Rocket,
    blurb: "Track the age you can stop working, year by year.",
    accent: "text-emerald-400",
  },
  {
    id: "sip",
    label: "SIP / SWP",
    short: "SIP / SWP",
    icon: Calculator,
    blurb: "Model investing, withdrawing, and goal-based SIPs.",
    accent: "text-indigo-400",
  },
  {
    id: "emergency",
    label: "Emergency Fund",
    short: "Emergency",
    icon: Shield,
    blurb: "Check how many months your reserve would cover.",
    accent: "text-amber-400",
  },
];

function PlannersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("tab") as PlannerTab) || "fi";
  const [tab, setTab] = useState<PlannerTab>(
    TABS.some((t) => t.id === initial) ? initial : "fi",
  );

  const onChange = (value: string) => {
    const next = value as PlannerTab;
    setTab(next);
    router.replace(`/planners?tab=${next}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Dark hero band */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Planners
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive tools to plan your financial future
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                      tab === t.id
                        ? "bg-white text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick-nav teaser cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onChange(t.id)}
                  className={`text-left rounded-lg border px-3.5 py-2.5 transition-colors ${
                    active
                      ? "border-slate-600 bg-slate-800/80"
                      : "border-slate-800 bg-slate-800/30 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${t.accent}`} />
                    <span className="text-xs font-semibold text-white">
                      {t.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {t.blurb}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={onChange}>
        <TabsContent value="fi" className="mt-0">
          <FinancialFreedomPlanner />
        </TabsContent>
        <TabsContent value="sip" className="mt-0">
          <SipSwpPlanner />
        </TabsContent>
        <TabsContent value="emergency" className="mt-0">
          <EmergencyFundPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PlannersPage() {
  return (
    <Suspense fallback={null}>
      <PlannersInner />
    </Suspense>
  );
}
