"use client";

import { useState } from "react";
import { useUiStore } from "@/store/useUiStore";
import { useEventStore } from "@/store/useEventStore";

export default function SearchBar() {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const openEditModal = useUiStore((s) => s.openEditModal);
  const events = useEventStore((s) => s.events);
  const [focused, setFocused] = useState(false);

  const results =
    searchQuery.trim().length > 0
      ? events
          .filter((ev) => {
            const q = searchQuery.toLowerCase();
            return (
              ev.title.toLowerCase().includes(q) ||
              ev.description.toLowerCase().includes(q) ||
              ev.location.toLowerCase().includes(q)
            );
          })
          .slice(0, 8)
      : [];

  return (
    <div className="relative w-full max-w-xs">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search events…"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      {focused && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-800">
          {results.map((ev) => (
            <button
              key={ev.id}
              onClick={() => {
                openEditModal(ev.id);
                setSearchQuery("");
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="font-medium">{ev.title}</span>
              {ev.location && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {ev.location}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {focused && searchQuery.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-soft dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No matching events
        </div>
      )}
    </div>
  );
}
