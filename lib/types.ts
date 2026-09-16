export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // every N days/weeks/months
  /** ISO date string (yyyy-mm-dd). If set, recurrence stops on/before this date. */
  until?: string | null;
  /** Number of occurrences (including the first). Mutually exclusive-ish with `until` (until wins if both set). */
  count?: number | null;
  /** ISO date strings (yyyy-mm-dd) of occurrences that were deleted/skipped. */
  exceptions?: string[];
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  status: "accepted" | "declined" | "pending";
}

export type ReminderOffset = 0 | 5 | 10 | 15 | 30 | 60 | 1440; // minutes before start

export type EventColor =
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "orange"
  | "teal"
  | "pink"
  | "gray";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  color: EventColor;
  /** ISO datetime string */
  start: string;
  /** ISO datetime string */
  end: string;
  allDay: boolean;
  attendees: Attendee[];
  reminderOffset: ReminderOffset;
  recurrence: RecurrenceRule | null;
  /** If this event instance is an override of a recurring parent, this is the parent's id. */
  recurrenceParentId?: string | null;
  /** For an overridden occurrence, the original ISO date (yyyy-mm-dd) it replaces. */
  originalOccurrenceDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventOccurrence {
  /** Unique key for this occurrence: `${event.id}::${occurrenceDateISO}` */
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
  isRecurringInstance: boolean;
}

export type CalendarViewType = "month" | "week" | "day" | "agenda";

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
}
