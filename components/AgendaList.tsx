"use client";

import { useMemo } from "react";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import { expandAllOccurrences } from "@/lib/recurrence";
import { formatTime, isSameDay } from "@/lib/dateUtils";
import { EventOccurrence } from "@/lib/types";
import EventBlock from "./EventBlock";

interface AgendaListProps {
  rangeStart: Date;
  rangeEnd: Date;
  compact?: boolean;
}

export default function AgendaList({ rangeStart, rangeEnd, compact }: AgendaListProps) {
  const events = useEventStore((s) => s.events);
  const openEditModal = useUiStore((s) => s.openEditModal);

  const occurrences = useMemo(
    () => expandAllOccurrences(events, rangeStart, rangeEnd),
    [events, rangeStart, rangeEnd]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const occ of occurrences) {
      const dayKey = occ.start.toDateString();
      const list = map.get(dayKey) ?? [];
      list.push(occ);
      map.set(dayKey, list);
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [occurrences]);

  if (occurrences.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 dark:text-gray-500">
        No upcoming events in this range.
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6 p-4"}>
      {grouped.map(([dayKey, occs]) => {
        const day = new Date(dayKey);
        const isToday = isSameDay(day, new Date());
        return (
          <div key={dayKey}>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <span className={isToday ? "text-brand-500" : ""}>
                {day.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isToday && (
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                  Today
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {occs
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((occ) => (
                  <li key={occ.key}>
                    <button
                      onClick={() =>
                        openEditModal(
                          occ.event.recurrenceParentId ?? occ.event.id,
                          occ.isRecurringInstance
                            ? occ.start.toISOString().slice(0, 10)
                            : null
                        )
                      }
                      className="w-full text-left"
                    >
                      <EventBlock
                        title={occ.event.title}
                        color={occ.event.color}
                        subtitle={
                          occ.event.allDay
                            ? "All day"
                            : `${formatTime(occ.start)} – ${formatTime(occ.end)}`
                        }
                        location={occ.event.location}
                        conflict={false}
                      />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
