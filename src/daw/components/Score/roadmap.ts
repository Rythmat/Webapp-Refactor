import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';

// ── Roadmap edits ──────────────────────────────────────────────────────────
// Section marks, repeats and system breaks belong to the song, not to one
// view, so they live in the state the lead sheet already keeps and show up in
// both. A barline is addressed by the measure it precedes: barline 2 is the
// one between measures 1 and 2, and barline `measureCount` closes the piece.

/**
 * The next rehearsal letter, lettered as MuseScore does: A … Z, then the
 * doubled letters AA … ZZ. Letters already in use are skipped.
 */
export function nextSectionLabel(sections: LeadSheetSection[]): string {
  const used = new Set(sections.map((s) => s.label));
  for (let i = 0; i < 52; i++) {
    const letter = String.fromCharCode(65 + (i % 26));
    const label = i < 26 ? letter : letter + letter;
    if (!used.has(label)) return label;
  }
  return String(used.size + 1);
}

/**
 * Where systems break now. Without custom row sizes the score falls into even
 * rows of `measuresPerLine`, so those are the breaks a first edit starts from.
 */
export function breaksFromRowSizes(
  rowSizes: number[] | null,
  measuresPerLine: number,
  measureCount: number,
): Set<number> {
  const breaks = new Set<number>();
  let at = 0;
  if (rowSizes && rowSizes.length > 0) {
    for (const size of rowSizes) {
      at += size;
      if (at >= measureCount) return breaks;
      breaks.add(at);
    }
  }
  const step = Math.max(1, measuresPerLine);
  for (let next = at + step; next < measureCount; next += step) {
    breaks.add(next);
  }
  return breaks;
}

/** Row sizes for a set of breaks, the shape the lead sheet stores. */
export function rowSizesFromBreaks(
  breaks: ReadonlySet<number>,
  measureCount: number,
): number[] {
  const sizes: number[] = [];
  let start = 0;
  for (const at of [...breaks].sort((a, b) => a - b)) {
    if (at <= start || at >= measureCount) continue;
    sizes.push(at - start);
    start = at;
  }
  if (start < measureCount) sizes.push(measureCount - start);
  return sizes;
}

/** Measures that open a repeat. */
export function repeatStartSet(repeats: LeadSheetRepeat[]): Set<number> {
  return new Set(repeats.map((r) => r.startMeasure));
}

/** Measures whose closing barline ends a repeat. */
export function repeatEndSet(repeats: LeadSheetRepeat[]): Set<number> {
  return new Set(repeats.map((r) => r.endMeasure));
}

/**
 * Open a repeat at `barline`. It runs to just before the next repeat, or to
 * the end of the piece, until an end repeat trims it.
 */
export function withRepeatStart(
  repeats: LeadSheetRepeat[],
  barline: number,
  measureCount: number,
): LeadSheetRepeat[] {
  if (repeats.some((r) => r.startMeasure === barline)) return repeats;
  const nextStart = repeats
    .map((r) => r.startMeasure)
    .filter((m) => m > barline)
    .sort((a, b) => a - b)[0];
  const end = (nextStart ?? measureCount) - 1;
  // A repeat already running through here ends where this one opens.
  const trimmed = repeats.map((r) =>
    r.startMeasure < barline && r.endMeasure >= barline
      ? { ...r, endMeasure: barline - 1 }
      : r,
  );
  return [
    ...trimmed,
    { startMeasure: barline, endMeasure: Math.max(barline, end) },
  ].sort((a, b) => a.startMeasure - b.startMeasure);
}

/**
 * Close a repeat at `barline` — the bar before it is the last one repeated.
 * It trims the open repeat it belongs to, or starts one from the top.
 */
export function withRepeatEnd(
  repeats: LeadSheetRepeat[],
  barline: number,
): LeadSheetRepeat[] {
  const last = barline - 1;
  if (last < 0) return repeats;
  const owner = repeats
    .filter((r) => r.startMeasure <= last)
    .sort((a, b) => b.startMeasure - a.startMeasure)[0];
  if (!owner) return [...repeats, { startMeasure: 0, endMeasure: last }];
  return repeats.map((r) =>
    r.startMeasure === owner.startMeasure ? { ...r, endMeasure: last } : r,
  );
}

/** Clear any repeat that opens or closes at `barline`. */
export function withoutRepeatAt(
  repeats: LeadSheetRepeat[],
  barline: number,
): LeadSheetRepeat[] {
  return repeats.filter(
    (r) => r.startMeasure !== barline && r.endMeasure !== barline - 1,
  );
}

/** True when a repeat opens or closes at this barline. */
export function hasRepeatAt(
  repeats: LeadSheetRepeat[],
  barline: number,
): boolean {
  return repeats.some(
    (r) => r.startMeasure === barline || r.endMeasure === barline - 1,
  );
}
