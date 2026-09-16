"use client";

import CalendarShell from "@/components/CalendarShell";
import AgendaList from "@/components/AgendaList";
import { useUiStore } from "@/store/useUiStore";
import { addDays, endOfDay, startOfDay } from "@/lib/dateUtils";

export default function AgendaPage() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const anchor = new Date(selectedDate + "T00:00:00");

  return (
    <CalendarShell activeView="agenda">
      <div className="h-full overflow-y-auto">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-base font-semibold">Agenda — next 30 days</h2>
        </div>
        <AgendaList
          rangeStart={startOfDay(anchor)}
          rangeEnd={endOfDay(addDays(anchor, 30))}
        />
      </div>
    </CalendarShell>
  );
}
