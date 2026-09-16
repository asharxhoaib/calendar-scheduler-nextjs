import { CalendarEvent } from "./types";
import { expandAllOccurrences } from "./recurrence";
import { addDays } from "./dateUtils";

export interface DueReminder {
  key: string;
  event: CalendarEvent;
  occurrenceStart: Date;
}

/**
 * Scans events for occurrences within the next `lookaheadDays` and returns
 * any whose reminder-offset moment has just been crossed (i.e. falls
 * between `previousCheck` and `now`), so a caller can fire a toast exactly
 * once per occurrence.
 */
export function findDueReminders(
  events: CalendarEvent[],
  now: Date,
  previousCheck: Date,
  lookaheadDays = 14
): DueReminder[] {
  const rangeStart = addDays(now, -1);
  const rangeEnd = addDays(now, lookaheadDays);
  const occurrences = expandAllOccurrences(events, rangeStart, rangeEnd);

  const due: DueReminder[] = [];

  for (const occ of occurrences) {
    if (!occ.event.reminderOffset) continue;
    const reminderTime = new Date(
      occ.start.getTime() - occ.event.reminderOffset * 60 * 1000
    );
    if (reminderTime > previousCheck && reminderTime <= now) {
      due.push({ key: occ.key, event: occ.event, occurrenceStart: occ.start });
    }
  }

  return due;
}

export function requestNotificationPermissionIfNeeded() {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      /* no-op: guarded, ignore rejection */
    });
  }
}

export function tryShowNativeNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // Guarded: some environments (e.g. iframes) throw even when the API exists.
  }
}
