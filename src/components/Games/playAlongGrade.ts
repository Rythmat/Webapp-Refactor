/**
 * Grading for a play-along run. A target note counts as hit when the player
 * pressed its pitch inside the note's activation window (PlayAlong records
 * that as a performance `startTick`). Wrong notes are shown on the roll but
 * don't count against the score, so exploring the keyboard isn't punished —
 * what gates a pass is how many of the written notes were actually played.
 */

/** Share of target notes that must be hit to pass. */
export const PLAY_ALONG_PASS_RATIO = 0.8;

export interface PlayAlongResult {
  /** Target notes played in their window. */
  hits: number;
  /** Target notes in the activity. */
  total: number;
  /** Hits needed to pass. */
  required: number;
  /** Pitches played that weren't targets; shown, but not scored. */
  wrongNotes: number;
  passed: boolean;
}

export function gradePlayAlong(
  events: readonly { id: string }[],
  performance: Readonly<Record<string, { startTick?: number | null }>>,
  wrongNotes = 0,
): PlayAlongResult {
  const total = events.length;
  const hits = events.filter(
    (event) => performance[event.id]?.startTick != null,
  ).length;
  const required = Math.ceil(total * PLAY_ALONG_PASS_RATIO);
  return {
    hits,
    total,
    required,
    wrongNotes,
    passed: total > 0 && hits >= required,
  };
}
