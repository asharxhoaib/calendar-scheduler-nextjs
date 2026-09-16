"use client";

import { useRef } from "react";
import { useEventStore } from "@/store/useEventStore";
import { useUiStore } from "@/store/useUiStore";
import { downloadICSFile, generateICS, parseICS } from "@/lib/ics";

export default function ImportExportButtons() {
  const events = useEventStore((s) => s.events);
  const importEvents = useEventStore((s) => s.importEvents);
  const pushToast = useUiStore((s) => s.pushToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const ics = generateICS(events);
    downloadICSFile("calendar-export.ics", ics);
    pushToast({ title: "Calendar exported", body: `${events.length} events written to calendar-export.ics` });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseICS(text);
      if (parsed.length === 0) {
        pushToast({ title: "No events found", body: "The .ics file did not contain any parsable VEVENTs." });
      } else {
        importEvents(parsed);
        pushToast({ title: "Calendar imported", body: `${parsed.length} events added.` });
      }
    } catch (err) {
      pushToast({ title: "Import failed", body: "Could not parse the selected file." });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleImportClick}
        className="hidden rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:inline-block"
        title="Import .ics file"
      >
        Import
      </button>
      <button
        onClick={handleExport}
        className="hidden rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:inline-block"
        title="Export .ics file"
      >
        Export
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
