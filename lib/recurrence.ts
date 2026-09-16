import { CalendarEvent, EventOccurrence, RecurrenceRule } from "./types";
import { addDays, addMonths, startOfDay, toISODate } from "./dateUtils";

/**
 * Lightweight RRULE-style recurrence expansion.
 *
 * Supports FREQ=DAILY|WEEKLY|MONTHLY with INTERVAL, and a terminating
 * condition of either UNTIL (a date) or COUNT (a number of occurrences).
 * Per-occurrence exceptions (skipped dates) are respected via
 * `recurrence.exceptions` (an array of ISO yyyy-mm-dd strings).
 */

const MAX_OCCURRENCES_SAFETY = 2000;

function advance(date: Date, rule: RecurrenceRule): Date {
  switch (rule.frequency) {
    case "daily":
      return addDays(date, rule.interval);
    case "weekly":
      return addDays(date, 7 * rule.interval);
    case "monthly":
      return addMonths(date, rule.interval);
    default:
      return date;
  }
}

/**
 * Expand a recurring event into concrete occurrences within [rangeStart, rangeEnd].
 * Non-recurring events simply return themselves if they fall in range.
 */
export function expandEventOccurrences(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  const durationMs =
    new Date(event.end).getTime() - new Date(event.start).getTime();

  if (!event.recurrence || event.recurrence.frequency === "none") {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (end < rangeStart || start > rangeEnd) return [];
    return [
      {
        key: `${event.id}::${toISODate(start)}`,
        event,
        start,
        end,
        isRecurringInstance: false,
      },
    ];
  }

  const rule = event.recurrence;
  const exceptions = new Set(rule.exceptions ?? []);
  const occurrences: EventOccurrence[] = [];

  let cursorStart = new Date(event.start);
  const until = rule.until ? startOfDay(new Date(rule.until)) : null;
  const maxCount = rule.count ?? null;

  let generated = 0;
  let safety = 0;

  while (safety < MAX_OCCURRENCES_SAFETY) {
    safety++;

    if (until && startOfDay(cursorStart) > until) break;
    if (maxCount !== null && generated >= maxCount) break;
    if (cursorStart > rangeEnd) break;

    const occStart = cursorStart;
    const occEnd = new Date(occStart.getTime() + durationMs);
    const isoDate = toISODate(occStart);

    generated++;

    const inRange = occEnd >= rangeStart && occStart <= rangeEnd;
    const isException = exceptions.has(isoDate);

    if (inRange && !isException) {
      occurrences.push({
        key: `${event.id}::${isoDate}`,
        event,
        start: occStart,
        end: occEnd,
        isRecurringInstance: true,
      });
    }

    cursorStart = advance(cursorStart, rule);
  }

  return occurrences;
}

/**
 * Expand a full list of events (which may include recurrence-override
 * "child" events) into occurrences within a range, substituting any
 * per-occurrence overrides in place of the generated recurring instance.
 */
export function expandAllOccurrences(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  const overridesByParent = new Map<string, CalendarEvent[]>();
  const baseEvents: CalendarEvent[] = [];

  for (const ev of events) {
    if (ev.recurrenceParentId) {
      const list = overridesByParent.get(ev.recurrenceParentId) ?? [];
      list.push(ev);
      overridesByParent.set(ev.recurrenceParentId, list);
    } else {
      baseEvents.push(ev);
    }
  }

  const result: EventOccurrence[] = [];

  for (const ev of baseEvents) {
    const overrides = overridesByParent.get(ev.id) ?? [];
    const overriddenDates = new Set(
      overrides
        .map((o) => o.originalOccurrenceDate)
        .filter((d): d is string => Boolean(d))
    );

    const combinedRule: RecurrenceRule | null = ev.recurrence
      ? {
          ...ev.recurrence,
          exceptions: [
            ...(ev.recurrence.exceptions ?? []),
            ...Array.from(overriddenDates),
          ],
        }
      : null;

    const expanded = expandEventOccurrences(
      { ...ev, recurrence: combinedRule },
      rangeStart,
      rangeEnd
    );
    result.push(...expanded);

    for (const override of overrides) {
      const start = new Date(override.start);
      const end = new Date(override.end);
      if (end < rangeStart || start > rangeEnd) continue;
      result.push({
        key: `${override.id}::${toISODate(start)}`,
        event: override,
        start,
        end,
        isRecurringInstance: true,
      });
    }
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function describeRecurrence(rule: RecurrenceRule | null): string {
  if (!rule || rule.frequency === "none") return "Does not repeat";
  const unit =
    rule.frequency === "daily"
      ? "day"
      : rule.frequency === "weekly"
      ? "week"
      : "month";
  const base =
    rule.interval > 1
      ? `Every ${rule.interval} ${unit}s`
      : `Every ${unit}`;
  if (rule.until) {
    return `${base}, until ${rule.until}`;
  }
  if (rule.count) {
    return `${base}, ${rule.count} times`;
  }
  return base;
}
