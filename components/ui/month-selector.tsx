"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

interface MonthSelectorProps {
  readonly selectedMonth: Date;
  readonly onMonthChange: (date: Date) => void;
  /** How many months to list going back from today, including the current month (default 7). */
  monthsToShow?: number;
  /** How many months after the current calendar month to allow (default 24). */
  monthsFuture?: number;
}

export function MonthSelector({
  selectedMonth,
  onMonthChange,
  monthsToShow = 7,
  monthsFuture = 24,
}: MonthSelectorProps) {
  const today = new Date();

  const oldestMonth = startOfMonth(
    new Date(today.getFullYear(), today.getMonth() - (monthsToShow - 1), 1),
  );

  const newestMonth = startOfMonth(
    new Date(today.getFullYear(), today.getMonth() + monthsFuture, 1),
  );

  const months = useMemo(() => {
    const list: Date[] = [];
    for (
      let d = new Date(oldestMonth);
      d.getTime() <= newestMonth.getTime();
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      list.push(new Date(d));
    }
    return list;
  }, [oldestMonth, newestMonth]);

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatMonthShort = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const handlePrevMonth = () => {
    const newDate = startOfMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
    );
    if (newDate.getTime() >= oldestMonth.getTime()) {
      onMonthChange(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = startOfMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1),
    );
    if (newDate.getTime() <= newestMonth.getTime()) {
      onMonthChange(newDate);
    }
  };

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    const newDate = startOfMonth(new Date(year, month, 1));
    onMonthChange(newDate);
  };

  const isCurrentCalendarMonth = () => {
    return sameMonth(selectedMonth, today);
  };

  const isOldestMonth = () => sameMonth(selectedMonth, oldestMonth);
  const isNewestMonth = () => sameMonth(selectedMonth, newestMonth);

  const getMonthValue = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevMonth}
        disabled={isOldestMonth()}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={getMonthValue(selectedMonth)}
        onValueChange={handleMonthSelect}
      >
        <SelectTrigger className="w-[180px] h-9">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue>{formatMonthShort(selectedMonth)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem
              key={getMonthValue(month)}
              value={getMonthValue(month)}
            >
              {formatMonth(month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={isNewestMonth()}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {isCurrentCalendarMonth() && (
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          Current
        </span>
      )}
    </div>
  );
}
