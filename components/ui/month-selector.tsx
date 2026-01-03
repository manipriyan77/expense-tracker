"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  monthsToShow?: number;
}

export function MonthSelector({
  selectedMonth,
  onMonthChange,
  monthsToShow = 7,
}: MonthSelectorProps) {
  // Generate array of last N months
  const generateMonths = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < monthsToShow; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(date);
    }
    
    return months;
  };

  const months = generateMonths();

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

  const getOldestAllowedMonth = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() - (monthsToShow - 1), 1);
  };

  const isOldestMonth = () => {
    const oldestMonth = getOldestAllowedMonth();
    return (
      selectedMonth.getMonth() === oldestMonth.getMonth() &&
      selectedMonth.getFullYear() === oldestMonth.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    const newDate = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() - 1,
      1
    );
    const oldestMonth = getOldestAllowedMonth();
    
    // Don't allow going before the oldest allowed month
    if (newDate >= oldestMonth) {
      onMonthChange(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      1
    );
    const today = new Date();
    
    // Don't allow future months
    if (newDate <= today) {
      onMonthChange(newDate);
    }
  };

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    onMonthChange(newDate);
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return (
      selectedMonth.getMonth() === today.getMonth() &&
      selectedMonth.getFullYear() === today.getFullYear()
    );
  };

  const getMonthValue = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}`;
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Previous Month Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevMonth}
        disabled={isOldestMonth()}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Month Selector Dropdown */}
      <Select
        value={getMonthValue(selectedMonth)}
        onValueChange={handleMonthSelect}
      >
        <SelectTrigger className="w-[180px] h-9">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue>
            {formatMonthShort(selectedMonth)}
          </SelectValue>
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

      {/* Next Month Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={isCurrentMonth()}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Current Month Badge */}
      {isCurrentMonth() && (
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          Current
        </span>
      )}
    </div>
  );
}

