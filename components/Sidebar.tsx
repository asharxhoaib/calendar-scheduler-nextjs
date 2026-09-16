"use client";

import MiniCalendar from "./MiniCalendar";
import AgendaList from "./AgendaList";
import { useUiStore } from "@/store/useUiStore";
import { addDays, endOfDay, startOfDay } from "@/lib/dateUtils";

export default function Sidebar() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const anchor = new Date(selectedDate + "T00:00:00");
  const rangeStart = startOfDay(anchor);
  const rangeEnd = endOfDay(addDays(anchor, 13));

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:flex">
      <MiniCalendar />
      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Upcoming (14 days)
        </h2>
        <AgendaList rangeStart={rangeStart} rangeEnd={rangeEnd} compact />
      </div>
    </aside>
  );
}
