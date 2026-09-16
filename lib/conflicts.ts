import { EventOccurrence } from "./types";

/**
 * Given a list of occurrences (already filtered to a day/week range),
 * returns a Set of occurrence `key`s that overlap in time with at least
 * one other occurrence (excluding all-day events, which never "conflict"
 * visually on the timed grid).
 */
export function findConflictingKeys(occurrences: EventOccurrence[]): Set<string> {
  const timed = occurrences.filter((o) => !o.event.allDay);
  const conflicting = new Set<string>();

  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (a.start < b.end && b.start < a.end) {
        conflicting.add(a.key);
        conflicting.add(b.key);
      }
    }
  }

  return conflicting;
}

/**
 * Groups overlapping occurrences into "columns" for side-by-side rendering
 * on a day/week timed grid. Returns a map of occurrence key -> { column, totalColumns }.
 */
export interface LayoutInfo {
  column: number;
  totalColumns: number;
}

export function layoutOccurrences(
  occurrences: EventOccurrence[]
): Map<string, LayoutInfo> {
  const timed = [...occurrences]
    .filter((o) => !o.event.allDay)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const layout = new Map<string, LayoutInfo>();

  // Group into clusters of mutually-overlapping events.
  let clusters: EventOccurrence[][] = [];
  let currentCluster: EventOccurrence[] = [];
  let clusterEnd = -Infinity;

  for (const occ of timed) {
    if (currentCluster.length === 0 || occ.start.getTime() < clusterEnd) {
      currentCluster.push(occ);
      clusterEnd = Math.max(clusterEnd, occ.end.getTime());
    } else {
      clusters.push(currentCluster);
      currentCluster = [occ];
      clusterEnd = occ.end.getTime();
    }
  }
  if (currentCluster.length) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const columns: EventOccurrence[][] = [];
    for (const occ of cluster) {
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1];
        if (last.end.getTime() <= occ.start.getTime()) {
          col.push(occ);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([occ]);
    }
    const totalColumns = columns.length;
    columns.forEach((col, colIndex) => {
      for (const occ of col) {
        layout.set(occ.key, { column: colIndex, totalColumns });
      }
    });
  }

  return layout;
}
