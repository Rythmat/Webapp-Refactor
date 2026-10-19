import type { AllSlices } from '@/daw/store';
import type { StepCheck } from '../tutorials';
import { recordTrackId, selectedTrack } from './trackChecks';

// ── Checks for the Record lesson ───────────────────────────────────────────
// A take records onto the first armed instrument track (recordTrackId), and
// the notes the student plays sound on the tracks with MON on, else on the
// selected one (midi/liveNotes.ts). So the lesson has the student choose
// one track (select it), arm it with no armed track above it, and turn its
// MON on; then it watches for live notes and for the take's new clip.

/** The selected track is the one a take would record onto. */
export const recordsOnSelectedTrack: StepCheck = (s) =>
  s.selectedTrackId !== null && recordTrackId(s) === s.selectedTrackId;

/** The selected track has MON on. */
export const selectedTrackMonitored: StepCheck = (s) =>
  selectedTrack(s)?.monitoring === true;

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
 * The take is over and kept: recording has stopped, and a clip with notes
 * is on a track that wasn't there when the turn began.
 */
export const takeKept: StepCheck = (s, armed) => {
  if (s.isRecording || s.isCountingIn) return false;
  const had = clipIds(armed);
  return s.tracks.some((t) =>
    t.midiClips.some((c) => !had.has(c.id) && c.events.length > 0),
  );
};
