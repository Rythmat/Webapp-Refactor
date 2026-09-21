import {
  parseNoteName,
  type SpelledNote,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  expectedDegreeNumbers,
  isNoChord,
  spelledPitchClass,
} from '@/curriculum/songLibrary/hybridDegree';
import type { SongMode } from '@/curriculum/types/songLibrary';
import { noteName, pitchClass } from './songDefaults';

/**
 * Hybrid Number System degree derivation for the song editor. The quality
 * token is a port of `computeDegree` from `src/scripts/parseSongPdfs.mjs`, the
 * generator behind the shipped song library, so auto-populated labels match
 * the existing chords (notably: a bare dominant is `7`, e.g. `5 7`, NOT
 * `dom7`). The degree number itself follows `hybridDegree` — counted from the
 * tonic's major scale — which the generator originally got wrong for minor
 * keys (it numbered from natural minor).
 */

// Comprehensive chord regex (root · quality · extension · alterations · bass).
const CHORD_RE =
  /^([A-G][#♯b♭]?)\s*(maj|min|m(?!a)|dim|aug|sus|add|dom|[Mm]aj|half-dim|hdim|ø|°|\+)?\s*(6|7|9|11|13)?\s*(?:([#♯b♭]\d+[#♯b♭]?\d*|\([^)]*\))*)\s*(\/\s*[A-G][#♯b♭]?)?$/;

/** Degree-string quality token (`maj`, `min7`, `7`, `dim7`, `sus4`, …). */
function extractChordQuality(chordName: string): string {
  if (isNoChord(chordName)) return 'n.c.';
  const match = chordName.match(CHORD_RE);
  if (!match) return 'maj';

  const quality = (match[2] || '').toLowerCase();
  const extension = match[3] || '';

  let q = 'maj';
  if (quality === 'min' || quality === 'm') q = 'min';
  else if (quality === 'maj') q = 'maj';
  else if (['dim', '°', 'ø', 'half-dim', 'hdim'].includes(quality)) q = 'dim';
  else if (quality === 'aug' || quality === '+') q = 'aug';
  else if (quality === 'sus') q = 'sus';
  else if (quality === 'add') q = 'add';
  else if (quality === 'dom') q = 'dom';

  if (extension) {
    if (q === 'maj' && quality === 'maj') return `maj${extension}`;
    if (q === 'maj' && quality === '') return extension; // bare 7/9/11/13 = dominant
    if (q === 'min') return `min${extension}`;
    if (q === 'dim') return `dim${extension}`;
    if (q === 'aug') return `aug${extension}`;
    if (q === 'sus') return `sus${extension}`;
    if (q === 'dom') return extension; // inside `if (extension)`, so always set
    if (q === 'add') return `add${extension}`;
    return `${q}${extension}`;
  }

  if (q === 'min') return 'min';
  if (q === 'dim') return 'dim';
  if (q === 'aug') return 'aug';
  if (q === 'sus') return 'sus4';
  return 'maj';
}

/**
 * Compute the Hybrid Number System degree for a chord in a key. Degrees count
 * from the MAJOR scale of the tonic in every mode (C minor: E♭ → '♭3'), and
 * the accidental follows the chord root's letter (C major: D♭ → '♭2', C♯ →
 * '♯1'). `tonic` is the song's spelled tonic (see `songTonic`, which follows
 * the chart's own spelling); without it the tonic is spelled from `keyRoot`.
 * @example degreeFromChord('B♭', 60, 'major') // → '♭7 maj'
 * @example degreeFromChord('G7', 60, 'major')  // → '5 7'
 * @example degreeFromChord('C/E', 60, 'major') // → '1 maj/3'
 */
export function degreeFromChord(
  chordName: string,
  keyRoot: number,
  // Kept for call-site compatibility: hybrid degrees are the same in every mode.
  _mode: SongMode,
  tonic?: SpelledNote | null,
): string {
  if (isNoChord(chordName)) return 'n.c.';

  // A stale tonic (key changed since it was derived) must not win over keyRoot.
  const key =
    tonic && spelledPitchClass(tonic) === pitchClass(keyRoot)
      ? tonic
      : parseNoteName(noteName(keyRoot));
  const numbers = key ? expectedDegreeNumbers(chordName, key) : null;
  if (!numbers) return '1 maj';
  const quality = extractChordQuality(chordName);

  return numbers.bass
    ? `${numbers.root} ${quality}/${numbers.bass}`
    : `${numbers.root} ${quality}`;
}
