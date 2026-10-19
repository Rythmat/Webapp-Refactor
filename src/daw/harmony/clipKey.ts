/**
 * clipKey.ts — the key a pitched clip's notes are in, for its header
 * ("Guitar riff · F♯m"), so a clip that doesn't fit the song shows it before
 * anything plays (milestone 2.12, which delivers 4.6's "pitched clips show
 * their key").
 *
 * A clip that sits in the song's key shows the song's key: a riff on A, C
 * and E in a C major song is in C major, not "Am", so the header only
 * differs from the key chip when the clip really is in another key. Any
 * other clip is read against the 24 major and minor keys (the first step of
 * UNISON's key detection). A clip too short or too chromatic to name gets
 * no key rather than a guess.
 */
import {
  ALL_MODES,
  MODE_DISPLAY,
  NOTES,
  type MidiNoteEvent,
} from '@prism/engine';
import { rankMajorMinorKeys } from '@/unison/engine/keyDetector';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';

export interface ClipKey {
  /** Tonic pitch class, 0–11. */
  rootPc: number;
  /** 'ionian' or 'aeolian' when read from the notes; the song's mode when
   *  the clip is in the song's key. */
  mode: string;
  /** 'C', 'F♯m', 'D Dorian'. */
  label: string;
  /** True when it is the song's key. */
  songKey: boolean;
}

/** The song key a clip is compared with (the effective key). */
export interface SongKey {
  rootPc: number;
  mode: string;
}

/** Fewer distinct pitch classes than this name no key. */
const MIN_PITCH_CLASSES = 3;
/** The share of the notes' weight on the song's scale that makes a clip
 *  "in the song's key". */
const SONG_KEY_FIT = 0.9;
/** A weaker correlation with the best major or minor key names no key. */
const MIN_CORRELATION = 0.5;

/** 'C', 'F♯m', 'D Dorian': a key as short as a clip header can carry. */
export function shortKeyLabel(rootPc: number, mode: string): string {
  const root = displayAccidentals(NOTES[((rootPc % 12) + 12) % 12]);
  if (mode === 'ionian') return root;
  if (mode === 'aeolian') return `${root}m`;
  return `${root} ${MODE_DISPLAY[mode] ?? mode}`;
}

/** Each pitch class's weight: duration × velocity, as UNISON weighs them. */
function pitchWeights(events: readonly MidiNoteEvent[]): Float64Array {
  const weights = new Float64Array(12);
  for (const ev of events) {
    weights[((ev.note % 12) + 12) % 12] +=
      Math.max(1, ev.durationTicks) * (ev.velocity / 127);
  }
  return weights;
}

/** How much of the notes' weight sits on the key's scale, 0–1. */
function scaleFit(weights: Float64Array, key: SongKey): number {
  const intervals = ALL_MODES[key.mode];
  if (!intervals) return 0;
  let total = 0;
  let onScale = 0;
  const scale = new Set(intervals.map((i) => (i + key.rootPc) % 12));
  weights.forEach((w, pc) => {
    total += w;
    if (scale.has(pc)) onScale += w;
  });
  return total > 0 ? onScale / total : 0;
}

/** The key of a clip's notes, or null when they don't name one. */
export function detectClipKey(
  events: readonly MidiNoteEvent[],
  songKey: SongKey | null,
): ClipKey | null {
  if (events.length < MIN_PITCH_CLASSES) return null;
  const weights = pitchWeights(events);
  if (weights.filter((w) => w > 0).length < MIN_PITCH_CLASSES) return null;
  if (songKey && scaleFit(weights, songKey) >= SONG_KEY_FIT) {
    return {
      rootPc: songKey.rootPc,
      mode: songKey.mode,
      label: shortKeyLabel(songKey.rootPc, songKey.mode),
      songKey: true,
    };
  }
  const best = rankMajorMinorKeys(events as MidiNoteEvent[])[0];
  if (!best || best.correlation < MIN_CORRELATION) return null;
  const mode = best.isMajor ? 'ionian' : 'aeolian';
  return {
    rootPc: best.rootPc,
    mode,
    label: shortKeyLabel(best.rootPc, mode),
    songKey: false,
  };
}

// The canvas asks for every visible clip's key on every draw, and a clip's
// notes are a new array whenever they change, so the answer is kept per
// notes array and song key.
const cache = new WeakMap<
  readonly MidiNoteEvent[],
  { song: string; key: ClipKey | null }
>();

/** detectClipKey, remembered while the notes and the song's key stay put. */
export function clipKeyOf(
  events: readonly MidiNoteEvent[],
  songKey: SongKey | null,
): ClipKey | null {
  const song = songKey ? `${songKey.rootPc}:${songKey.mode}` : '';
  const hit = cache.get(events);
  if (hit && hit.song === song) return hit.key;
  const key = detectClipKey(events, songKey);
  cache.set(events, { song, key });
  return key;
}
