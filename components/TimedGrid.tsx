"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import { expandAllOccurrences } from "@/lib/recurrence";
import { findConflictingKeys, layoutOccurrences } from "@/lib/conflicts";
import {
  formatTime,
  HOURS_IN_DAY,
  isSameDay,
  startOfDay,
  toISODate,
} from "@/lib/dateUtils";
import { EventOccurrence } from "@/lib/types";

const HOUR_HEIGHT = 56; // px
const MINUTE_STEP = 15;

interface DragCreateState {
  day: Date;
  startMinutes: number;
  currentMinutes: number;
}

interface DragMoveState {
  occurrence: EventOccurrence;
  mode: "move" | "resize";
  originStartMinutes: number;
  originEndMinutes: number;
  pointerStartMinutes: number;
  day: Date;
}

interface TimedGridProps {
  days: Date[];
}

export default function TimedGrid({ days }: TimedGridProps) {
  const events = useEventStore((s) => s.events);
  const moveOccurrence = useEventStore((s) => s.moveOccurrence);
  const openCreateModal = useUiStore((s) => s.openCreateModal);
  const openEditModal = useUiStore((s) => s.openEditModal);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);
  const [dragMove, setDragMove] = useState<DragMoveState | null>(null);

  const rangeStart = startOfDay(days[0]);
  const rangeEnd = new Date(startOfDay(days[days.length - 1]).getTime() + 24 * 60 * 60 * 1000 - 1);

  const occurrences = useMemo(
    () => expandAllOccurrences(events, rangeStart, rangeEnd),
    [events, rangeStart, rangeEnd]
  );

  const allDayOccurrences = occurrences.filter((o) => o.event.allDay);
  const timedOccurrences = occurrences.filter((o) => !o.event.allDay);

  const conflictKeys = useMemo(
    () => findConflictingKeys(timedOccurrences),
    [timedOccurrences]
  );

  const minutesFromClientY = (clientY: number): number => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const offsetY = clientY - rect.top + container.scrollTop;
    const minutes = (offsetY / HOUR_HEIGHT) * 60;
    return Math.max(0, Math.min(24 * 60, Math.round(minutes / MINUTE_STEP) * MINUTE_STEP));
  };

  const handleCellMouseDown = (day: Date, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-event-block]")) return;
    const minutes = minutesFromClientY(e.clientY);
    setDragCreate({ day, startMinutes: minutes, currentMinutes: minutes });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const m = minutesFromClientY(moveEvent.clientY);
      setDragCreate((prev) => (prev ? { ...prev, currentMinutes: m } : prev));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setDragCreate((prev) => {
        if (prev) {
          const startMin = Math.min(prev.startMinutes, prev.currentMinutes);
          const endMin = Math.max(prev.startMinutes, prev.currentMinutes);
          const finalEndMin = endMin - startMin < MINUTE_STEP ? startMin + 60 : endMin;
          const start = new Date(prev.day);
          start.setHours(0, startMin, 0, 0);
          const end = new Date(prev.day);
          end.setHours(0, finalEndMin, 0, 0);
          openCreateModal(start, end);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const startOccurrenceDrag = (
    occ: EventOccurrence,
    mode: "move" | "resize",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const pointerMinutes = minutesFromClientY(e.clientY);
    const startMinutes = occ.start.getHours() * 60 + occ.start.getMinutes();
    const endMinutes = occ.end.getHours() * 60 + occ.end.getMinutes();

    setDragMove({
      occurrence: occ,
      mode,
      originStartMinutes: startMinutes,
      originEndMinutes: endMinutes,
      pointerStartMinutes: pointerMinutes,
      day: startOfDay(occ.start),
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const current = minutesFromClientY(moveEvent.clientY);
      setLiveDelta(current - pointerMinutes);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const current = minutesFromClientY(upEvent.clientY);
      const delta = current - pointerMinutes;

      setDragMove(null);
      setLiveDelta(0);

      if (Math.abs(delta) < MINUTE_STEP) return;

      const occurrenceDateISO = toISODate(occ.start);

      if (mode === "move") {
        const newStartMin = clamp(startMinutes + delta, 0, 24 * 60 - (endMinutes - startMinutes));
        const duration = endMinutes - startMinutes;
        const newStart = new Date(startOfDay(occ.start));
        newStart.setMinutes(newStartMin);
        const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);
        moveOccurrence(occ.event.id, occurrenceDateISO, newStart, newEnd);
      } else {
        const newEndMin = clamp(endMinutes + delta, startMinutes + MINUTE_STEP, 24 * 60);
        const newStart = new Date(startOfDay(occ.start));
        newStart.setMinutes(startMinutes);
        const newEnd = new Date(startOfDay(occ.start));
        newEnd.setMinutes(newEndMin);
        moveOccurrence(occ.event.id, occurrenceDateISO, newStart, newEnd);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const [liveDelta, setLiveDelta] = useState(0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="grid border-b border-gray-200 dark:border-gray-800"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l border-gray-100 px-2 py-2 text-center dark:border-gray-800">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {day.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div
              className={clsx(
                "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                isSameDay(day, new Date())
                  ? "bg-brand-500 text-white"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {allDayOccurrences.length > 0 && (
        <div
          className="grid border-b border-gray-200 dark:border-gray-800"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <div className="px-1 py-1 text-right text-[10px] text-gray-400 dark:text-gray-500">
            All day
          </div>
          {days.map((day) => {
            const dayEvents = allDayOccurrences.filter(
              (o) => o.start <= day && o.end >= startOfDay(day)
            );
            return (
              <div key={day.toISOString()} className="space-y-0.5 border-l border-gray-100 p-1 dark:border-gray-800">
                {dayEvents.map((occ) => (
                  <div
                    key={occ.key}
                    data-event-block
                    onClick={() =>
                      openEditModal(
                        occ.event.recurrenceParentId ?? occ.event.id,
                        occ.isRecurringInstance ? toISODate(occ.start) : null
                      )
                    }
                    className={clsx(
                      "cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                      `event-color-${occ.event.color}`
                    )}
                  >
                    {occ.event.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div ref={containerRef} className="relative flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div>
            {HOURS_IN_DAY.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-gray-100 pr-2 text-right text-[10px] text-gray-400 dark:border-gray-800 dark:text-gray-500"
              >
                <span className="relative -top-2">
                  {h === 0 ? "" : new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" })}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayKey = toISODate(day);
            const dayOccurrences = timedOccurrences.filter((o) => isSameDay(o.start, day));
            const layout = layoutOccurrences(dayOccurrences);

            return (
              <div
                key={dayKey}
                className="relative border-l border-gray-100 dark:border-gray-800"
                style={{ height: HOUR_HEIGHT * 24 }}
                onMouseDown={(e) => handleCellMouseDown(day, e)}
              >
                {HOURS_IN_DAY.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-gray-100 dark:border-gray-800"
                  />
                ))}

                {dragCreate && isSameDay(dragCreate.day, day) && (
                  <div
                    className="pointer-events-none absolute left-0.5 right-0.5 rounded bg-brand-300/50 dark:bg-brand-500/30"
                    style={{
                      top: (Math.min(dragCreate.startMinutes, dragCreate.currentMinutes) / 60) * HOUR_HEIGHT,
                      height:
                        (Math.abs(dragCreate.currentMinutes - dragCreate.startMinutes) / 60) * HOUR_HEIGHT,
                    }}
                  />
                )}

                {dayOccurrences.map((occ) => {
                  const startMin = occ.start.getHours() * 60 + occ.start.getMinutes();
                  const endMin = occ.end.getHours() * 60 + occ.end.getMinutes();
                  const info = layout.get(occ.key) ?? { column: 0, totalColumns: 1 };
                  const isDragging = dragMove?.occurrence.key === occ.key;
                  const displayStart = isDragging && dragMove?.mode === "move" ? startMin + liveDelta : startMin;
                  const displayEnd = isDragging && dragMove?.mode === "resize" ? endMin + liveDelta : endMin;

                  const widthPct = 100 / info.totalColumns;
                  const leftPct = widthPct * info.column;

                  return (
                    <div
                      key={occ.key}
                      data-event-block
                      onMouseDown={(e) => startOccurrenceDrag(occ, "move", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(
                          occ.event.recurrenceParentId ?? occ.event.id,
                          occ.isRecurringInstance ? toISODate(occ.start) : null
                        );
                      }}
                      className={clsx(
                        "group absolute cursor-grab overflow-hidden rounded-md border px-1.5 py-0.5 text-[11px] leading-tight shadow-sm active:cursor-grabbing",
                        `event-color-${occ.event.color}`,
                        conflictKeys.has(occ.key) && "conflict-ring"
                      )}
                      style={{
                        top: (Math.max(0, displayStart) / 60) * HOUR_HEIGHT,
                        height: Math.max(18, ((displayEnd - displayStart) / 60) * HOUR_HEIGHT - 2),
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      <div className="truncate font-semibold">{occ.event.title}</div>
                      <div className="truncate opacity-80">
                        {formatTime(occ.start)} – {formatTime(occ.end)}
                      </div>
                      <div
                        onMouseDown={(e) => startOccurrenceDrag(occ, "resize", e)}
                        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100"
                      >
                        <div className="mx-auto h-0.5 w-6 rounded-full bg-current" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
