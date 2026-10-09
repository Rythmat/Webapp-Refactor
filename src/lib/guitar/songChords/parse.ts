// ── Song chords: reading a chord name ──────────────────────────────────────
// A song's chordName as the library writes it ('G♯min7', 'F sus7', 'B/F♯',
// 'E7(♯9)', 'Bb7') → its root, quality and slash bass. The root and bass are
// read with the transposer's own patterns, so a transposed name (E♯dim7,
// C♭/E♭) reads the same way. Unknown names are null, never a guess.

import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  BASS_TOKEN,
  ROOT_TOKEN,
  isNoChord,
} from '@/curriculum/songLibrary/hybridDegree';
import type { SongChordQuality } from './quality';

export interface SongChord {
  rootPc: number;
  /** As written: 'G♯', 'Bb'. */
  rootName: string;
  quality: SongChordQuality;
  /** The slash bass's pitch class; null when there is none (or it is the root). */
  bassPc: number | null;
  bassName: string | null;
}

/** Every way the library writes a quality, after normaliseQuality. */
const SURFACE: Readonly<Record<string, SongChordQuality>> = {
  '': 'maj',
  maj: 'maj',
  M: 'maj',
  min: 'min',
  m: 'min',
  '-': 'min',
  dim: 'dim',
  '°': 'dim',
  aug: 'aug',
  '+': 'aug',
  '♯5': 'aug',
  '5': 'power',
  sus2: 'sus2',
  sus4: 'sus4',
  sus: 'sus4',
  add2: 'add9',
  add9: 'add9',
  '6': 'maj6',
  maj6: 'maj6',
  min6: 'min6',
  m6: 'min6',
  maj7: 'maj7',
  M7: 'maj7',
  Δ7: 'maj7',
  Δ: 'maj7',
  '7': 'dom7',
  min7: 'min7',
  m7: 'min7',
  '-7': 'min7',
  'min7♭5': 'min7b5',
  'm7♭5': 'min7b5',
  ø: 'min7b5',
  ø7: 'min7b5',
  dim7: 'dim7',
  '°7': 'dim7',
  '7sus': 'dom7sus4',
  '7sus4': 'dom7sus4',
  sus7: 'dom7sus4',
  '7♯5': 'dom7#5',
  '7aug': 'dom7#5',
  aug7: 'dom7#5',
  '7+': 'dom7#5',
  '7♯9': 'dom7#9',
  '7♭9': 'dom7b9',
  '7alt': 'dom7alt',
  alt7: 'dom7alt',
  alt: 'dom7alt',
  '7no3': 'dom7no3',
  '9': 'dom9',
  '13': 'dom13',
  maj9: 'maj9',
  'maj7♯11': 'maj7#11',
};

/** '7(♯9)' → '7♯9', ' sus7' → 'sus7', '7b9' → '7♭9', '7(no 3)' → '7no3'. */
function normaliseQuality(text: string): string {
  return text
    .replace(/[()\s]/g, '')
    .replace(/#/g, '♯')
    .replace(/b(?=\d)/g, '♭');
}

/** A song chord name read for guitar; 'noChord' for N.C., null if unknown. */
export function parseSongChord(name: string): SongChord | 'noChord' | null {
  const text = name.trim();
  if (!text) return null;
  if (isNoChord(text)) return 'noChord';
  const root = text.match(ROOT_TOKEN)?.[1];
  const rootPc = root ? noteNameToPitchClass(root) : null;
  if (!root || rootPc === null) return null;
  const bassMatch = text.match(BASS_TOKEN);
  const end = bassMatch ? text.length - bassMatch[0].length : text.length;
  const quality = SURFACE[normaliseQuality(text.slice(root.length, end))];
  if (!quality) return null;
  const bassName = bassMatch?.[1] ?? null;
  const bassPc = bassName ? noteNameToPitchClass(bassName) : null;
  if (bassName && bassPc === null) return null;
  const slash = bassPc !== null && bassPc !== rootPc;
  return {
    rootPc,
    rootName: root,
    quality,
    bassPc: slash ? bassPc : null,
    bassName: slash ? bassName : null,
  };
}
