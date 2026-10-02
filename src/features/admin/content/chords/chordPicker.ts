import { normalizeChordSpelling } from '@/curriculum/engine/openingTree';
import {
  CHORD_TYPES,
  DEGREE_PATTERN,
  isKnownChord,
  PICKER_DEGREES,
  splitChord,
  splitChordList,
} from '@/curriculum/engine/progressionValidation';
import {
  type ChordNotation,
  formatChord,
  parseChord,
} from '@/lib/chordNotation';

/**
 * What the chord picker offers, and how a chord is named on a chip. Pure:
 * the editor (ChordChipEditor.tsx) and its tests read these.
 *
 * The picker lists the library's own chords first, most used first ("1
 * major7" is in 387 progressions' worth of steps), then every degree with
 * every one of Prism's chord types. A search narrows both: a degree ("b7",
 * "♭7") keeps that degree, and words keep the chord types whose name or
 * spelling holds them ("dom", "min7", "sus"), so "b7 dom" finds "b7
 * dominant7" and its kin. A pasted line of chords ("1 major7 - 4 major7")
 * is offered whole.
 */

/** How many of the most used chords the picker opens on. */
export const FREQUENT_LIMIT = 16;

/** How many matches a search lists at most. */
export const SEARCH_LIMIT = 60;

/**
 * What the picker opens on when it knows nothing of the library yet: the
 * major scale's own triads and 7th chords.
 */
export const DIATONIC_CHORDS: readonly string[] = [
  '1 major',
  '2 minor',
  '3 minor',
  '4 major',
  '5 major',
  '6 minor',
  '7 diminished',
  '1 major7',
  '2 minor7',
  '3 minor7',
  '4 major7',
  '5 dominant7',
  '6 minor7',
  '7 minor7b5',
];

/** How many steps of the library's progressions each chord is. */
export function chordFrequency(
  entries: Iterable<{ chords?: unknown }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!Array.isArray(entry.chords)) continue;
    for (const chord of entry.chords)
      if (typeof chord === 'string' && isKnownChord(chord))
        counts.set(chord, (counts.get(chord) ?? 0) + 1);
  }
  return counts;
}

/**
 * A chord as a chip names it, in the app's chord notation: "1 maj7"
 * (Hybrid), "IΔ7" (Roman), or with a key, "CΔ7" (Jazz). A chord the
 * notation cannot read keeps its stored spelling.
 */
export function chordLabel(
  chord: string,
  notation: ChordNotation,
  keyPc?: number | null,
): string {
  const spec = parseChord(chord);
  if (!spec) return chord;
  return formatChord(
    spec,
    notation,
    keyPc === undefined || keyPc === null
      ? {}
      : { keyRootPc: keyPc, mode: 'ionian' },
  );
}

/** A namer that remembers: the picker names a thousand chords per key. */
export function chordNamer(
  notation: ChordNotation,
  keyPc?: number | null,
): (chord: string) => string {
  const seen = new Map<string, string>();
  return (chord) => {
    let name = seen.get(chord);
    if (name === undefined) {
      name = chordLabel(chord, notation, keyPc);
      seen.set(chord, name);
    }
    return name;
  };
}

/** One row of the picker. */
export interface ChordOption {
  chord: string;
  /** As the chips name it. */
  name: string;
  /** Steps of the library's progressions that are this chord. */
  count: number;
}

/** Text as the search compares it: lower case, plain flats and sharps. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\s+/g, ' ')
    .trim();

const DEGREE_RANK = new Map(PICKER_DEGREES.map((d, i) => [d, i]));

/**
 * Every chord the picker can offer, most used first, then by degree and by
 * how much the library uses the chord type.
 */
export function allChords(
  frequency: ReadonlyMap<string, number>,
): readonly string[] {
  const typeUse = new Map<string, number>();
  for (const [chord, count] of frequency) {
    const type = splitChord(chord)?.type;
    if (type) typeUse.set(type, (typeUse.get(type) ?? 0) + count);
  }
  const types = CHORD_TYPES.map((type, order) => ({ type, order }))
    .sort(
      (a, b) =>
        (typeUse.get(b.type) ?? 0) - (typeUse.get(a.type) ?? 0) ||
        a.order - b.order,
    )
    .map(({ type }) => type);
  const typeRank = new Map(types.map((type, i) => [type, i]));
  const chords: string[] = [];
  for (const degree of PICKER_DEGREES)
    for (const type of types) chords.push(`${degree} ${type}`);
  // Degrees the library uses that the picker does not list (none today).
  for (const chord of frequency.keys())
    if (!DEGREE_RANK.has(splitChord(chord)!.degree)) chords.push(chord);
  const rank = (chord: string) => {
    const parts = splitChord(chord)!;
    return {
      count: frequency.get(chord) ?? 0,
      degree: DEGREE_RANK.get(parts.degree) ?? PICKER_DEGREES.length,
      type: typeRank.get(parts.type) ?? types.length,
    };
  };
  const ranked = new Map(chords.map((chord) => [chord, rank(chord)]));
  return chords.sort((a, b) => {
    const x = ranked.get(a)!;
    const y = ranked.get(b)!;
    return y.count - x.count || x.degree - y.degree || x.type - y.type;
  });
}

/** What the picker lists for a search. */
export interface ChordSearch {
  /**
   * A pasted or typed line of two or more chords, each one Prism knows:
   * offered whole, before anything else.
   */
  line: string[] | null;
  /** The chords that match, in the picker's order. */
  options: ChordOption[];
  /** True when the empty search lists the most used chords only. */
  frequentOnly: boolean;
}

export function searchChords(
  query: string,
  {
    frequency,
    name,
    chords = allChords(frequency),
    limit = SEARCH_LIMIT,
  }: {
    frequency: ReadonlyMap<string, number>;
    name: (chord: string) => string;
    /** `allChords(frequency)`, when the caller keeps it. */
    chords?: readonly string[];
    limit?: number;
  },
): ChordSearch {
  const option = (chord: string): ChordOption => ({
    chord,
    name: name(chord),
    count: frequency.get(chord) ?? 0,
  });
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) {
    const frequent = [...frequency.keys()].length
      ? chords.filter((chord) => frequency.has(chord)).slice(0, FREQUENT_LIMIT)
      : DIATONIC_CHORDS;
    return { line: null, options: frequent.map(option), frequentOnly: true };
  }

  const pasted = splitChordList(query.trim()).map(normalizeChordSpelling);
  const line = pasted.length >= 2 && pasted.every(isKnownChord) ? pasted : null;

  const degrees = words.filter((word) => DEGREE_PATTERN.test(word));
  const terms = words.filter((word) => !DEGREE_PATTERN.test(word));
  const options: ChordOption[] = [];
  for (const chord of chords) {
    const parts = splitChord(chord)!;
    if (degrees.length && !degrees.includes(parts.degree)) continue;
    if (terms.length) {
      const named = fold(name(chord));
      const typeText = `${fold(parts.type)} ${named.slice(named.indexOf(' ') + 1)} ${named}`;
      if (!terms.every((term) => typeText.includes(term))) continue;
    }
    options.push(option(chord));
    if (options.length >= limit) break;
  }
  // A chord typed out in full comes first, whatever else its words match:
  // "4 major7" is the chord asked for, not the more used "4 major7diminished"
  // that also contains those words. Enter takes the top option.
  const typed = pasted.length === 1 ? pasted[0] : null;
  if (typed && isKnownChord(typed)) {
    const at = options.findIndex((o) => o.chord === typed);
    const exact = at >= 0 ? options.splice(at, 1)[0] : option(typed);
    options.unshift(exact);
    if (options.length > limit) options.length = limit;
  }
  return { line, options, frequentOnly: false };
}

/* ── The chips' edits ─────────────────────────────────────────────────── */

/** The list with the chord at `from` moved to `to` (both in range). */
export function moveChord(
  chords: readonly string[],
  from: number,
  to: number,
): string[] {
  const next = [...chords];
  if (from === to || from < 0 || from >= next.length) return next;
  const [chord] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, chord);
  return next;
}

/** The list with `added` put in at `at`, kept to `max` chords. */
export function insertChords(
  chords: readonly string[],
  at: number,
  added: readonly string[],
  max: number,
): string[] {
  const room = Math.max(0, max - chords.length);
  const next = [...chords];
  next.splice(
    Math.max(0, Math.min(at, next.length)),
    0,
    ...added.slice(0, room),
  );
  return next;
}

/** The list with the chord at `index` replaced by `by` (one or more). */
export function replaceChord(
  chords: readonly string[],
  index: number,
  by: readonly string[],
  max: number,
): string[] {
  const next = [...chords];
  const room = Math.max(1, max - chords.length + 1);
  next.splice(index, 1, ...by.slice(0, room));
  return next;
}

/** The list without the chord at `index`. */
export const removeChord = (chords: readonly string[], index: number) =>
  chords.filter((_, i) => i !== index);
