import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { useStore } from '@/daw/store';
import {
  deriveChordRegionsFromAudioSnapshots,
  deriveChordRegionsFromNotes,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import { resolveTrackRole } from '@/daw/utils/trackRole';
import { detectKey } from '@/unison/engine/keyDetector';

// ── A take's chords on the chord ruler (owner, 2026-10-21) ─────────────────
//
// While the chord ruler's Auto is on (chordAutoAnalyze), a take's chords go
// on the ruler as the student records, every half second as it plays and
// once more when it ends (a MIDI take in useMidiRecording, an audio take in
// useAudioChordDetection, which reads the recorded audio again once it is
// stored), across the take's span only, following the ruler's 'Recording
// over chords' (Replace, Merge, Keep). A MIDI take's notes are read as the
// chord ruler's analysis reads notes (deriveChordRegionsFromNotes): in the
// song's key, else the key the notes suggest. A take on a drum track has no
// chords.

/** Whether a take on `trackId` should write chords now. */
export function takeWritesChords(trackId: string | null): boolean {
  const s = useStore.getState();
  if (!s.chordAutoAnalyze || trackId === null) return false;
  const track = s.tracks.find((t) => t.id === trackId);
  if (!track) return false;
  return (
    track.instrument !== 'drum-machine' && resolveTrackRole(track) !== 'drums'
  );
}

/** The chords in a take's notes (song ticks), in the song's key. */
export function chordsInNotes(notes: MidiNoteEvent[]): ChordRegion[] {
  if (notes.length === 0) return [];
  const s = useStore.getState();
  const key =
    s.rootNote !== null
      ? { rootPc: s.rootNote, mode: s.mode }
      : detectKey(notes);
  return deriveChordRegionsFromNotes(notes, key.rootPc + 48, key.mode);
}

/**
 * Writes the chords in `notes` across [start, end) onto `base` (the ruler
 * before the take; the store's own by default). Returns whether any chord
 * was found.
 */
export function writeTakeChords(
  notes: MidiNoteEvent[],
  start: number,
  end: number,
  options: { sourceClipId?: string; base?: ChordRegion[] } = {},
): boolean {
  const regions = chordsInNotes(notes);
  if (regions.length === 0) return false;
  const tagged = options.sourceClipId
    ? regions.map((r) => ({ ...r, sourceClipId: options.sourceClipId }))
    : regions;
  useStore
    .getState()
    .writeChordsInRange(tagged, start, end, 'detected', options.base);
  return true;
}

/** An audio take's heard notes at a tick (useAudioChordDetection). */
export interface HeardSnapshot {
  tick: number;
  notes: number[];
}

/**
 * Writes the chords heard in an audio take across [start, end) onto `base`,
 * in the song's key (C when there is none, as the audio proposal names them).
 * Returns whether any chord was found.
 */
export function writeHeardChords(
  snapshots: HeardSnapshot[],
  start: number,
  end: number,
  base?: ChordRegion[],
): boolean {
  if (snapshots.length === 0) return false;
  const { rootNote, mode } = useStore.getState();
  const regions = deriveChordRegionsFromAudioSnapshots(
    snapshots,
    (rootNote ?? 0) + 48,
    mode,
  );
  if (regions.length === 0) return false;
  // The last chord rings on past the last snapshot: its span is the take's.
  const spanEnd = Math.max(end, ...regions.map((r) => r.endTick));
  useStore
    .getState()
    .writeChordsInRange(regions, start, spanEnd, 'detected', base);
  return true;
}
