import { useStore, type AllSlices } from '@/daw/store';

// ── Where live notes and takes go (milestone 1.15) ─────────────────────────
//
// The practice screen plays one track, the student's: while it shows, live
// notes sound on that track and takes land there, whatever the Studio has
// armed, monitored or selected since (practice-tutorial-11). Elsewhere a take
// records onto the first record-armed MIDI track, and notes sound on the
// monitored tracks (liveNotes.liveMidiTargets). Kept apart from liveNotes,
// which reaches the instruments, so the take recorder can ask without
// loading them.

let practiceTrackId: string | null = null;

/**
 * The practice screen's student track while the screen shows; null when it
 * goes.
 */
export function setPracticeLiveTrack(trackId: string | null): void {
  practiceTrackId = trackId;
}

/** The practice screen's track, while it shows and is a MIDI track. */
export function practiceLiveTrackId(
  state: AllSlices = useStore.getState(),
): string | null {
  if (practiceTrackId === null) return null;
  return state.tracks.some((t) => t.id === practiceTrackId && t.type === 'midi')
    ? practiceTrackId
    : null;
}

/**
 * The MIDI track a take records onto: the practice screen's while it shows,
 * else the first record-armed MIDI track. Null when there is none.
 */
export function recordTargetTrackId(
  state: AllSlices = useStore.getState(),
): string | null {
  return (
    practiceLiveTrackId(state) ??
    state.tracks.find((t) => t.recordArmed && t.type === 'midi')?.id ??
    null
  );
}
