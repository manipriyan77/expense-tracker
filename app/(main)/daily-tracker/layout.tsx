"use client";

import { ReactNode } from "react";
import { DailyTrackerProvider, useDailyTracker, Journey } from "./daily-tracker-context";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toISODate } from "./daily-tracker-context";

// ─── Journey Setup ────────────────────────────────────────────────────────────

function JourneySetup({ onCreated }: { onCreated: (j: Journey) => void }) {
  const [name, setName] = useState("Building the life I dream of");
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [totalDays, setTotalDays] = useState(249);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !startDate || !totalDays) return;
    setLoading(true);
    try {
      const res = await fetch("/api/daily-tracker/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start_date: startDate, total_days: totalDays }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onCreated(data);
    } catch {
      toast.error("Failed to create journey");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">✨</div>
            <h1 className="text-2xl font-bold">Start Your Journey</h1>
            <p className="text-muted-foreground text-sm">Define your challenge and begin tracking daily</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Journey Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Building the life I dream of"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Days</Label>
                <Input
                  type="number"
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  min={1}
                />
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Begin Journey"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inner layout (has access to context) ────────────────────────────────────

function DailyTrackerInner({ children }: { children: ReactNode }) {
  const { journey, loading, setJourney } = useDailyTracker();

  if (loading || journey === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (journey === null) {
    return <JourneySetup onCreated={setJourney} />;
  }

  return <>{children}</>;
}

// ─── Layout export ────────────────────────────────────────────────────────────

export default function DailyTrackerLayout({ children }: { children: ReactNode }) {
  return (
    <DailyTrackerProvider>
      <DailyTrackerInner>{children}</DailyTrackerInner>
    </DailyTrackerProvider>
  );
}
