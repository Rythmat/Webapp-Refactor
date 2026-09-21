import type { MidiNoteEvent } from '@prism/engine';
import {
  deriveChordRegionsFromNotes,
  deriveChordRegionsFromSession,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { guessTrackRole } from '@/daw/utils/trackRole';
import type { SessionSnapshot } from '@/unison/converters/sessionToUnison';
import { detectKey } from '@/unison/engine/keyDetector';

// ── Selections Insight can analyze ─────────────────────────────────────────
// Chords picked in the timeline's chord lane, or notes picked inside clips
// (⌘-drag in the timeline, or the piano roll's Select tool). Either becomes a
// session snapshot the UNISON theory engine analyzes on its own.

export interface ChordClickModifiers {
  /** Shift: select the run from the anchor to the clicked chord. */
  shift: boolean;
  /** Cmd/Ctrl: add or remove the clicked chord. */
  toggle: boolean;
}

/**
 * The chord-lane selection after clicking `clickedId`: a plain click selects
 * just that chord, Cmd/Ctrl-click adds or removes it, and Shift-click selects
 * the run from the anchor (the last chord clicked without Shift) to it. Ids
 * come back in timeline order.
 */
export function nextChordSelection(
  regions: ReadonlyArray<Pick<ChordRegion, 'id' | 'startTick'>>,
  selectedIds: readonly string[],
  anchorId: string | null,
  clickedId: string,
  { shift, toggle }: ChordClickModifiers,
): { selectedIds: string[]; anchorId: string } {
  const ordered = [...regions]
    .sort((a, b) => a.startTick - b.startTick)
    .map((r) => r.id);

  if (shift && anchorId && ordered.includes(anchorId)) {
    const a = ordered.indexOf(anchorId);
    const b = ordered.indexOf(clickedId);
    return {
      selectedIds: ordered.slice(Math.min(a, b), Math.max(a, b) + 1),
      anchorId,
    };
  }

  if (toggle) {
    const next = new Set(selectedIds);
    if (next.has(clickedId)) next.delete(clickedId);
    else next.add(clickedId);
    return {
      selectedIds: ordered.filter((id) => next.has(id)),
      anchorId: clickedId,
    };
  }

  return { selectedIds: [clickedId], anchorId: clickedId };
}

/** Notes selected inside one clip, as indices into its `events`. */
export interface ClipNoteSelection {
  trackId: string;
  clipId: string;
  noteIndices: number[];
}

/** A note's bar as drawn in a timeline clip, in canvas coords. */
export interface DrawnNote {
  trackId: string;
  clipId: string;
  /** The note's index in its clip's events. */
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A marquee from where the drag began (x0, y0) to where it is (x1, y1). */
export interface Marquee {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * The notes a ⌘-drag marquee touches, like a piano roll's select tool: every
 * drawn note bar it overlaps at all, wherever the note starts — so a marquee
 * begun partway through a chord still takes that chord.
 */
export function notesInMarquee(
  notes: readonly DrawnNote[],
  marquee: Marquee,
): ClipNoteSelection[] {
  const left = Math.min(marquee.x0, marquee.x1);
  const right = Math.max(marquee.x0, marquee.x1);
  const top = Math.min(marquee.y0, marquee.y1);
  const bottom = Math.max(marquee.y0, marquee.y1);
  const byClip = new Map<string, ClipNoteSelection>();
  for (const n of notes) {
    if (n.x > right || n.x + n.w < left || n.y > bottom || n.y + n.h < top) {
      continue;
    }
    const entry = byClip.get(n.clipId) ?? {
      trackId: n.trackId,
      clipId: n.clipId,
      noteIndices: [],
    };
    if (!entry.noteIndices.includes(n.index)) entry.noteIndices.push(n.index);
    byClip.set(n.clipId, entry);
  }
  return [...byClip.values()].map((s) => ({
    ...s,
    noteIndices: s.noteIndices.sort((a, b) => a - b),
  }));
}

/**
 * The selected notes per track, in track order, with song-timeline ticks.
 * Selections whose clip or notes no longer exist are dropped.
 */
export function resolveNoteSelection(
  tracks: readonly Track[],
  selection: readonly ClipNoteSelection[],
): Array<{ track: Track; events: MidiNoteEvent[] }> {
  return tracks.flatMap((track) => {
    const events = selection
      .filter((s) => s.trackId === track.id)
      .flatMap(({ clipId, noteIndices }) => {
        const clip = track.midiClips.find((c) => c.id === clipId);
        if (!clip) return [];
        return noteIndices
          .filter((i) => i >= 0 && i < clip.events.length)
          .map((i) => ({
            ...clip.events[i],
            startTick: clip.startTick + clip.events[i].startTick,
          }));
      })
      .sort((a, b) => a.startTick - b.startTick || a.note - b.note);
    return events.length > 0 ? [{ track, events }] : [];
  });
}

/** Identifies what an analysis covered, so Insight can tell when the
 *  selection (or the selected notes themselves) has changed since. */
export const chordSelectionKey = (chordIds: readonly string[]) =>
  `chords:${chordIds.join(',')}`;

export function noteSelectionKey(
  tracks: readonly Track[],
  selection: readonly ClipNoteSelection[],
): string {
  const parts = resolveNoteSelection(tracks, selection).map(
    ({ track, events }) =>
      `${track.id}=${events
        .map((e) => `${e.note}@${e.startTick}+${e.durationTicks}`)
        .join(',')}`,
  );
  return `notes:${parts.join('|')}`;
}

export interface SelectionSource {
  tracks: Track[];
  chordRegions: ChordRegion[];
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  rootNote: number | null;
  mode: string;
}

const snapshotTrack = (
  track: Track,
  events: MidiNoteEvent[],
): SessionSnapshot['tracks'][number] => ({
  id: track.id,
  name: track.name,
  type: track.type,
  instrument: track.instrument,
  midiClips: [{ events }],
});

const isDrumTrack = (track: Track) =>
  (track.trackRole === 'auto'
    ? guessTrackRole(track.name, track.instrument)
    : track.trackRole) === 'drums';

/**
 * A session snapshot holding only the selected chords and the MIDI notes that
 * sound during them. Note ticks are made absolute (clip start + note); a note
 * is kept when it overlaps any selected chord. The session key and mode carry
 * over, so chord functions stay relative to the song's key.
 */
export function chordSelectionSnapshot(
  source: SelectionSource,
  chordIds: readonly string[],
): SessionSnapshot {
  const ids = new Set(chordIds);
  const chords = source.chordRegions
    .filter((r) => ids.has(r.id))
    .sort((a, b) => a.startTick - b.startTick);
  const soundsDuringSelection = (start: number, end: number) =>
    chords.some((c) => start < c.endTick && end > c.startTick);

  return {
    tracks: source.tracks.map((t) =>
      snapshotTrack(
        t,
        t.midiClips
          .flatMap((clip) =>
            clip.events.map((e) => ({
              ...e,
              startTick: clip.startTick + e.startTick,
            })),
          )
          .filter((e) =>
            soundsDuringSelection(e.startTick, e.startTick + e.durationTicks),
          ),
      ),
    ),
    chordRegions: chords,
    bpm: source.bpm,
    timeSignatureNumerator: source.timeSignatureNumerator,
    timeSignatureDenominator: source.timeSignatureDenominator,
    rootNote: source.rootNote,
    mode: source.mode,
    title: 'Chord selection',
  };
}

/**
 * A session snapshot holding only the selected notes, with chords detected
 * from just those notes — the same way the session's chord lane is derived
 * (harmony tracks voiced over the bass), read in the session's key, or the
 * key the notes suggest when none is set. When the notes hold no harmony-track
 * notes (say, only the melody), chords are read from all the selected notes.
 */
export function noteSelectionSnapshot(
  source: SelectionSource,
  selection: readonly ClipNoteSelection[],
): SessionSnapshot {
  const picked = resolveNoteSelection(source.tracks, selection);
  const pitched = picked
    .filter(({ track }) => !isDrumTrack(track))
    .flatMap(({ events }) => events);
  const key =
    source.rootNote === null
      ? detectKey(pitched)
      : { rootPc: source.rootNote, mode: source.mode };
  const rootMidi = key.rootPc + 48;

  const selectedTracks = picked.map(({ track, events }) => ({
    ...track,
    midiClips: [{ id: `${track.id}-selection`, startTick: 0, events }],
  }));
  let chordRegions = deriveChordRegionsFromSession(
    selectedTracks,
    rootMidi,
    key.mode,
  );
  if (chordRegions.length === 0 && pitched.length > 0) {
    chordRegions = deriveChordRegionsFromNotes(pitched, rootMidi, key.mode);
  }

  return {
    tracks: picked.map(({ track, events }) => snapshotTrack(track, events)),
    chordRegions,
    bpm: source.bpm,
    timeSignatureNumerator: source.timeSignatureNumerator,
    timeSignatureDenominator: source.timeSignatureDenominator,
    rootNote: source.rootNote,
    mode: source.mode,
    title: 'Note selection',
  };
}
