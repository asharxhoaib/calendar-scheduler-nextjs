"use client";

import { useEffect, useRef } from "react";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import {
  findDueReminders,
  requestNotificationPermissionIfNeeded,
  tryShowNativeNotification,
} from "./reminders";

const POLL_INTERVAL_MS = 15_000;

/**
 * Client-side reminder simulation: polls upcoming occurrences on an
 * interval and pushes an in-app toast (plus a guarded native Notification
 * call) the moment a reminder offset is crossed.
 */
export function useReminderTimer() {
  const events = useEventStore((s) => s.events);
  const pushToast = useUiStore((s) => s.pushToast);
  const lastCheckRef = useRef<Date>(new Date());
  const firedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestNotificationPermissionIfNeeded();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const due = findDueReminders(events, now, lastCheckRef.current);

      for (const reminder of due) {
        if (firedKeysRef.current.has(reminder.key)) continue;
        firedKeysRef.current.add(reminder.key);

        const timeStr = reminder.occurrenceStart.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
        pushToast({
          title: `Upcoming: ${reminder.event.title}`,
          body: `Starts at ${timeStr}${
            reminder.event.location ? ` · ${reminder.event.location}` : ""
          }`,
        });
        tryShowNativeNotification(
          reminder.event.title,
          `Starts at ${timeStr}`
        );
      }

      lastCheckRef.current = now;
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [events, pushToast]);
}
