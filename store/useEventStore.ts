import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { CalendarEvent } from "@/lib/types";
import { buildSeedEvents } from "@/lib/seedData";

interface EventStoreState {
  events: CalendarEvent[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  deleteEventAndOverrides: (id: string) => void;

  /** Move/resize a single occurrence. For recurring parents, creates an override child event. */
  moveOccurrence: (
    eventId: string,
    occurrenceDateISO: string,
    newStart: Date,
    newEnd: Date
  ) => void;

  /** Delete just one occurrence of a recurring event (adds an exception). */
  deleteOccurrence: (eventId: string, occurrenceDateISO: string) => void;

  importEvents: (events: CalendarEvent[]) => void;
  replaceAll: (events: CalendarEvent[]) => void;
  resetToSeed: () => void;
}

export const useEventStore = create<EventStoreState>()(
  persist(
    (set, get) => ({
      events: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addEvent: (eventInput) => {
        const now = new Date().toISOString();
        const newEvent: CalendarEvent = {
          ...eventInput,
          id: uuid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ events: [...state.events, newEvent] }));
        return newEvent;
      },

      updateEvent: (id, patch) => {
        set((state) => ({
          events: state.events.map((ev) =>
            ev.id === id
              ? { ...ev, ...patch, updatedAt: new Date().toISOString() }
              : ev
          ),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((ev) => ev.id !== id),
        }));
      },

      deleteEventAndOverrides: (id) => {
        set((state) => ({
          events: state.events.filter(
            (ev) => ev.id !== id && ev.recurrenceParentId !== id
          ),
        }));
      },

      moveOccurrence: (eventId, occurrenceDateISO, newStart, newEnd) => {
        const parent = get().events.find((ev) => ev.id === eventId);
        if (!parent) return;

        const isRecurring = Boolean(
          parent.recurrence && parent.recurrence.frequency !== "none"
        );

        if (!isRecurring) {
          get().updateEvent(eventId, {
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
          });
          return;
        }

        // Recurring: check if an override already exists for this occurrence date.
        const existingOverride = get().events.find(
          (ev) =>
            ev.recurrenceParentId === eventId &&
            ev.originalOccurrenceDate === occurrenceDateISO
        );

        if (existingOverride) {
          get().updateEvent(existingOverride.id, {
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
          });
          return;
        }

        const now = new Date().toISOString();
        const overrideEvent: CalendarEvent = {
          ...parent,
          id: uuid(),
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          recurrence: null,
          recurrenceParentId: eventId,
          originalOccurrenceDate: occurrenceDateISO,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          events: [
            ...state.events.map((ev) =>
              ev.id === eventId
                ? {
                    ...ev,
                    recurrence: ev.recurrence
                      ? {
                          ...ev.recurrence,
                          exceptions: [
                            ...(ev.recurrence.exceptions ?? []),
                            occurrenceDateISO,
                          ],
                        }
                      : ev.recurrence,
                  }
                : ev
            ),
            overrideEvent,
          ],
        }));
      },

      deleteOccurrence: (eventId, occurrenceDateISO) => {
        const parent = get().events.find((ev) => ev.id === eventId);
        if (!parent) return;

        // Remove any override for this date, and add an exception on the parent.
        set((state) => ({
          events: state.events
            .filter(
              (ev) =>
                !(
                  ev.recurrenceParentId === eventId &&
                  ev.originalOccurrenceDate === occurrenceDateISO
                )
            )
            .map((ev) =>
              ev.id === eventId && ev.recurrence
                ? {
                    ...ev,
                    recurrence: {
                      ...ev.recurrence,
                      exceptions: [
                        ...(ev.recurrence.exceptions ?? []),
                        occurrenceDateISO,
                      ],
                    },
                  }
                : ev
            ),
        }));
      },

      importEvents: (imported) => {
        set((state) => ({ events: [...state.events, ...imported] }));
      },

      replaceAll: (events) => set({ events }),

      resetToSeed: () => set({ events: buildSeedEvents() }),
    }),
    {
      name: "calendar-scheduler-events",
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.events || state.events.length === 0) {
            state.events = buildSeedEvents();
          }
          state.setHasHydrated(true);
        }
      },
    }
  )
);
