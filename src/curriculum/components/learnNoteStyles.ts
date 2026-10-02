import type { NoteStyle } from '@/components/notation/StaffView';
import type { NoteEvent, NoteHoldMeta } from './GenrePianoRoll';

// ── Learn: lesson progress colours on a drawn score ────────────────────────
// What the roll shows as it runs, as styles by note id: a note played (in
// time) or completed (out of time) takes its own colour; the note to play now
// glows in the highlight. Shared by the staff and the TAB so both read alike.

const ACCENT = '#7ecfcf';

export interface LearnNoteStyleState {
  inTime: boolean;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  playheadTick: number;
  keyColor?: string;
  /**
   * In time, the style for a note the playhead has passed without it being
   * played (guitar TAB: white/30 after a take). Used as given. Omitted, such
   * a note keeps its unstyled look, as the staff draws it.
   */
  missed?: NoteStyle;
}

export function learnNoteStyles(
  events: readonly NoteEvent[],
  {
    inTime,
    performanceMeta,
    noteHoldMeta,
    playheadTick,
    keyColor,
    missed,
  }: LearnNoteStyleState,
): Map<string, NoteStyle> {
  const styles = new Map<string, NoteStyle>();
  const highlight = keyColor ?? ACCENT;
  for (const e of events) {
    const done = e.color ?? highlight;
    if (inTime) {
      const perf = performanceMeta?.[e.id];
      const end = e.startTicks + e.durationTicks;
      const played =
        !!perf && perf.startTick >= e.startTicks && perf.startTick <= end;
      if (played) styles.set(e.id, { color: done });
      else if (playheadTick >= e.startTicks && playheadTick <= end) {
        styles.set(e.id, { color: highlight, glow: true });
      } else if (missed && playheadTick > end) {
        styles.set(e.id, missed);
      }
    } else {
      const meta = noteHoldMeta?.[e.id];
      if (meta?.isCompleted) styles.set(e.id, { color: done });
      else if (meta?.isCurrentChord) {
        styles.set(e.id, { color: highlight, glow: true });
      }
    }
  }
  return styles;
}
