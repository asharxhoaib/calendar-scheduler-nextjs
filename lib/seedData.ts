import { v4 as uuid } from "uuid";
import { CalendarEvent, EventColor } from "./types";

function atTime(daysFromToday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function mkEvent(partial: {
  title: string;
  description?: string;
  location?: string;
  color?: EventColor;
  start: Date;
  end: Date;
  allDay?: boolean;
  reminderOffset?: CalendarEvent["reminderOffset"];
  recurrence?: CalendarEvent["recurrence"];
  attendees?: CalendarEvent["attendees"];
}): CalendarEvent {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: partial.title,
    description: partial.description ?? "",
    location: partial.location ?? "",
    color: partial.color ?? "blue",
    start: partial.start.toISOString(),
    end: partial.end.toISOString(),
    allDay: partial.allDay ?? false,
    attendees: partial.attendees ?? [],
    reminderOffset: partial.reminderOffset ?? 15,
    recurrence: partial.recurrence ?? null,
    recurrenceParentId: null,
    originalOccurrenceDate: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSeedEvents(): CalendarEvent[] {
  const mockAttendees = [
    { id: uuid(), name: "Amara Okoye", email: "amara@example.com", status: "accepted" as const },
    { id: uuid(), name: "Liam Chen", email: "liam@example.com", status: "pending" as const },
    { id: uuid(), name: "Priya Nair", email: "priya@example.com", status: "declined" as const },
  ];

  return [
    mkEvent({
      title: "Team Standup",
      description: "Daily sync with the product engineering team.",
      location: "Zoom",
      color: "blue",
      start: atTime(0, 9, 0),
      end: atTime(0, 9, 15),
      reminderOffset: 5,
      recurrence: { frequency: "daily", interval: 1, until: null, count: 30, exceptions: [] },
      attendees: mockAttendees.slice(0, 2),
    }),
    mkEvent({
      title: "Design Review",
      description: "Review new onboarding flow mockups.",
      location: "Conference Room B",
      color: "purple",
      start: atTime(0, 11, 0),
      end: atTime(0, 12, 0),
      reminderOffset: 10,
      attendees: mockAttendees,
    }),
    mkEvent({
      title: "1:1 with Manager",
      description: "Weekly check-in.",
      location: "Manager's office",
      color: "teal",
      start: atTime(0, 11, 30),
      end: atTime(0, 12, 0),
      reminderOffset: 15,
    }),
    mkEvent({
      title: "Lunch with Priya",
      description: "Catch up over lunch.",
      location: "Cafe Milano",
      color: "orange",
      start: atTime(1, 12, 30),
      end: atTime(1, 13, 30),
      reminderOffset: 30,
      attendees: [mockAttendees[2]],
    }),
    mkEvent({
      title: "Sprint Planning",
      description: "Plan next sprint's backlog.",
      location: "Main Hall",
      color: "green",
      start: atTime(2, 14, 0),
      end: atTime(2, 15, 30),
      reminderOffset: 60,
      attendees: mockAttendees,
    }),
    mkEvent({
      title: "Weekly Newsletter Deadline",
      description: "Submit the newsletter draft.",
      color: "red",
      start: atTime(3, 17, 0),
      end: atTime(3, 17, 30),
      reminderOffset: 1440,
      recurrence: { frequency: "weekly", interval: 1, until: null, count: 8, exceptions: [] },
    }),
    mkEvent({
      title: "Company All-Hands",
      description: "Monthly company-wide meeting.",
      location: "Main Auditorium",
      color: "pink",
      start: atTime(5, 10, 0),
      end: atTime(5, 11, 0),
      reminderOffset: 60,
      recurrence: { frequency: "monthly", interval: 1, until: null, count: 6, exceptions: [] },
      attendees: mockAttendees,
    }),
    mkEvent({
      title: "Dentist Appointment",
      description: "Routine checkup.",
      location: "Downtown Dental",
      color: "gray",
      start: atTime(4, 15, 0),
      end: atTime(4, 16, 0),
      reminderOffset: 1440,
    }),
    mkEvent({
      title: "Product Launch",
      description: "Launch day for the Q3 release.",
      location: "HQ",
      color: "red",
      allDay: true,
      start: atTime(7, 0, 0),
      end: atTime(7, 23, 59),
      reminderOffset: 1440,
    }),
    mkEvent({
      title: "Overlapping Sync",
      description: "This overlaps with Design Review to demo conflict detection.",
      location: "Room C",
      color: "orange",
      start: atTime(0, 11, 15),
      end: atTime(0, 11, 45),
      reminderOffset: 5,
    }),
    mkEvent({
      title: "Vacation",
      description: "Out of office.",
      color: "green",
      allDay: true,
      start: atTime(10, 0, 0),
      end: atTime(13, 23, 59),
      reminderOffset: 0,
    }),
  ];
}
