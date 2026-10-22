import type { AllSlices } from '@/daw/store';
import type { StepCheck } from '../tutorials';

// ── Checks for the Insight lesson ──────────────────────────────────────────
// Insight's Analyze Tracks buttons (Library/TrackNotePicks.tsx) put a
// track's notes in the note selection (selectedNotes, one entry per clip),
// and Analyze sets selectionAnalysis. The lesson counts the tracks picked,
// whichever they are, and watches for a new analysis.

/** The tracks with notes in the selection. */
export const pickedTracks = (s: AllSlices): number =>
  new Set(
    s.selectedNotes
      .filter((pick) => pick.noteIndices.length > 0)
      .map((pick) => pick.trackId),
  ).size;

/** The tracks Insight offers a button for: instrument tracks with notes. */
export const pickableTracks = (s: AllSlices): number =>
  s.tracks.filter(
    (t) =>
      t.type === 'midi' &&
      t.instrument !== 'drum-machine' &&
      t.midiClips.some((c) => c.events.length > 0),
  ).length;

/** The Inspector is open on Insight (the side rail's light bulb). */
export const insightOpen: StepCheck = (s) =>
  s.libraryOpen && s.inspectorPanel === 'insight';

/** One more track is picked than when the turn began. */
export const trackPicked: StepCheck = (s, armed) =>
  pickedTracks(s) > pickedTracks(armed);

/**
 * One more track is picked, or every track Insight offers already is (a song
 * with a single instrument track has no second one to add).
 */
export const anotherTrackPicked: StepCheck = (s, armed) =>
  trackPicked(s, armed) ||
  (pickedTracks(s) > 0 && pickedTracks(s) >= pickableTracks(s));

/** Analyze has run on the selection since the turn began. */
export const analyzed: StepCheck = (s, armed) =>
  s.selectionAnalysis !== null &&
  s.selectionAnalysis !== armed.selectionAnalysis;
