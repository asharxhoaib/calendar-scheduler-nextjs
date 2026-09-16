"use client";

import clsx from "clsx";
import { EventColor } from "@/lib/types";

interface EventBlockProps {
  title: string;
  color: EventColor;
  subtitle?: string;
  location?: string;
  conflict?: boolean;
  compact?: boolean;
}

export default function EventBlock({
  title,
  color,
  subtitle,
  location,
  conflict,
  compact,
}: EventBlockProps) {
  return (
    <div
      className={clsx(
        "rounded-md border px-2 py-1 text-left",
        `event-color-${color}`,
        conflict && "conflict-ring",
        compact ? "text-[11px] leading-tight" : "text-xs"
      )}
    >
      <div className="truncate font-medium">{title}</div>
      {subtitle && !compact && (
        <div className="truncate text-[11px] opacity-80">{subtitle}</div>
      )}
      {location && !compact && (
        <div className="truncate text-[11px] opacity-70">{location}</div>
      )}
    </div>
  );
}
