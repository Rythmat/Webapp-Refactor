import { CHORDS } from '@/daw/prism-engine/data/chords';
import { KEY_COLORS, KEYS } from '@/daw/prism-engine/data/keyColors';
import { getChordColor } from '@/daw/prism-engine/engine/colorSystem';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  type ChordNotation,
  CHORD_NOTATIONS,
  formatChord,
  parseChord,
} from '@/lib/chordNotation';
import { DEFAULT_NODE_COLOR } from '../map/model/colorGroups';
import { rgbaBytes } from '../map/render/graphTheme';

/**
 * How Tesseract names and colours a chord in the key picked above the map.
 *
 * The tree is stored once, in degrees ("1 major7", "b7 major"). The picked
 * key turns each degree into a chord:
 *
 * - its name comes from the app's chord notation (`lib/chordNotation`),
 *   the same writer every chord label in the app goes through: Jazz letter
 *   names by default ("E♭Δ7" in E♭), or Hybrid degrees ("1 maj7") or Roman
 *   numerals ("IΔ7") when switched;
 * - its colour is Prism's (`getChordColor`), so the picture matches
 *   Studio's for the same chords: in C the key's own chords are C's red, a
 *   borrowed chord wears the colour of the key it comes from, and changing
 *   key turns the twelve key colours round the circle of fifths while the
 *   four scale-family colours stay put.
 *
 * A chord Prism does not know (a degree or quality outside its lists, or
 * one Prism would paint white) is drawn in Cortex's unclaimed grey, never
 * white: white is the highlight.
 *
 * The keys are the twelve major keys in Prism's order round the circle of
 * fifths (C, G, D … F). Minor and modal keys are left for later: the
 * degrees are written against the major scale.
 */

/** The keys the picker offers, in Prism's order round the circle of fifths. */
export const TESSERACT_KEYS: readonly string[] = KEYS.slice(1);

export const DEFAULT_KEY = 'C';

/** The notation the map names chords in until the reader switches it. */
export const DEFAULT_NOTATION: ChordNotation = 'jazz';

const PITCH: Readonly<Record<string, number>> = {
  C: 0,
  G: 7,
  D: 2,
  A: 9,
  E: 4,
  B: 11,
  'F#': 6,
  Db: 1,
  Ab: 8,
  Eb: 3,
  Bb: 10,
  F: 5,
};

/** A key's tonic as a pitch class, C = 0. */
export const keyPc = (key: string): number => PITCH[key] ?? 0;

/** A key as the page writes it: "E♭", "F♯". */
export const keyLabel = (key: string): string => displayAccidentals(key);

/** A key's own colour (Prism's), as CSS. */
export function keyColor(key: string): string {
  const index = KEYS.indexOf(key);
  const [r, g, b] = KEY_COLORS[index > 0 ? index : 1];
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The key a URL names, read loosely ("Eb", "E♭", "eb"), or C when it names
 * none of the twelve.
 */
export function parseKey(text: string | null | undefined): string {
  if (!text) return DEFAULT_KEY;
  const ascii = text.trim().replace(/♭/g, 'b').replace(/♯/g, '#');
  const spelled = ascii.charAt(0).toUpperCase() + ascii.slice(1).toLowerCase();
  return TESSERACT_KEYS.includes(spelled) ? spelled : DEFAULT_KEY;
}

/** The notation a URL names, or the map's default. */
export function parseNotation(text: string | null | undefined): ChordNotation {
  return CHORD_NOTATIONS.find((n) => n === text) ?? DEFAULT_NOTATION;
}

const DEGREE = /^([b#]?)([1-7])$/;

/** Whether Prism knows a chord: a degree and one of its chord types. */
export function isKnownChord(chord: string): boolean {
  const space = chord.indexOf(' ');
  if (space < 0) return false;
  return (
    DEGREE.test(chord.slice(0, space)) &&
    Object.prototype.hasOwnProperty.call(CHORDS, chord.slice(space + 1))
  );
}

/** The unclaimed grey, as bytes. */
const GREY = (() => {
  const bytes = rgbaBytes(DEFAULT_NODE_COLOR) ?? [140, 140, 140, 255];
  return [bytes[0], bytes[1], bytes[2]] as const;
})();

/** A chord's colour in a key: Prism's, or the unclaimed grey when unknown. */
export function chordRgb(
  chord: string,
  pc: number,
): readonly [number, number, number] {
  if (!isKnownChord(chord)) return GREY;
  const [r, g, b] = getChordColor(chord, 60 + pc, 'ionian');
  // Prism's "unknown" is white, and white is the highlight here.
  if (r === 255 && g === 255 && b === 255) return GREY;
  return [r, g, b];
}

/** A chord's colour in a key, as CSS. */
export function chordCss(chord: string, pc: number): string {
  const [r, g, b] = chordRgb(chord, pc);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * A chord's name in a key and notation: "E♭Δ7" (Jazz, in E♭), "1 maj7"
 * (Hybrid), "IΔ7" (Roman). A chord the notation cannot read keeps its
 * stored spelling.
 */
export function chordName(
  chord: string,
  notation: ChordNotation,
  pc: number,
): string {
  const spec = parseChord(chord);
  if (!spec) return chord;
  return formatChord(spec, notation, { keyRootPc: pc, mode: 'ionian' });
}

/**
 * A namer that remembers what it has written: a map names the same few
 * dozen chords hundreds of times.
 */
export function chordNamer(
  notation: ChordNotation,
  pc: number,
): (chord: string) => string {
  const seen = new Map<string, string>();
  return (chord) => {
    let name = seen.get(chord);
    if (name === undefined) {
      name = chordName(chord, notation, pc);
      seen.set(chord, name);
    }
    return name;
  };
}

/** A whole opening or progression, named chord by chord: "D−7 → G7 → CΔ7". */
export const namePath = (
  chords: readonly string[],
  name: (chord: string) => string,
): string => chords.map(name).join(' → ');
