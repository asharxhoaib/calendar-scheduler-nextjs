"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/useUiStore";

function Toast({ id, title, body }: { id: string; title: string; body?: string }) {
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(id), 6000);
    return () => clearTimeout(timer);
  }, [id, dismissToast]);

  return (
    <div className="animate-toast-in w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-soft dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {body && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{body}</p>}
        </div>
        <button
          onClick={() => dismissToast(id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast id={t.id} title={t.title} body={t.body} />
        </div>
      ))}
    </div>
  );
}
