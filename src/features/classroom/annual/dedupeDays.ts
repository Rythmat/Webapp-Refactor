interface DayLike {
  id: string;
  scheduledDate?: string | null;
  label: string;
}

/**
 * Given day entries in render order, return the set of ids that duplicate an
 * earlier entry — same `scheduledDate` AND same `label`. The first occurrence
 * per (date, label) is kept; later ones are flagged. Unscheduled Days (no
 * `scheduledDate`) are never flagged.
 *
 * Used to collapse accidental duplicate Lesson records — e.g. old Days that
 * get re-adopted onto their original dates after a "Reset to template" — so
 * they render, and count, once on the calendar. Same date + same label is a
 * genuine accidental duplicate; two intentionally distinct lessons on one day
 * carry different labels and are left untouched.
 */
export const duplicateDayIds = (entries: DayLike[]): Set<string> => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (!entry.scheduledDate) continue;
    const signature = `${entry.scheduledDate}|${entry.label}`;
    if (seen.has(signature)) duplicates.add(entry.id);
    else seen.add(signature);
  }
  return duplicates;
};
