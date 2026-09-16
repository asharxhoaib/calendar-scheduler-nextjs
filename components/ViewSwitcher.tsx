"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useUiStore } from "@/store/useUiStore";
import { CalendarViewType } from "@/lib/types";

const VIEWS: { key: CalendarViewType; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "agenda", label: "Agenda" },
];

export default function ViewSwitcher() {
  const router = useRouter();
  const view = useUiStore((s) => s.view);

  return (
    <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => router.push(`/${v.key}`)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            view === v.key
              ? "bg-white text-brand-700 shadow-soft dark:bg-gray-700 dark:text-brand-200"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
