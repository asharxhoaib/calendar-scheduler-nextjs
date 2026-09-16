"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import { expandAllOccurrences } from "@/lib/recurrence";
import {
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  monthGridEnd,
  monthGridStart,
  toISODate,
  WEEKDAY_LABELS,
} from "@/lib/dateUtils";
import { EventOccurrence } from "@/lib/types";
import EventBlock from "./EventBlock";

export default function MonthGrid() {
  const events = useEventStore((s) => s.events);
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const openCreateModal = useUiStore((s) => s.openCreateModal);
  const openEditModal = useUiStore((s) => s.openEditModal);

  const anchor = new Date(selectedDate + "T00:00:00");
  const gridStart = monthGridStart(anchor);
  const gridEnd = monthGridEnd(anchor);
  const days = useMemo(() => eachDayOfInterval(gridStart, gridEnd), [gridStart, gridEnd]);

  const occurrences = useMemo(
    () => expandAllOccurrences(events, gridStart, gridEnd),
    [events, gridStart, gridEnd]
  );

  const occurrencesByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const occ of occurrences) {
      // For multi-day/all-day events, place on each covered day within the grid.
      const start = new Date(Math.max(occ.start.getTime(), gridStart.getTime()));
      const end = new Date(Math.min(occ.end.getTime(), gridEnd.getTime()));
      const cursorDays = eachDayOfInterval(start, end);
      for (const d of cursorDays) {
        const key = toISODate(d);
        const list = map.get(key) ?? [];
        list.push(occ);
        map.set(key, list);
      }
    }
    return map;
  }, [occurrences, gridStart, gridEnd]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(toISODate(day));
  };

  const handleDayDoubleClick = (day: Date) => {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(10, 0, 0, 0);
    openCreateModal(start, end);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-gray-200 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {days.map((day) => {
          const key = toISODate(day);
          const dayOccurrences = (occurrencesByDay.get(key) ?? []).sort(
            (a, b) => a.start.getTime() - b.start.getTime()
          );
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, new Date(selectedDate + "T00:00:00"));
          const visible = dayOccurrences.slice(0, 3);
          const overflow = dayOccurrences.length - visible.length;

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              onDoubleClick={() => handleDayDoubleClick(day)}
              className={clsx(
                "flex min-h-[90px] flex-col items-stretch gap-1 border-b border-r border-gray-100 p-1.5 text-left transition-colors dark:border-gray-800",
                !inMonth && "bg-gray-50/60 dark:bg-gray-900/40",
                isSelected && "bg-brand-50 dark:bg-brand-900/20"
              )}
            >
              <span
                className={clsx(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  !inMonth && "text-gray-300 dark:text-gray-600",
                  inMonth && !isToday && "text-gray-700 dark:text-gray-300",
                  isToday && "bg-brand-500 text-white"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((occ) => (
                  <div
                    key={occ.key}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(
                        occ.event.recurrenceParentId ?? occ.event.id,
                        occ.isRecurringInstance
                          ? occ.start.toISOString().slice(0, 10)
                          : null
                      );
                    }}
                  >
                    <EventBlock title={occ.event.title} color={occ.event.color} compact />
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] text-gray-400 dark:text-gray-500">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
