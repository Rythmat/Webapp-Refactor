import { parseChord } from '@/lib/chordNotation';

// ── Reading what the user types ────────────────────────────────────────────
// People write chords every which way — Cmaj7, CM7, CΔ7, C-7, Cmi7, Bb/D — and
// all of it has to land on the one spelling the app stores. The parser in
// lib/chordNotation knows our vocabulary; this tidies the typing up first so
// it recognises more of what gets typed, without inventing a second dialect.

/** Plain-text stand-ins people type for the symbols we store. */
const SUBSTITUTIONS: Array<[RegExp, string]> = [
  // Accidentals typed as letters or unicode.
  [/♭/g, 'b'],
  [/♯/g, '#'],
  // Minor, written every way a chart writes it.
  [/^([A-Ga-g][#b]?)\s*(?:-|−|mi|min|minor)(?![a-z])/, '$1m'],
  // Major sevenths and triads.
  [/(?:Δ|maj|Maj|MAJ|M)(?=7|9|11|13|$|\/)/g, 'maj'],
  [/^([A-Ga-g][#b]?)\s*(?:major)(?![a-z])/, '$1maj'],
  // Half-diminished and diminished.
  [/ø/g, 'm7b5'],
  [/°|dim(?!i)/g, 'dim'],
  [/\+/g, 'aug'],
  // Suspensions and additions written with spaces or dots.
  [/\s*sus\s*/gi, 'sus'],
  [/\s*add\s*/gi, 'add'],
];

/** True when the text is nothing but a chord-ish token. */
const SHAPE = /^[A-Ga-g][#b♯♭]?[^\s]*(?:\/[A-Ga-g][#b♯♭]?)?$/;

export interface ChordEntry {
  /** What gets stored and shown. */
  label: string;
}

/**
 * Turn typed text into a chord symbol, or null when it isn't one. The label
 * keeps the writer's own spelling once the shorthand has been expanded, since
 * the lead sheet stores chords as the text it shows.
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

  // The shared parser is the judge of whether this is a chord we know.
  return parseChord(normalized) ? { label: normalized } : null;
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
