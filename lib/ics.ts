import { v4 as uuid } from "uuid";
import { CalendarEvent, RecurrenceRule } from "./types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a JS Date as a UTC ICS datetime stamp: YYYYMMDDTHHMMSSZ */
function toICSDateUTC(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function toICSDateOnly(date: Date): string {
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate())
  );
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function buildRRule(rule: RecurrenceRule): string {
  const parts: string[] = [];
  const freqMap: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
  };
  if (rule.frequency === "none") return "";
  parts.push(`FREQ=${freqMap[rule.frequency]}`);
  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.until) {
    const d = new Date(rule.until);
    parts.push(`UNTIL=${toICSDateOnly(d)}T235959Z`);
  } else if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }
  return parts.join(";");
}

function parseRRule(value: string): RecurrenceRule {
  const parts = Object.fromEntries(
    value.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const freqMap: Record<string, RecurrenceRule["frequency"]> = {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
  };
  const frequency = freqMap[parts.FREQ] ?? "none";
  const interval = parts.INTERVAL ? parseInt(parts.INTERVAL, 10) : 1;
  let until: string | null = null;
  if (parts.UNTIL) {
    const raw = parts.UNTIL;
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    until = `${y}-${m}-${d}`;
  }
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : null;
  return { frequency, interval, until, count, exceptions: [] };
}

/** Generate a full .ics document (VCALENDAR) from a list of events. */
export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//calendar-scheduler-nextjs//EN");
  lines.push("CALSCALE:GREGORIAN");

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@calendar-scheduler-nextjs`);
    lines.push(`DTSTAMP:${toICSDateUTC(new Date(event.createdAt))}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDateOnly(new Date(event.start))}`);
      lines.push(`DTEND;VALUE=DATE:${toICSDateOnly(new Date(event.end))}`);
    } else {
      lines.push(`DTSTART:${toICSDateUTC(new Date(event.start))}`);
      lines.push(`DTEND:${toICSDateUTC(new Date(event.end))}`);
    }
    lines.push(`SUMMARY:${escapeICSText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }
    if (event.recurrence && event.recurrence.frequency !== "none") {
      const rrule = buildRRule(event.recurrence);
      if (rrule) lines.push(`RRULE:${rrule}`);
      for (const ex of event.recurrence.exceptions ?? []) {
        const d = new Date(ex + "T00:00:00");
        lines.push(`EXDATE:${toICSDateUTC(d)}`);
      }
    }
    for (const attendee of event.attendees) {
      lines.push(
        `ATTENDEE;CN=${escapeICSText(attendee.name)};PARTSTAT=${attendee.status.toUpperCase()}:mailto:${attendee.email}`
      );
    }
    if (event.reminderOffset > 0) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeICSText(event.title)}`);
      lines.push(`TRIGGER:-PT${event.reminderOffset}M`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Fold/unfold-aware line splitter per RFC 5545 (basic implementation). */
function unfoldLines(raw: string): string[] {
  const rawLines = raw.split(/\r\n|\n|\r/);
  const unfolded: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseICSDate(value: string, params: string): { date: Date; allDay: boolean } {
  const isDateOnly = params.includes("VALUE=DATE") && !params.includes("VALUE=DATE-TIME");
  if (isDateOnly || /^\d{8}$/.test(value)) {
    const y = parseInt(value.slice(0, 4), 10);
    const m = parseInt(value.slice(4, 6), 10) - 1;
    const d = parseInt(value.slice(6, 8), 10);
    return { date: new Date(y, m, d), allDay: true };
  }
  const y = parseInt(value.slice(0, 4), 10);
  const m = parseInt(value.slice(4, 6), 10) - 1;
  const d = parseInt(value.slice(6, 8), 10);
  const hh = parseInt(value.slice(9, 11), 10);
  const mm = parseInt(value.slice(11, 13), 10);
  const ss = parseInt(value.slice(13, 15), 10) || 0;
  const isUTC = value.endsWith("Z");
  const date = isUTC
    ? new Date(Date.UTC(y, m, d, hh, mm, ss))
    : new Date(y, m, d, hh, mm, ss);
  return { date, allDay: false };
}

/** Parse a basic .ics document into CalendarEvent[]. */
export function parseICS(content: string): CalendarEvent[] {
  const lines = unfoldLines(content);
  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> & {
    _startAllDay?: boolean;
    _rrule?: string;
    _exdates?: string[];
  } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      current = {
        id: uuid(),
        title: "",
        description: "",
        location: "",
        color: "blue",
        attendees: [],
        reminderOffset: 0,
        recurrence: null,
        allDay: false,
        _exdates: [],
      };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.start && current.end) {
        const rule = current._rrule ? parseRRule(current._rrule) : null;
        if (rule) rule.exceptions = current._exdates ?? [];
        events.push({
          id: current.id as string,
          title: current.title || "Untitled event",
          description: current.description || "",
          location: current.location || "",
          color: (current.color as CalendarEvent["color"]) || "blue",
          start: current.start as string,
          end: current.end as string,
          allDay: Boolean(current.allDay),
          attendees: current.attendees || [],
          reminderOffset: (current.reminderOffset as CalendarEvent["reminderOffset"]) || 0,
          recurrence: rule,
          recurrenceParentId: null,
          originalOccurrenceDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const [key, ...paramParts] = rawKey.split(";");
    const params = paramParts.join(";");

    switch (key) {
      case "SUMMARY":
        current.title = unescapeICSText(value);
        break;
      case "DESCRIPTION":
        current.description = unescapeICSText(value);
        break;
      case "LOCATION":
        current.location = unescapeICSText(value);
        break;
      case "DTSTART": {
        const { date, allDay } = parseICSDate(value, params);
        current.start = date.toISOString();
        current.allDay = allDay;
        break;
      }
      case "DTEND": {
        const { date } = parseICSDate(value, params);
        current.end = date.toISOString();
        break;
      }
      case "RRULE":
        current._rrule = value;
        break;
      case "EXDATE": {
        const { date } = parseICSDate(value, params);
        current._exdates = [...(current._exdates ?? []), date.toISOString().slice(0, 10)];
        break;
      }
      default:
        break;
    }
  }

  return events;
}

export function downloadICSFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
