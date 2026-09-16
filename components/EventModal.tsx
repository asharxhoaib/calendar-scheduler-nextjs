"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiStore } from "@/store/useUiStore";
import { useEventStore } from "@/store/useEventStore";
import {
  Attendee,
  CalendarEvent,
  EventColor,
  RecurrenceFrequency,
  ReminderOffset,
} from "@/lib/types";
import { toISODateTimeLocal } from "@/lib/dateUtils";

const COLORS: EventColor[] = [
  "blue",
  "green",
  "red",
  "purple",
  "orange",
  "teal",
  "pink",
  "gray",
];

const REMINDER_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: 0, label: "No reminder" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const MOCK_ATTENDEE_POOL: Omit<Attendee, "status">[] = [
  { id: "a1", name: "Amara Okoye", email: "amara@example.com" },
  { id: "a2", name: "Liam Chen", email: "liam@example.com" },
  { id: "a3", name: "Priya Nair", email: "priya@example.com" },
  { id: "a4", name: "Noah Silva", email: "noah@example.com" },
  { id: "a5", name: "Sofia Torres", email: "sofia@example.com" },
];

interface FormState {
  title: string;
  description: string;
  location: string;
  color: EventColor;
  start: string; // datetime-local
  end: string; // datetime-local
  allDay: boolean;
  reminderOffset: ReminderOffset;
  attendeeIds: string[];
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceEndMode: "never" | "until" | "count";
  recurrenceUntil: string;
  recurrenceCount: number;
}

function defaultFormState(): FormState {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    location: "",
    color: "blue",
    start: toISODateTimeLocal(now),
    end: toISODateTimeLocal(end),
    allDay: false,
    reminderOffset: 15,
    attendeeIds: [],
    recurrenceFrequency: "none",
    recurrenceInterval: 1,
    recurrenceEndMode: "never",
    recurrenceUntil: "",
    recurrenceCount: 5,
  };
}

export default function EventModal() {
  const isModalOpen = useUiStore((s) => s.isModalOpen);
  const closeModal = useUiStore((s) => s.closeModal);
  const editingEventId = useUiStore((s) => s.editingEventId);
  const editingOccurrenceDate = useUiStore((s) => s.editingOccurrenceDate);
  const draftEvent = useUiStore((s) => s.draftEvent);
  const pushToast = useUiStore((s) => s.pushToast);

  const events = useEventStore((s) => s.events);
  const addEvent = useEventStore((s) => s.addEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const deleteEvent = useEventStore((s) => s.deleteEvent);
  const deleteEventAndOverrides = useEventStore((s) => s.deleteEventAndOverrides);
  const deleteOccurrence = useEventStore((s) => s.deleteOccurrence);

  const editingEvent = useMemo(
    () => events.find((ev) => ev.id === editingEventId) ?? null,
    [events, editingEventId]
  );

  const [form, setForm] = useState<FormState>(defaultFormState());

  useEffect(() => {
    if (!isModalOpen) return;

    if (editingEvent) {
      const rec = editingEvent.recurrence;
      setForm({
        title: editingEvent.title,
        description: editingEvent.description,
        location: editingEvent.location,
        color: editingEvent.color,
        start: toISODateTimeLocal(new Date(editingEvent.start)),
        end: toISODateTimeLocal(new Date(editingEvent.end)),
        allDay: editingEvent.allDay,
        reminderOffset: editingEvent.reminderOffset,
        attendeeIds: editingEvent.attendees.map((a) => a.id),
        recurrenceFrequency: rec?.frequency ?? "none",
        recurrenceInterval: rec?.interval ?? 1,
        recurrenceEndMode: rec?.until ? "until" : rec?.count ? "count" : "never",
        recurrenceUntil: rec?.until ?? "",
        recurrenceCount: rec?.count ?? 5,
      });
    } else if (draftEvent) {
      setForm({
        ...defaultFormState(),
        start: toISODateTimeLocal(new Date(draftEvent.start)),
        end: toISODateTimeLocal(new Date(draftEvent.end)),
        allDay: Boolean(draftEvent.allDay),
      });
    } else {
      setForm(defaultFormState());
    }
  }, [isModalOpen, editingEvent, draftEvent]);

  if (!isModalOpen) return null;

  const isEditing = Boolean(editingEvent);
  const isEditingOccurrence = Boolean(editingOccurrenceDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      pushToast({ title: "Title is required" });
      return;
    }

    const start = new Date(form.start);
    const end = new Date(form.end);
    if (end <= start) {
      pushToast({ title: "End time must be after start time" });
      return;
    }

    const attendees: Attendee[] = form.attendeeIds.map((id) => {
      const base = MOCK_ATTENDEE_POOL.find((a) => a.id === id)!;
      return { ...base, status: "pending" };
    });

    const recurrence =
      form.recurrenceFrequency === "none"
        ? null
        : {
            frequency: form.recurrenceFrequency,
            interval: Math.max(1, form.recurrenceInterval),
            until:
              form.recurrenceEndMode === "until" && form.recurrenceUntil
                ? form.recurrenceUntil
                : null,
            count:
              form.recurrenceEndMode === "count" ? form.recurrenceCount : null,
            exceptions: editingEvent?.recurrence?.exceptions ?? [],
          };

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      color: form.color,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: form.allDay,
      attendees,
      reminderOffset: form.reminderOffset,
      recurrence,
      recurrenceParentId: editingEvent?.recurrenceParentId ?? null,
      originalOccurrenceDate: editingEvent?.originalOccurrenceDate ?? null,
    };

    if (isEditing && editingEvent) {
      updateEvent(editingEvent.id, payload);
      pushToast({ title: "Event updated", body: form.title });
    } else {
      addEvent(payload as Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">);
      pushToast({ title: "Event created", body: form.title });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (!editingEvent) return;
    if (isEditingOccurrence && editingOccurrenceDate) {
      deleteOccurrence(editingEvent.id, editingOccurrenceDate);
      pushToast({ title: "Occurrence removed" });
    } else {
      deleteEventAndOverrides(editingEvent.id);
      pushToast({ title: "Event deleted" });
    }
    closeModal();
  };

  const toggleAttendee = (id: string) => {
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id)
        ? f.attendeeIds.filter((a) => a !== id)
        : [...f.attendeeIds, id],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <h2 className="text-base font-semibold">
            {isEditing ? "Edit event" : "New event"}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Title
            </label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Add a title"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Add a description"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Location
            </label>
            <input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Add a location"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allDay"
              type="checkbox"
              checked={form.allDay}
              onChange={(e) =>
                setForm((f) => ({ ...f, allDay: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="allDay" className="text-sm">
              All day
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Start
              </label>
              <input
                type={form.allDay ? "date" : "datetime-local"}
                value={form.allDay ? form.start.slice(0, 10) : form.start}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    start: f.allDay ? `${e.target.value}T00:00` : e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                End
              </label>
              <input
                type={form.allDay ? "date" : "datetime-local"}
                value={form.allDay ? form.end.slice(0, 10) : form.end}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    end: f.allDay ? `${e.target.value}T23:59` : e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`event-color-${c} h-7 w-7 rounded-full border-2 ${
                    form.color === c
                      ? "ring-2 ring-offset-1 ring-brand-500"
                      : ""
                  }`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Reminder
            </label>
            <select
              value={form.reminderOffset}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reminderOffset: Number(e.target.value) as ReminderOffset,
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Attendees
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_ATTENDEE_POOL.map((a) => {
                const active = form.attendeeIds.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAttendee(a.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Recurrence
            </label>
            <select
              value={form.recurrenceFrequency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  recurrenceFrequency: e.target.value as RecurrenceFrequency,
                }))
              }
              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            {form.recurrenceFrequency !== "none" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Every</span>
                  <input
                    type="number"
                    min={1}
                    value={form.recurrenceInterval}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        recurrenceInterval: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                  <span className="text-gray-500 dark:text-gray-400">
                    {form.recurrenceFrequency === "daily"
                      ? "day(s)"
                      : form.recurrenceFrequency === "weekly"
                      ? "week(s)"
                      : "month(s)"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={form.recurrenceEndMode === "never"}
                      onChange={() =>
                        setForm((f) => ({ ...f, recurrenceEndMode: "never" }))
                      }
                    />
                    Never
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={form.recurrenceEndMode === "until"}
                      onChange={() =>
                        setForm((f) => ({ ...f, recurrenceEndMode: "until" }))
                      }
                    />
                    Until
                    <input
                      type="date"
                      disabled={form.recurrenceEndMode !== "until"}
                      value={form.recurrenceUntil}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recurrenceUntil: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-gray-200 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={form.recurrenceEndMode === "count"}
                      onChange={() =>
                        setForm((f) => ({ ...f, recurrenceEndMode: "count" }))
                      }
                    />
                    Count
                    <input
                      type="number"
                      min={1}
                      disabled={form.recurrenceEndMode !== "count"}
                      value={form.recurrenceCount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recurrenceCount: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-800">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                {isEditingOccurrence ? "Delete this occurrence" : "Delete event"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
