"use client";

import { useEffect, useState } from "react";
import { Progress } from "./progress";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function AnimatedProgress({ value, className, indicatorClassName }: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 80);
    return () => clearTimeout(timer);
  }, [value]);

  return <Progress value={displayValue} className={cn(className)} />;
}
