import type { AllSlices } from '@/daw/store';
import type { StepCheck } from '../tutorials';

// ── The Loop and Repeat lesson's checks and anchors (Studio Basics 8) ──────
// Changes against the Studio as the step armed: the loop's range, how many
// clips the song has, how many tracks. A song may be the student's own, so
// nothing asks for a track or a clip by name or place.

/** Note clips and audio clips, on every track. */
export const clipCount = (s: AllSlices): number =>
  s.tracks.reduce(
    (n, track) => n + track.midiClips.length + track.audioClips.length,
    0,
  );

/** A clip was added: a Duplicate, a Paste or a Paste Here. */
export const clipAdded: StepCheck = (s, armed) =>
  clipCount(s) > clipCount(armed);

/** The loop covers other bars than it did, and still covers some. */
export const loopMoved: StepCheck = (s, armed) =>
  s.loopEnd > s.loopStart &&
  (s.loopStart !== armed.loopStart || s.loopEnd !== armed.loopEnd);

/** A track was added: Duplicate Track. */
export const trackAdded: StepCheck = (s, armed) =>
  s.tracks.length > armed.tracks.length;

/**
 * How many tracks a song can have: tracksSlice's MAX_TOTAL_TRACKS, which a
 * test keeps this equal to (the store isn't imported into lesson data).
 */
export const MOST_TRACKS = 10;

const TRACK_INDEXES = Array.from({ length: MOST_TRACKS }, (_, i) => i);

// Where a step points decides where the coach card goes: clear of the
// target, in the larger gap above or below it. Over the timeline that gap
// is the tracks under the target, which the student may need to click, so a
// step points at the bottom track (the card then sits under the tracks) or
// at the second track (whose own row stays clear to the right of its clip).
const BOTTOM_UP = [...TRACK_INDEXES].reverse();
const SECOND_FIRST = [1, 0, ...TRACK_INDEXES.slice(2)];

/** Each track's first clip, the bottom track's first: the first in view is used. */
export const BOTTOM_CLIPS = BOTTOM_UP.map((i) => `timeline-clip-${i}-0`);

/** Each track's first clip, the second track's first. */
export const SECOND_CLIPS = SECOND_FIRST.map((i) => `timeline-clip-${i}-0`);

/** Each track's row on the timeline, the second track's first. */
export const SECOND_LANES = SECOND_FIRST.map((i) => `timeline-lane-${i}`);

/** Each track's header, the second track's first. */
export const SECOND_HEADERS = SECOND_FIRST.map((i) => `track-header-${i}`);
