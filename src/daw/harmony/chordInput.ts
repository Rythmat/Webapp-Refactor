import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  formatChord,
  normalizeQuality,
  parseChord,
  type ChordSpec,
} from '@/lib/chordNotation';
import { qualityIntervals } from '@/lib/chordNotation/qualities';
import {
  identityIsCurrent,
  type ChordPitches,
  type ChordRegionIdentity,
  type IdentityLabels,
} from './chordIdentity';
import { chordLabels, type ChordLabels } from './chordLabels';
import type { KeyFrame } from './keyFrame';

// ── Reading what the user types ────────────────────────────────────────────
// People write chords every which way — Cmaj7, CM7, CΔ7, C-7, Cmi7, Bb/D — and
// all of it has to land on the one spelling the app stores. The parser in
// lib/chordNotation knows our vocabulary; this tidies the typing up first so
// it recognises more of what gets typed, without inventing a second dialect.
// The Lead Sheet, the Score and the Timeline's chord ruler all read chords
// through here (milestone 1.16a): a chord the app can't name is refused with
// CHORD_INPUT_HINT, never stored as text.

/** What a chord box says under text it can't read as a chord. */
export const CHORD_INPUT_HINT = 'Not a chord we know. Try Cmaj7, Dm7b5';

/** Plain-text stand-ins people type for the symbols we store. */
const SUBSTITUTIONS: Array<[RegExp, string]> = [
  // Accidentals typed as letters or unicode.
  [/♭/g, 'b'],
  [/♯/g, '#'],
  // Minor, written every way a chart writes it.
  [/^([A-Ga-g][#b]?)\s*(?:-|−|(?:mi|min|minor)(?![a-z]))/, '$1m'],
  // Major sevenths and triads.
  [/(?:Δ|maj|Maj|MAJ|M)(?=7|9|11|13|$|\/)/g, 'maj'],
  [/^([A-Ga-g][#b]?)\s*(?:major)(?![a-z])/, '$1maj'],
  // Half-diminished and diminished.
  [/ø7?/g, 'm7b5'],
  [/°|dim(?!i)/g, 'dim'],
  [/\+/g, 'aug'],
  // Suspensions and additions written with spaces or dots.
  [/\s*sus\s*/gi, 'sus'],
  [/\s*add\s*/gi, 'add'],
];

/** True when the text is nothing but a chord-ish token. */
const SHAPE = /^[A-Ga-g][#b♯♭]?[^\s]*(?:\/[A-Ga-g][#b♯♭]?)?$/;

export interface ChordEntry {
  /** The chord symbol as typed, its shorthand written out: 'Cm7', 'Bb/D'. */
  label: string;
}

/**
 * The quality a symbol names, as an engine key; empty is major. A minor
 * written 'm' before an alteration ('m7#5', 'mmaj7') reads as 'min'.
 */
function qualityOf(spec: ChordSpec): string {
  const written = spec.quality.trim() || 'major';
  const quality = normalizeQuality(written);
  if (qualityIntervals(quality) || !/^m(?!aj|in)/.test(written)) {
    return quality;
  }
  return normalizeQuality(`min${written.slice(1)}`);
}

/**
 * Turn typed text into a chord symbol, or null when it isn't one the app
 * knows: the root must be a note and the quality one it can voice ('Cxyz'
 * is refused, where it used to be stored as text).
 */
export function readChordInput(text: string): ChordEntry | null {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (!trimmed || !SHAPE.test(trimmed)) return null;

  let normalized = trimmed;
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  // The root is always written as a capital.
  normalized = normalized.replace(/^[a-g]/, (letter) => letter.toUpperCase());
  normalized = normalized.replace(
    /\/([a-g])/,
    (_, letter: string) => `/${letter.toUpperCase()}`,
  );

  // The shared parser reads it; the quality must be one the app knows.
  const spec = parseChord(normalized);
  if (!spec || typeof spec.root !== 'string') return null;
  if (!qualityIntervals(qualityOf(spec))) return null;
  return { label: normalized };
}

/** A typed chord as the lane stores it: its labels, colour and identity. */
export interface TypedChord extends ChordLabels {
  identity: ChordRegionIdentity;
}

/**
 * What typing `text` writes in `frame`'s key: the lane's own labels (a
 * degree name in a key, the letter name with the student's spelling, the
 * engine's degreeKey) and the identity, given by the student. Null when the
 * text names no chord the app knows.
 */
export function typedChord(
  text: string,
  frame: KeyFrame | null,
): TypedChord | null {
  const entry = readChordInput(text);
  const spec = entry && parseChord(entry.label);
  if (!spec || typeof spec.root !== 'string') return null;
  const rootPc = noteNameToPitchClass(spec.root);
  const bassPc =
    typeof spec.bass === 'string' ? noteNameToPitchClass(spec.bass) : rootPc;
  if (rootPc === null || bassPc === null) return null;
  const pitches: ChordPitches = { rootPc, quality: qualityOf(spec), bassPc };
  const labels = chordLabels(
    pitches,
    frame,
    {
      root: spec.root,
      bass: typeof spec.bass === 'string' ? spec.bass : undefined,
    },
    { root: rootPc, bass: bassPc },
  );
  return {
    ...labels,
    identity: { ...pitches, source: 'given', label: labels.name },
  };
}

/**
 * The text a chord box opens with to rename a region: its chord as a symbol
 * the box reads back ('D−7', 'G/B'), from its identity when that still
 * describes it, else its letter name.
 */
export function chordInputText(
  region: IdentityLabels,
  frame: KeyFrame | null,
): string {
  if (!identityIsCurrent(region)) return region.noteName;
  const identity = region.identity!;
  const jazz = formatChord(
    {
      root: identity.rootPc,
      quality: identity.quality,
      ...(identity.bassPc !== identity.rootPc ? { bass: identity.bassPc } : {}),
    },
    'jazz',
    { keyRootPc: frame?.tonicPc ?? null, mode: frame?.mode },
  );
  // A few rare symbols read as another chord ('B♭♭5'); those open on the
  // lane's letter name, which reads back.
  return (
    [jazz, chordLabels(identity, frame).noteName].find((text) =>
      samePitches(typedChord(text, frame)?.identity, identity),
    ) ?? jazz
  );
}

/** Whether two chords sound the same: root, bass and pitch classes. */
function samePitches(a: ChordPitches | undefined, b: ChordPitches): boolean {
  if (!a || a.rootPc !== b.rootPc || a.bassPc !== b.bassPc) return false;
  const classes = (quality: string) =>
    [
      ...new Set(
        (qualityIntervals(quality) ?? []).map((i) => ((i % 12) + 12) % 12),
      ),
    ]
      .sort((x, y) => x - y)
      .join();
  return classes(a.quality) === classes(b.quality);
}

/**
 * The next beat to type on: the next thing written in the same part, so
 * space walks along the notes, rests and slashes of one instrument.
 */
export function nextBeat<T extends { partIndex: number; tick: number }>(
  beats: readonly T[],
  from: { partIndex: number; tick: number },
): T | null {
  return (
    beats
      .filter((b) => b.partIndex === from.partIndex && b.tick > from.tick)
      .sort((a, b) => a.tick - b.tick)[0] ?? null
  );
}
