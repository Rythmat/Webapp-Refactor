import { monitorsInput } from '@/daw/model/monitoring';
import { useStore, type AllSlices } from '@/daw/store';

// ── Where live notes and takes go (milestone 1.15) ─────────────────────────
//
// The practice screen plays one track, the student's: while it shows, live
// notes sound on that track and takes land there, whatever the Studio has
// armed, monitored or selected since (practice-tutorial-11). Elsewhere a take
// records onto the first record-armed MIDI track, and notes sound on the
// tracks monitoring their input: armed and monitoring (model/monitoring,
// the record button's middle state). Nothing else hears them, the selected
// track neither (owner, 2026-10-22: a selected track played whatever its
// monitoring said): a MIDI device's notes and the computer keyboard's alike
// (liveNotes.liveMidiTargets). Clicking the dock's own keys and pads plays
// their track directly (auditionNote), not through here.
// Kept apart from liveNotes,
// which reaches the instruments, so the take recorder can ask without
// loading them.
//
// A note from a MIDI device (`source`, its input id) only reaches a track
// listening to that device or to All Devices (the track's midiInputId, set
// from the ▾ in its header, 2026-10-21). The computer keyboard and the
// on-screen keys have no source and reach every target.

/**
 * Whether a track hears notes from `source` (no source: every track does).
 * A track this state doesn't hold has no input set: it hears everything.
 */
export function trackHearsInput(
  track: { midiInputId: string | null } | undefined,
  source?: string | null,
): boolean {
  return !source || !track?.midiInputId || track.midiInputId === source;
}

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
  source?: string | null,
): string | null {
  const practice = practiceLiveTrackId(state);
  if (practice !== null) return practice;
  const armed = state.tracks.find((t) => t.recordArmed && t.type === 'midi');
  // The armed track takes only its own device's notes into the take.
  return armed && trackHearsInput(armed, source) ? armed.id : null;
}

/**
 * Track ids live MIDI drives: the practice screen's track, else the MIDI
 * tracks monitoring their input (armed and monitoring); none while no
 * track does.
 */
export function liveMidiTargetIds(
  state: AllSlices = useStore.getState(),
  source?: string | null,
): string[] {
  const practice = practiceLiveTrackId(state);
  if (practice !== null) return [practice];
  const hears = (id: string) =>
    trackHearsInput(
      state.tracks.find((t) => t.id === id),
      source,
    );
  const monitored = state.tracks
    .filter((t) => monitorsInput(t) && t.type === 'midi')
    .map((t) => t.id);
  return monitored.filter(hears);
}

/**
 * Whether every track live notes go to is a drum kit: the computer
 * keyboard then plays the kit (DRUM_TYPING_OCTAVE), whatever its octave.
 */
export function liveTargetsAreDrums(
  state: AllSlices = useStore.getState(),
): boolean {
  const ids = liveMidiTargetIds(state);
  return (
    ids.length > 0 &&
    ids.every(
      (id) =>
        state.tracks.find((t) => t.id === id)?.instrument === 'drum-machine',
    )
  );
}
