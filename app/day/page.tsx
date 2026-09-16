"use client";

import CalendarShell from "@/components/CalendarShell";
import TimedGrid from "@/components/TimedGrid";
import AgendaList from "@/components/AgendaList";
import { useUiStore } from "@/store/useUiStore";
import { addDays, endOfDay, formatDayHeading, startOfDay, toISODate } from "@/lib/dateUtils";

export default function DayPage() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const setSelectedDate = useUiStore((s) => s.setSelectedDate);
  const anchor = new Date(selectedDate + "T00:00:00");

  const go = (delta: number) => {
    setSelectedDate(toISODate(addDays(anchor, delta)));
  };

  return (
    <CalendarShell activeView="day">
      <div className="hidden h-full flex-col md:flex">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
          <h2 className="text-base font-semibold">{formatDayHeading(anchor)}</h2>
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
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              onClick={() => go(1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Next day"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <TimedGrid days={[anchor]} />
        </div>
      </div>
      <div className="h-full overflow-y-auto md:hidden">
        <AgendaList rangeStart={startOfDay(anchor)} rangeEnd={endOfDay(anchor)} />
      </div>
    </CalendarShell>
  );
}
