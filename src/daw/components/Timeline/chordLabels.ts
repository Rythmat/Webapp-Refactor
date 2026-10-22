import { pixelsPerBeat } from '@/daw/utils/timelineScale';

// ── The chord ruler's names, at every zoom ─────────────────────────────────
//
// Zoomed far out, the chord ruler's names ran into each other (owner,
// 2026-10-22). Two rules keep them apart: past a zoom the names go
// altogether, the coloured chords staying; above it, a name shows only
// where it fits inside its own chord, so a short chord never writes over the
// next.

/** Below this many px a beat, the ruler shows no chord names (zoom < 30%). */
export const CHORD_LABELS_MIN_PX_PER_BEAT = 12;

/** The gap before a name, from its chord's left edge (and kept after it). */
export const CHORD_LABEL_INSET_PX = 6;

/** Whether the ruler shows chord names at all at `zoom`. */
export function chordLabelsShown(zoom: number): boolean {
  return pixelsPerBeat(zoom) >= CHORD_LABELS_MIN_PX_PER_BEAT;
}

/**
 * The label a chord shows, as "Chords read as" picks it: its note name
 * (`noteName`, "D min7") with names on, else its degree (`name`, "2 min7").
 * They were the other way round, so Numbers showed names (owner,
 * 2026-10-22).
 */
export function chordRulerLabel(
  region: { name: string; noteName: string },
  showNotes: boolean,
): string {
  return showNotes ? region.noteName : region.name;
}

/** Whether a name `labelPx` wide fits its chord, `regionPx` wide. */
export function chordLabelFits(labelPx: number, regionPx: number): boolean {
  return labelPx + 2 * CHORD_LABEL_INSET_PX <= regionPx;
}
