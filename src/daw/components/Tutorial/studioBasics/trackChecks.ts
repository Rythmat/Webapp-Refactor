import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { trackSoundString } from '@/daw/instruments/simpleInstruments';
import type { StepCheck } from '../tutorials';

// ── Checks and targets for the track lessons ───────────────────────────────
// Your Tracks, Add a Track and Record work on any song: the course's demo
// song from a cold start, or the student's own (Hear It with Your Band's
// song, with its tracks in its own order). So a check never names a track:
// it looks for a change on any track against `armed`, the Studio as the
// student's turn began. A target names a track by its place (track 0 is
// the top), and bottomTrack points at the last one: the track Add a Track
// has just added.

/**
 * How many tracks a project can hold (MAX_TOTAL_TRACKS in tracksSlice.ts,
 * held to it by the lessons' test): the per-track anchors run from 0 to
 * one less. Kept here so the lessons don't load the store's slice.
 */
export const TRACK_SLOTS = 10;

/**
 * The bottom track's anchor of a kind (`track-mute-`, `track-instrument-`):
 * every place from the last slot up, so the first one on screen, the lowest
 * track, wins. A new track is added at the bottom.
 */
export const bottomTrack = (prefix: string): string[] =>
  Array.from(
    { length: TRACK_SLOTS },
    (_, i) => `${prefix}${TRACK_SLOTS - 1 - i}`,
  );

/**
 * A track's switches: M, S and the Arm circle on its row, and Monitor input
 * in its ⋯ menu.
 */
export type TrackSwitch = 'mute' | 'solo' | 'recordArmed' | 'monitoring';

const before = (armed: AllSlices, track: Track): Track | undefined =>
  armed.tracks.find((t) => t.id === track.id);

/**
 * The tracks seen with a switch off during a turn, by the turn's `armed`
 * snapshot (detection checks every change against the same one).
 */
const seenOff = new WeakMap<AllSlices, Map<TrackSwitch, Set<string>>>();

const offDuring = (armed: AllSlices, flag: TrackSwitch): Set<string> => {
  let byFlag = seenOff.get(armed);
  if (!byFlag) seenOff.set(armed, (byFlag = new Map()));
  let ids = byFlag.get(flag);
  if (!ids) byFlag.set(flag, (ids = new Set()));
  return ids;
};

/**
 * Some track's switch was switched on since the turn began: it was off
 * then, or it was on and has gone off and on again (a song where the
 * highlighted track is armed already, as on a second run of the course).
 */
export const switchedOn =
  (flag: TrackSwitch): StepCheck =>
  (s, armed) => {
    const off = offDuring(armed, flag);
    return s.tracks.some((t) => {
      const was = before(armed, t)?.[flag];
      if (was === undefined) return false;
      if (!t[flag]) {
        off.add(t.id);
        return false;
      }
      return was === false || off.has(t.id);
    });
  };

/**
 * Some track's switch went from on to off since the turn began, or none was
 * on then (nothing to turn off, so the student isn't held up).
 */
export const switchedOff =
  (flag: TrackSwitch): StepCheck =>
  (s, armed) =>
    !armed.tracks.some((t) => t[flag]) ||
    s.tracks.some((t) => !t[flag] && before(armed, t)?.[flag] === true);

/**
 * Another track is selected than when the turn began. A song with one track
 * has nothing else to select, so it passes.
 */
export const selectedAnotherTrack: StepCheck = (s, armed) =>
  s.tracks.length < 2 ||
  (s.selectedTrackId !== null && s.selectedTrackId !== armed.selectedTrackId);

/** Some track plays another instrument than when the turn began. */
export const instrumentChanged: StepCheck = (s, armed) =>
  s.tracks.some((t) => {
    const was = before(armed, t);
    return !!was && trackSoundString(was) !== trackSoundString(t);
  });

/** A track was added since the turn began. */
export const trackAdded: StepCheck = (s, armed) =>
  s.tracks.length > armed.tracks.length;

/** The selected track, if any. */
export const selectedTrack = (s: AllSlices): Track | undefined =>
  s.tracks.find((t) => t.id === s.selectedTrackId);

/**
 * The track a take records onto: the first armed instrument (MIDI) track,
 * top down, as the recorder picks it (midi/liveTarget.ts). Null when none is
 * armed.
 */
export const recordTrackId = (s: AllSlices): string | null =>
  s.tracks.find((t) => t.recordArmed && t.type === 'midi')?.id ?? null;
