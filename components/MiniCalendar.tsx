"use client";

import { useState } from "react";
import clsx from "clsx";
import { useUiStore } from "@/store/useUiStore";
import {
  addMonths,
  isSameDay,
  isSameMonth,
  monthGridEnd,
  monthGridStart,
  toISODate,
  WEEKDAY_LABELS,
  eachDayOfInterval,
} from "@/lib/dateUtils";

export default function MiniCalendar() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const [cursor, setCursor] = useState(() => new Date(selectedDate + "T00:00:00"));

  const gridStart = monthGridStart(cursor);
  const gridEnd = monthGridEnd(cursor);
  const days = eachDayOfInterval(gridStart, gridEnd);
  const selected = new Date(selectedDate + "T00:00:00");
  const today = new Date();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((day) => {
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const inMonth = isSameMonth(day, cursor);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(toISODate(day))}
              className={clsx(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                !inMonth && "text-gray-300 dark:text-gray-600",
                inMonth && !isSelected && "text-gray-700 dark:text-gray-300",
                isSelected && "bg-brand-500 text-white",
                !isSelected && isToday && "ring-1 ring-brand-400"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
