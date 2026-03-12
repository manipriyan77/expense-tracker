"use client";

import { Settings, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useDashboardPreferencesStore,
  WIDGET_REGISTRY,
} from "@/store/dashboard-preferences-store";

export function DashboardCustomizer() {
  const { widgetOrder, isVisible, toggleWidget, moveWidget, resetToDefault } =
    useDashboardPreferencesStore();

  const orderedWidgets = widgetOrder
    .map((id) => WIDGET_REGISTRY.find((w) => w.id === id))
    .filter(Boolean) as typeof WIDGET_REGISTRY;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Customize dashboard"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          {orderedWidgets.map((widget, idx) => (
            <div
              key={widget.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveWidget(widget.id, "up")}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveWidget(widget.id, "down")}
                  disabled={idx === orderedWidgets.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <Label
                htmlFor={`widget-${widget.id}`}
                className="flex-1 text-sm cursor-pointer select-none"
              >
                {widget.label}
              </Label>

              <Switch
                id={`widget-${widget.id}`}
                checked={isVisible(widget.id)}
                onCheckedChange={() => toggleWidget(widget.id)}
              />
            </div>
          ))}
        </div>
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={resetToDefault}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            Reset to default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
