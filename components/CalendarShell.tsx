"use client";

import { useEffect } from "react";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import { useReminderTimer } from "@/lib/useReminderTimer";
import Sidebar from "./Sidebar";
import ViewSwitcher from "./ViewSwitcher";
import SearchBar from "./SearchBar";
import DarkModeToggle from "./DarkModeToggle";
import EventModal from "./EventModal";
import ToastContainer from "./ToastContainer";
import FloatingAddButton from "./FloatingAddButton";
import ImportExportButtons from "./ImportExportButtons";
import { CalendarViewType } from "@/lib/types";

interface CalendarShellProps {
  activeView: CalendarViewType;
  children: React.ReactNode;
}

export default function CalendarShell({
  activeView,
  children,
}: CalendarShellProps) {
  const hasHydrated = useEventStore((s) => s.hasHydrated);
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const setView = useUiStore((s) => s.setView);
  const openCreateModal = useUiStore((s) => s.openCreateModal);

  useReminderTimer();

  useEffect(() => {
    setView(activeView);
  }, [activeView, setView]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const handleQuickAdd = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    openCreateModal(start, end);
  };

  if (!hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading calendar…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Calendar</h1>
            <ViewSwitcher />
          </div>
          <div className="flex flex-1 items-center gap-3 sm:justify-end">
            <SearchBar />
            <ImportExportButtons />
            <DarkModeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      <EventModal />
      <ToastContainer />
      <FloatingAddButton onClick={handleQuickAdd} />
    </div>
  );
}
