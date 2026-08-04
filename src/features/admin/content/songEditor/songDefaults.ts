import type {
  AudioSource,
  Song,
  SongMode,
} from '@/curriculum/types/songLibrary';
import { extractYouTubeId } from '@/hooks/media/useYouTubeIframePlayer';

/**
 * Pure helpers for the song editor: a valid empty song, key-string building,
 * slug derivation, and YouTube audio-source upsert/read. Kept React-free so
 * they are trivially unit-testable.
 */

/** Pitch-class → note name, matching the spellings used in ChordChart. */
export const NOTE_NAMES = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;

export const SONG_MODES: SongMode[] = [
  'major',
  'minor',
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

/** MIDI note (any octave) → pitch class 0–11. */
export const pitchClass = (keyRoot: number): number =>
  ((Math.round(keyRoot) % 12) + 12) % 12;

export const noteName = (keyRoot: number): string =>
  NOTE_NAMES[pitchClass(keyRoot)];

/** A pitch class 0–11 mapped to a keyRoot in the C4 octave (C = 60). */
export const keyRootForPitchClass = (pc: number): number => 60 + pc;

/** Display key string, e.g. keyRoot 67 + 'major' → "G major". */
export const buildKeyString = (keyRoot: number, mode: SongMode): string =>
  `${noteName(keyRoot)} ${mode}`;

/** Title → url-safe slug for the content id, e.g. "(Sittin' On) Dock" → "sittin_on_dock". */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** The pasted YouTube URL currently on the song, or '' if none. */
export const getYouTubeUri = (audioSources: AudioSource[]): string =>
  audioSources.find((s) => s.provider === 'youtube')?.uri ?? '';

/**
 * Replace (or clear) the song's single YouTube source, preserving any
 * `startOffsetSec` and leaving other providers untouched. An empty URL removes
 * the YouTube source entirely.
 */
export const upsertYouTubeUri = (
  audioSources: AudioSource[],
  url: string,
): AudioSource[] => {
  const others = audioSources.filter((s) => s.provider !== 'youtube');
  const trimmed = url.trim();
  if (!trimmed) return others;
  const existing = audioSources.find((s) => s.provider === 'youtube');
  const next: AudioSource = { provider: 'youtube', uri: trimmed };
  if (existing?.startOffsetSec != null)
    next.startOffsetSec = existing.startOffsetSec;
  return [next, ...others];
};

/** True when the URL yields a valid 11-char YouTube id. */
export const isValidYouTubeUrl = (url: string): boolean =>
  !!url.trim() && extractYouTubeId(url.trim()) !== null;

/** A schema-valid new song for the "New song" screen — starts with one
 * blank-label, 4-bar section so the chart is ready to edit. */
export const makeEmptySong = (): Song => ({
  id: '',
  title: '',
  artist: '',
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: [
    {
      id: 'section_1',
      label: '',
      bars: Array.from({ length: 4 }, () => ({ chords: [] })),
    },
  ],
  audioSources: [],
  artistImageSource: 'none',
});
