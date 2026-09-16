# Calendar Scheduler (Next.js)

A production-ready, fully client-side calendar and scheduling application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **TanStack Query**.

## Features

- **Month / Week / Day / Agenda views** with a view switcher and keyboard-friendly navigation.
- **Drag-to-create** events by click-dragging on empty grid cells in the week/day timed grid.
- **Drag-to-move and drag-to-resize** existing events directly on the grid.
- **Event detail modal**: title, description, location, color, mock attendees, reminder offset, and a full recurrence rule editor (daily/weekly/monthly, interval, "until" date or occurrence count), plus per-occurrence delete (exception) support.
- **Conflict detection**: overlapping timed events on the day/week grid are laid out side-by-side and highlighted with a red ring.
- **Mini-calendar date picker** and an **agenda sidebar** listing upcoming events for the next 14 days.
- **Local reminder simulation**: a client-side polling timer checks upcoming occurrences against their reminder offsets and raises an in-app toast the moment one is due. A guarded call to the browser `Notification` API is also attempted (no server push, no service worker required).
- **Search** across event title, description, and location from the header search box.
- **ICS import/export**: parse a `.ics` file into events, or export all events (including `RRULE`/`EXDATE`) to a downloadable `.ics` file — entirely client-side.
- **Responsive layout**: full grid views on desktop; a mobile-friendly agenda list with a floating "+" add-event button on small screens.
- **Dark mode toggle** with `prefers-color-scheme` fallback and no flash-of-wrong-theme on load.
- **Persistence**: events and UI preferences (view, dark mode) are persisted to `localStorage` via Zustand's `persist` middleware, so your data survives a page reload.

## Architecture

```
app/                     Next.js App Router route segments
  layout.tsx             Root layout, theme bootstrap script, TanStack Query provider
  page.tsx                Redirects "/" -> "/month"
  providers.tsx           TanStack QueryClientProvider
  globals.css             Tailwind base + calendar-specific utility classes
  month/page.tsx          Month view route
  week/page.tsx           Week view route
  day/page.tsx            Day view route
  agenda/page.tsx          Agenda (list) view route

components/               Shared UI
  CalendarShell.tsx        Page chrome: sidebar, header, modal, toasts, FAB
  Sidebar.tsx / MiniCalendar.tsx / AgendaList.tsx
  MonthGrid.tsx / MonthHeader.tsx
  TimedGrid.tsx            Shared week/day timed grid with drag-to-create/move/resize
  EventBlock.tsx           Small presentational event chip
  EventModal.tsx           Create/edit form incl. recurrence + attendees + reminder
  SearchBar.tsx / ViewSwitcher.tsx / DarkModeToggle.tsx
  ToastContainer.tsx / FloatingAddButton.tsx / ImportExportButtons.tsx

store/
  useEventStore.ts         Zustand store for CalendarEvent[]; persisted to localStorage.
                            Handles create/update/delete, plus recurrence-aware
                            moveOccurrence/deleteOccurrence (creates "override" child
                            events instead of mutating the recurring parent's rule).
  useUiStore.ts             Zustand store for view/selected date/search/dark mode/modal/toasts.

lib/
  types.ts                  Domain types: CalendarEvent, RecurrenceRule, EventOccurrence, ...
  dateUtils.ts               Pure date-math helpers (no external date library).
  recurrence.ts               RRULE-style occurrence expansion + human-readable description.
  conflicts.ts                Overlap detection + column layout for side-by-side rendering.
  ics.ts                      Minimal RFC 5545 .ics generator/parser (VEVENT, RRULE, EXDATE, VALARM).
  reminders.ts                Pure "which reminders just became due" scan function.
  useReminderTimer.ts          Client hook: polls reminders.ts on an interval and pushes toasts.
  seedData.ts                  Mock seed events used the first time the app is opened.
```

### Recurrence model

Recurrence is stored per-event as a small `RecurrenceRule`:

```ts
interface RecurrenceRule {
  frequency: "none" | "daily" | "weekly" | "monthly";
  interval: number;      // every N days/weeks/months
  until?: string | null; // ISO date - stop on/before this date
  count?: number | null; // stop after N occurrences
  exceptions?: string[]; // ISO dates that are skipped/deleted
}
```

`lib/recurrence.ts` expands a recurring event into concrete `EventOccurrence`s for a given date range by repeatedly advancing the start date according to `frequency`/`interval` until it either passes `until`, reaches `count`, or exits the requested range. Dates present in `exceptions` are skipped.

**Per-occurrence edits** (dragging a single instance of a recurring event, or editing/deleting just one occurrence from the modal) do **not** mutate the recurring rule. Instead:

1. The occurrence's original date is added to the parent's `recurrence.exceptions`.
2. A normal, non-recurring "override" event is created with `recurrenceParentId` pointing at the parent and `originalOccurrenceDate` set to the date it replaces.

`expandAllOccurrences` in `lib/recurrence.ts` merges these two things back together at render time: it expands the parent (with the override dates added as exceptions) and then splices in the override events at their new times. This mirrors how Google/Outlook-style calendars represent "edit this event only."

### Conflict detection

`lib/conflicts.ts` exports two pure functions used by `TimedGrid.tsx`:

- `findConflictingKeys(occurrences)` — an O(n²) pairwise overlap check (fine at calendar-app scale) that returns the set of occurrence keys involved in at least one overlap. Those events get a red `conflict-ring` outline.
- `layoutOccurrences(occurrences)` — clusters mutually-overlapping occurrences and assigns each a `{ column, totalColumns }` so overlapping events render side-by-side (like Google Calendar) instead of stacking on top of each other.

All-day events are excluded from conflict/column logic and rendered in a separate "All day" row.

### Reminder simulation

There is no backend and no service worker. Instead, `lib/useReminderTimer.ts` runs a `setInterval` (every 15s) while the app is open. On each tick it calls `findDueReminders(events, now, lastCheck)`, which expands all events in the next 14 days and checks whether `occurrenceStart - reminderOffset` falls between the previous check and now. Any newly-due reminder pushes an in-app toast (`useUiStore.pushToast`) and makes a **guarded** call to `window.Notification` (only if the API exists and permission was already granted — the app requests permission once on mount, but never assumes it, and every Notification call is wrapped so it silently no-ops in unsupported/blocked environments).

### ICS import/export

`lib/ics.ts` implements just enough of RFC 5545 for round-tripping this app's data model: `VEVENT` with `SUMMARY`/`DESCRIPTION`/`LOCATION`/`DTSTART`/`DTEND` (all-day via `VALUE=DATE`, timed via UTC `Z` timestamps), `RRULE` (`FREQ`/`INTERVAL`/`UNTIL`/`COUNT`), `EXDATE`, `ATTENDEE`, and a `VALARM` reminder block. Export builds a `Blob` and triggers a download via an anchor tag; import reads a `File` with `file.text()`, unfolds RFC 5545 continuation lines, and parses each `VEVENT` block into a `CalendarEvent`. Everything runs in the browser — no server round trip.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The app redirects to `/month` and seeds a handful of mock events (including one intentional overlap, so you can see conflict highlighting immediately).

To build for production:

```bash
npm run build
npm start
```

No environment variables, database, or backend service are required — all state lives in `localStorage` via Zustand's `persist` middleware.

## Tech stack rationale

- **Next.js 14 App Router** — file-based routing maps cleanly onto month/week/day/agenda as distinct URL-addressable views while sharing one client-rendered shell (`CalendarShell`).
- **Zustand** — minimal, hook-based state management for both the event data (`useEventStore`) and transient UI state (`useUiStore`), with built-in `localStorage` persistence and no boilerplate reducers/actions files.
- **TanStack Query** — wired up via `app/providers.tsx` (`QueryClientProvider`) so the project is ready to swap the local Zustand event store for real server-backed queries/mutations later without touching component code.
- **Tailwind CSS** — utility-first styling with a small custom `brand` color scale and `dark:` variants throughout for the dark mode toggle.
