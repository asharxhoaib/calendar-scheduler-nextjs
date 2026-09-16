"use client";

import { useUiStore } from "@/store/useUiStore";
import { addMonths, formatMonthYear, toISODate } from "@/lib/dateUtils";

export default function MonthHeader() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const anchor = new Date(selectedDate + "T00:00:00");

  const go = (delta: number) => {
    setSelectedDate(toISODate(addMonths(anchor, delta)));
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
      <h2 className="text-base font-semibold">{formatMonthYear(anchor)}</h2>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedDate(toISODate(new Date()))}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Today
        </button>
        <button
          onClick={() => go(-1)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Previous month"
        >
          ‹
        </button>
        <button
          onClick={() => go(1)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
    </div>
  );
}
