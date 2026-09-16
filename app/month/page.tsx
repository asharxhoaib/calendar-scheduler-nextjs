"use client";

import CalendarShell from "@/components/CalendarShell";
import MonthGrid from "@/components/MonthGrid";
import AgendaList from "@/components/AgendaList";
import MonthHeader from "@/components/MonthHeader";
import { useUiStore } from "@/store/useUiStore";
import { addDays, endOfDay, startOfDay } from "@/lib/dateUtils";

export default function MonthPage() {
  const selectedDate = useUiStore((s) => s.selectedDate);
  const anchor = new Date(selectedDate + "T00:00:00");

  return (
    <CalendarShell activeView="month">
      <div className="hidden h-full flex-col md:flex">
        <MonthHeader />
        <div className="flex-1 overflow-hidden">
          <MonthGrid />
        </div>
      </div>
      <div className="h-full overflow-y-auto md:hidden">
        <MonthHeader />
        <AgendaList
          rangeStart={startOfDay(anchor)}
          rangeEnd={endOfDay(addDays(anchor, 30))}
        />
      </div>
    </CalendarShell>
  );
}
