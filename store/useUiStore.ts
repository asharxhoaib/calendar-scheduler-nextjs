import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CalendarViewType, ToastMessage } from "@/lib/types";

interface UiStoreState {
  view: CalendarViewType;
  setView: (view: CalendarViewType) => void;

  selectedDate: string; // ISO date (yyyy-mm-dd) that anchors the current view
  setSelectedDate: (isoDate: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;

  isModalOpen: boolean;
  editingEventId: string | null;
  editingOccurrenceDate: string | null;
  draftEvent: {
    start: string;
    end: string;
    allDay?: boolean;
  } | null;
  openCreateModal: (start: Date, end: Date, allDay?: boolean) => void;
  openEditModal: (eventId: string, occurrenceDate?: string | null) => void;
  closeModal: () => void;

  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set) => ({
      view: "month",
      setView: (view) => set({ view }),

      selectedDate: new Date().toISOString().slice(0, 10),
      setSelectedDate: (isoDate) => set({ selectedDate: isoDate }),

      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),

      isDarkMode: false,
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (v) => set({ isDarkMode: v }),

      isModalOpen: false,
      editingEventId: null,
      editingOccurrenceDate: null,
      draftEvent: null,

      openCreateModal: (start, end, allDay) =>
        set({
          isModalOpen: true,
          editingEventId: null,
          editingOccurrenceDate: null,
          draftEvent: {
            start: start.toISOString(),
            end: end.toISOString(),
            allDay,
          },
        }),

      openEditModal: (eventId, occurrenceDate) =>
        set({
          isModalOpen: true,
          editingEventId: eventId,
          editingOccurrenceDate: occurrenceDate ?? null,
          draftEvent: null,
        }),

      closeModal: () =>
        set({
          isModalOpen: false,
          editingEventId: null,
          editingOccurrenceDate: null,
          draftEvent: null,
        }),

      toasts: [],
      pushToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
          ],
        })),
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "calendar-scheduler-ui",
      partialize: (state) => ({
        view: state.view,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);
