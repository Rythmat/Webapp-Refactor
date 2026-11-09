import type { AllSlices } from '@/daw/store';
import type { StepCheck } from '../tutorials';
import { recordTrackId, selectedTrack } from './trackChecks';

// ── Checks for the Record lesson ───────────────────────────────────────────
// A take records onto the first armed instrument track (recordTrackId), and
// the notes the student plays sound on every track with Monitor input on,
// else on the chosen one (midi/liveTarget.ts). Your Tracks and Add a Track
// leave Arm and Monitor input on for the tracks they teach them on, so the
// lesson has the student choose one track (select it), make it the only
// armed one, and make it the only one with Monitor input on; then it
// watches for live notes and for the take's new clip.

/**
 * The chosen track is armed and no other track is: the take goes there and
 * nowhere else.
 */
export const armedOnlyOnSelected: StepCheck = (s) => {
  const chosen = selectedTrack(s);
  return (
    !!chosen &&
    chosen.type === 'midi' &&
    chosen.recordArmed &&
    s.tracks.every((t) => t.id === chosen.id || !t.recordArmed)
  );
};

/**
 * The track the take records onto has Monitor input on, and no other
 * instrument track has: what the student plays sounds on that track only.
 */
export const monitorOnlyOnRecordTrack: StepCheck = (s) => {
  const target = recordTrackId(s);
  if (target === null) return false;
  return s.tracks.every(
    (t) => t.type !== 'midi' || t.monitoring === (t.id === target),
  );
};

/**
 * A note was played live since the turn began: from the computer keyboard
 * (Typing) or a MIDI keyboard, both of which light hwActiveNotes.
 */
export const playedLive: StepCheck = (s, armed) =>
  s.hwActiveNotes.size > 0 && s.hwActiveNotes !== armed.hwActiveNotes;

/** A take has started: counting in, or recording. */
export const takeStarted: StepCheck = (s) => s.isRecording || s.isCountingIn;

const clipIds = (s: AllSlices): Set<string> =>
  new Set(s.tracks.flatMap((t) => t.midiClips.map((c) => c.id)));

/**
 * The take is over and kept: recording has stopped, and some track has a
 * clip with notes that wasn't there when the turn began.
 */
export const takeKept: StepCheck = (s, armed) => {
  if (s.isRecording || s.isCountingIn) return false;
  const had = clipIds(armed);
  return s.tracks.some((t) =>
    t.midiClips.some((c) => !had.has(c.id) && c.events.length > 0),
  );
};
