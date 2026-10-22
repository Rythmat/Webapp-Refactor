import type { MidiNoteEvent } from '@prism/engine';
import { dockKindOf } from '@/daw/shell/dock/dockTabs';
import type { AllSlices } from '@/daw/store';
import type { ChannelStripTabId } from '@/daw/store/uiSlice';
import type { DemoRun, StepCheck } from '../tutorials';

// ── Checks for the Piano Roll lesson ───────────────────────────────────────
// Since Stage B the Piano Roll is the dock's Notes tab on a melodic track
// (the modal window is gone): it is open while the dock shows that tab for
// the selected track, on the selected clip. Outside a lesson a click on a
// clip opens Notes by itself; during a lesson the clip and its track are
// chosen but the dock keeps its tab (shell/dock/dockSelection.ts, so a
// lesson step's tab stays put), so the lesson opens Notes with its tab.
//
// The roll edits a clip's notes in the store, so each editing step's check
// reads the notes of every clip: one more, one fewer, or one that moved or
// changed length (every stored note has an id). Any clip on any track
// counts.

/** Every note in the song, on every instrument track. */
const notesOf = (s: AllSlices): MidiNoteEvent[] =>
  s.tracks.flatMap((t) => t.midiClips.flatMap((c) => c.events));

const noteCount = (s: AllSlices): number =>
  s.tracks.reduce(
    (n, t) => n + t.midiClips.reduce((m, c) => m + c.events.length, 0),
    0,
  );

/** The notes the song had when the turn began, by id. */
const notesById = (s: AllSlices): Map<string, MidiNoteEvent> => {
  const out = new Map<string, MidiNoteEvent>();
  for (const note of notesOf(s)) if (note.id) out.set(note.id, note);
  return out;
};

/** Some note that was there when the turn began has changed `how`. */
const someNoteChanged =
  (how: (now: MidiNoteEvent, was: MidiNoteEvent) => boolean): StepCheck =>
  (s, armed) => {
    if (s.tracks === armed.tracks) return false;
    const before = notesById(armed);
    return notesOf(s).some((note) => {
      const was = note.id ? before.get(note.id) : undefined;
      return !!was && how(note, was);
    });
  };

/** The dock shows the Notes tab of a melodic track: the Piano Roll. */
const notesTabShowing = (s: AllSlices): boolean => {
  if (s.dockMaster || s.channelStripTab !== 'piano-roll') return false;
  const track = s.tracks.find((t) => t.id === s.selectedTrackId);
  return dockKindOf(track) === 'melodic';
};

/**
 * A clip with notes on a melodic track has been chosen since the turn
 * began (a click on it chooses it and its track). A drum clip doesn't
 * count: its notes open in the drum grid.
 */
export const clipChosen: StepCheck = (s, armed) => {
  if (s.selectedClipId === null || s.selectedClipId === armed.selectedClipId) {
    return false;
  }
  const track = s.tracks.find((t) => t.id === s.selectedClipTrackId);
  return (
    !!track &&
    track.id === s.selectedTrackId &&
    dockKindOf(track) === 'melodic' &&
    track.midiClips.some(
      (c) => c.id === s.selectedClipId && c.events.length > 0,
    )
  );
};

/** The Piano Roll is open: the dock's Notes tab on a melodic track. */
export const pianoRollOpen: StepCheck = (s) => notesTabShowing(s);

/** The Piano Roll is open, maximized over the timeline. */
export const pianoRollMaximized: StepCheck = (s) =>
  notesTabShowing(s) && s.dockMaximized;

/** The Piano Roll is closed: the dock shut or on another tab. */
export const pianoRollClosed: StepCheck = (s) => !notesTabShowing(s);

/** The song has more notes than when the turn began. */
export const noteAdded: StepCheck = (s, armed) =>
  noteCount(s) > noteCount(armed);

/** The song has fewer notes than when the turn began. */
export const noteDeleted: StepCheck = (s, armed) =>
  noteCount(s) < noteCount(armed);

/** A note moved in time or to another pitch. */
export const noteMoved: StepCheck = someNoteChanged(
  (now, was) => now.startTick !== was.startTick || now.note !== was.note,
);

/** A note got longer or shorter. */
export const noteResized: StepCheck = someNoteChanged(
  (now, was) => now.durationTicks !== was.durationTicks,
);

/**
 * A demo that opens a dock tab puts back the one it found: `remember` (a
 * run beat before the click) notes the tab, `restore` (the last beat)
 * shows it again, the dock shut if it was.
 */
export function dockTabKeeper(): { remember: DemoRun; restore: DemoRun } {
  let kept: ChannelStripTabId | null = null;
  return {
    remember: (s) => {
      kept = s.channelStripTab;
    },
    restore: (s) => {
      if (s.channelStripTab !== kept) s.setChannelStripTab(kept);
    },
  };
}
