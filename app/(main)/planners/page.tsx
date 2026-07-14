"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Rocket, Calculator, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialFreedomPlanner } from "@/components/planners/FinancialFreedomPlanner";
import { SipSwpPlanner } from "@/components/planners/SipSwpPlanner";
import { EmergencyFundPlanner } from "@/components/planners/EmergencyFundPlanner";

type PlannerTab = "fi" | "sip" | "emergency";

const TABS: { id: PlannerTab; label: string; short: string; icon: typeof Rocket }[] = [
  { id: "fi", label: "Financial Freedom", short: "FI", icon: Rocket },
  { id: "sip", label: "SIP / SWP", short: "SIP / SWP", icon: Calculator },
  { id: "emergency", label: "Emergency Fund", short: "Emergency", icon: Shield },
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
    <div className="pb-4">
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-xl font-bold text-foreground">Planners</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Interactive tools to plan your financial future.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onChange} className="mt-4">
        <div className="px-4 sm:px-6 lg:px-8">
          <TabsList>
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

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
