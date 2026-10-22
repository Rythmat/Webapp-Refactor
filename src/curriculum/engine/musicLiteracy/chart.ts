/**
 * A student's progression as a chart a Band reads: Music Literacy Part 3,
 * Hear It with Your Band. Part 2 saves a progression as scale degrees of
 * the key it was made in (choices.ts); a Band plays chord symbols, one a bar
 * ("Dm Gm Am Bb"), as the genre lessons write them. This turns one into the
 * other, and gives the hybrid labels the app names the chords by ("1 min",
 * "♭6 maj"). Never Roman numerals.
 *
 * THE SPELLING
 * A chord's root is spelled the key's way, as the staff spells a note
 * (register.ts): its letter is the 1's letter plus the degree, so D minor's
 * ♭6 is B♭ and D♭ major's 5 is A♭. A key far round the circle can need a
 * double flat (D♭ minor's ♭6 is B𝄫): the symbols are written with ASCII
 * accidentals ('Bbb'), which chordSymbolTones reads.
 *
 *   triad  maj ''   min 'm'
 *   7th    maj7 'maj7'   min7 'm7'   dom7 '7'
 *
 * Pure, no React.
 */

import {
  LITERACY_DIMINISHED_DEGREE,
  LITERACY_HARMONIES,
  LITERACY_MODES,
  LITERACY_SCALE_DEGREES,
  LITERACY_TONICS,
  type LiteracyHarmony,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { circleOfFifths, type SavedProgression } from './choices';
import { diatonicChord, progressionLabels, type ChordQuality } from './chords';
import { pitchClassOf, SCALE_SEMITONES } from './pitch';

/** What a Band needs of a progression: its chords, their harmony, its key. */
export type LiteracyChart = Pick<
  SavedProgression,
  'chords' | 'harmony' | 'tonic' | 'mode'
>;

/**
 * What the band plays when the student hasn't saved a progression yet: C
 * major's 1 6 4 5, the most played four chords there are.
 */
export const STARTER_PROGRESSION: SavedProgression = {
  template: ['1', 'X', 'X', 'X'],
  chords: ['1', '6', '4', '5'],
  harmony: 'triads',
  tonic: 'C',
  mode: 'major',
};

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL = [0, 2, 4, 5, 7, 9, 11] as const;

const SUFFIX: Readonly<Record<ChordQuality, string>> = {
  maj: '',
  min: 'm',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
};

/**
 * The note on a degree of a key, spelled the key's way (THE SPELLING), with
 * ASCII accidentals: D minor's 6 is 'Bb', D♭ minor's 'Bbb'.
 */
export function degreeNoteName(
  tonic: LiteracyTonic,
  mode: LiteracyMode,
  degree: LiteracyScaleDegree,
): string {
  const index = LITERACY_SCALE_DEGREES.indexOf(degree);
  const letter =
    (LETTERS.indexOf(tonic[0] as (typeof LETTERS)[number]) + index) % 7;
  const pitch = (pitchClassOf(tonic) + SCALE_SEMITONES[mode][index]) % 12;
  // −2 … +2: how far the pitch is from the letter's natural.
  const alter = ((pitch - NATURAL[letter] + 18) % 12) - 6;
  const accidental = alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  return `${LETTERS[letter]}${accidental}`;
}

/**
 * A key's chord on a degree as a chord symbol: 'Dm', 'Bbmaj7', 'G7'. A
 * degree the mode leaves out (the diminished one) plays the 1, as
 * chords.ts's passes do.
 */
export function chordSymbol(
  key: { tonic: LiteracyTonic; mode: LiteracyMode },
  degree: LiteracyScaleDegree,
  harmony: LiteracyHarmony = 'triads',
): string {
  const playable =
    degree === LITERACY_DIMINISHED_DEGREE[key.mode] ? '1' : degree;
  const chord = diatonicChord(key.mode, playable, harmony)!;
  return `${degreeNoteName(key.tonic, key.mode, playable)}${SUFFIX[chord.quality]}`;
}

/** The chart's chords as symbols, one a bar: "Dm Gm Am Bb". */
export function chartSymbols(chart: LiteracyChart): string[] {
  return chart.chords.map((degree) =>
    chordSymbol(chart, degree, chart.harmony),
  );
}

/** The chart's chords as the app names them: "1 min", "4 min", "♭6 maj". */
export function chartLabels(chart: LiteracyChart): string[] {
  return progressionLabels(chart.chords, chart.mode, chart.harmony);
}

/** "1 min · 4 min · 5 min · ♭6 maj": the chart on one line. */
export const chartLine = (chart: LiteracyChart, separator = ' · ') =>
  chartLabels(chart).join(separator);

/** "D Minor", "B♭ Major": the chart's key, as Part 2 names it. */
export const chartKeyName = (chart: Pick<LiteracyChart, 'tonic' | 'mode'>) =>
  `${chart.tonic.replace('b', '♭').replace('#', '♯')} ${chart.mode === 'minor' ? 'Minor' : 'Major'}`;

/** The Prism mode a chart's key is colored and spelled in. */
export const chartPrismMode = (mode: LiteracyMode): 'ionian' | 'aeolian' =>
  mode === 'minor' ? 'aeolian' : 'ionian';

/** The chart's key color (KEY_OF_COLORS): minor wears its relative major's. */
export const chartKeyColor = (chart: Pick<LiteracyChart, 'tonic' | 'mode'>) =>
  colorForKeyMode(chart.tonic, chartPrismMode(chart.mode));

/**
 * Each chord's color, as Part 2's chooser draws its palette: the key on
 * the circle its root sits on, in the chart's mode.
 */
export function chartColors(chart: LiteracyChart): string[] {
  const ring = circleOfFifths(chart.mode);
  const one = pitchClassOf(chart.tonic);
  return chart.chords.map((degree) => {
    const chord = diatonicChord(chart.mode, degree, chart.harmony);
    const pc = (one + (chord?.rootSemitones ?? 0)) % 12;
    return ring.find((k) => k.pitchClass === pc)?.color ?? '#888888';
  });
}

/** Two charts are the same music: chords, harmony and key. */
export const sameChart = (a: LiteracyChart, b: LiteracyChart) =>
  a.tonic === b.tonic &&
  a.mode === b.mode &&
  a.harmony === b.harmony &&
  a.chords.length === b.chords.length &&
  a.chords.every((degree, i) => degree === b.chords[i]);

/** A chart as one URL-safe word: "D.minor.sevenths.1-4-5-6". */
export const chartId = (chart: LiteracyChart) =>
  [chart.tonic, chart.mode, chart.harmony, chart.chords.join('-')].join('.');

/**
 * A chart read back from its parts (a Studio link's parameters): null when
 * any part isn't one Part 2 could have saved, the diminished chord
 * included.
 */
export function parseChart(parts: {
  tonic: string | null | undefined;
  mode: string | null | undefined;
  harmony?: string | null;
  chords: string | null | undefined;
}): LiteracyChart | null {
  const tonic = LITERACY_TONICS.find((t) => t === parts.tonic);
  const mode = LITERACY_MODES.find((m) => m === parts.mode);
  const harmony =
    parts.harmony == null || parts.harmony === ''
      ? 'triads'
      : LITERACY_HARMONIES.find((h) => h === parts.harmony);
  if (!tonic || !mode || !harmony || !parts.chords) return null;
  const chords = parts.chords.split('-');
  if (
    chords.length === 0 ||
    chords.length > 8 ||
    !chords.every(
      (c): c is LiteracyScaleDegree =>
        (LITERACY_SCALE_DEGREES as readonly string[]).includes(c) &&
        c !== LITERACY_DIMINISHED_DEGREE[mode],
    )
  )
    return null;
  return { tonic, mode, harmony, chords };
}
