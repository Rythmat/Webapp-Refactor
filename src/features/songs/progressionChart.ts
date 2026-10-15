import { parseDegreeChord } from '@/content/harmony';
import { parseNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { hybridDegree } from '@/curriculum/songLibrary/hybridDegree';
import { isSectionLabel } from '@/curriculum/songLibrary/sectionNames';
import { transposeSong } from '@/curriculum/songLibrary/transpose';
import type { ChordBar, Song, SongMode } from '@/curriculum/types/songLibrary';

/**
 * A library progression written out as a chart the Studio can open: one
 * chord to a bar, played round until it fills at least eight bars, in the
 * key it was heard in.
 *
 * The library writes every progression from a major tonic ('6 minor - 4
 * major - 1 major - 5 major'). Heard in a minor song read from its relative
 * major (`HarmonyMatch.relative`), it opens in that song's own key, labelled
 * from its own tonic: 'I Will Survive' gets A minor's '1 min - 4 min - ♭7
 * maj - ♭3 maj', not C major's '6 - 2 - 5 - 1'.
 *
 * Built in C (or the mode of C the key names, so A minor or D Dorian), where
 * every letter is plain, and moved with `transposeSong`, which spells for
 * the key it lands in.
 */

export interface ProgressionChartOptions {
  /** The tonic as a pitch class (0–11); C when left out. */
  tonicPc?: number;
  /** The key's mode; major when left out. */
  mode?: SongMode;
  /**
   * The progression's degrees count from the parent major of `mode`, not
   * its tonic: the match was found reading the song from its relative major.
   */
  relative?: boolean;
  /** Tempo; 90 when left out. */
  bpm?: number;
  /** "as heard in": a song's title, for the project's credit line. */
  heardIn?: string;
  /** The section it was heard in ('Chorus'); 'Verse' when left out. */
  sectionLabel?: string;
}

/** The progression the chart is written from. */
export interface ProgressionSource {
  id: number;
  chords: readonly string[];
}

/** Where each mode's tonic sits above its parent major's. */
const MODE_SHIFT: Partial<Record<SongMode, number>> = {
  dorian: 2,
  phrygian: 4,
  lydian: 5,
  mixolydian: 7,
  minor: 9,
  aeolian: 9,
  locrian: 11,
};

/** Each white-key tonic's pitch class. */
const TONIC_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** The C major letter each semitone above C is written with in C. */
const C_LETTERS = [
  'C',
  'D♭',
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
];
/** The tonic letter of each mode of C (A minor, D Dorian …). */
const TONIC_LETTER: Record<number, string> = {
  0: 'C',
  2: 'D',
  4: 'E',
  5: 'F',
  7: 'G',
  9: 'A',
  11: 'B',
};

/** A degree's letter in C, keeping a library '♯5' sharp and a '♭6' flat. */
function letterInC(degree: string, pc: number): string {
  const sharp = /^[#♯]/.test(degree);
  if (!sharp) return C_LETTERS[pc];
  const natural = { 1: 'C', 2: 'D', 4: 'F', 5: 'G', 6: 'A' }[
    Number(degree.replace(/^[#♯]+/, ''))
  ];
  return natural ? `${natural}♯` : C_LETTERS[pc];
}

/** The chart's way of writing each quality: in the degree, and the name. */
const WRITTEN: Record<string, { degree: string; name: string }> = {
  maj: { degree: 'maj', name: '' },
  min: { degree: 'min', name: 'min' },
  maj7: { degree: 'maj7', name: 'maj7' },
  maj9: { degree: 'maj9', name: 'maj9' },
  maj6: { degree: 'maj6', name: 'maj6' },
  maj69: { degree: 'maj69', name: 'maj69' },
  add2: { degree: 'add2', name: 'add2' },
  add4: { degree: 'add4', name: 'add4' },
  'maj7#11': { degree: 'maj7(♯11)', name: 'maj7s11' },
  min7: { degree: 'min7', name: 'min7' },
  min9: { degree: 'min9', name: 'min9' },
  min11: { degree: 'min11', name: 'min11' },
  min6: { degree: 'min6', name: 'min6' },
  minadd2: { degree: 'min(add2)', name: 'min' },
  minmaj7: { degree: 'min(maj7)', name: 'min_maj7' },
  dom7: { degree: 'dom7', name: '7' },
  dom9: { degree: 'dom9', name: '9' },
  dom11: { degree: 'dom11', name: '11' },
  dom13: { degree: 'dom13', name: '13' },
  'dom7#5': { degree: 'dom7(♯5)', name: '7♯5' },
  dom7b5: { degree: 'dom7(♭5)', name: '7♭5' },
  dom7b9: { degree: 'dom7(♭9)', name: '7b9' },
  'dom7#9': { degree: 'dom7(♯9)', name: '7♯9' },
  'dom7#11': { degree: 'dom7(♯11)', name: '7♯11' },
  dom7alt: { degree: 'dom7(alt)', name: '7alt' },
  funk9: { degree: 'funk9', name: 'funk9' },
  dom7sus4: { degree: 'dom7sus4', name: '7sus4' },
  dom9sus4: { degree: 'dom9sus4', name: '7sus4' },
  sus4: { degree: 'sus4', name: 'sus4' },
  sus2: { degree: 'sus2', name: 'sus2' },
  dim: { degree: 'dim', name: 'dim' },
  dim7: { degree: 'dim7', name: 'dim7' },
  min7b5: { degree: 'min7(♭5)', name: 'min7b5' },
  aug: { degree: 'aug', name: '+' },
  power: { degree: '5', name: '5' },
};

/** The least number of bars the chart fills, going round the progression. */
const MIN_BARS = 8;

/** The chart, or null when a chord of the progression cannot be read. */
export function progressionChart(
  progression: ProgressionSource,
  options: ProgressionChartOptions = {},
): Song | null {
  const mode: SongMode = options.mode ?? 'major';
  // Built on a white-key tonic: C, or the mode of C the key names.
  const shift = options.relative ? (MODE_SHIFT[mode] ?? 0) : 0;
  const buildTonic = TONIC_LETTER[shift] ?? 'C';
  const tonicNote = parseNoteName(buildTonic)!;

  const hits: ChordBar[] = [];
  for (const label of progression.chords) {
    const chord = parseDegreeChord(label);
    const written = chord && WRITTEN[chord.quality];
    if (!chord || !written) return null;
    // In C, counted from C. Relative: C is the parent major, the tonic the
    // mode's (A for minor).
    const degreeText = label.trim().split(/\s+/)[0];
    const rootLetter = letterInC(degreeText, chord.pc);
    const bassLetter =
      chord.bassPc === undefined ? null : C_LETTERS[chord.bassPc];
    const rootNote = parseNoteName(rootLetter)!;
    const degree = hybridDegree(tonicNote, rootNote);
    const bassDegree = bassLetter
      ? hybridDegree(tonicNote, parseNoteName(bassLetter)!)
      : null;
    hits.push({
      chords: [
        {
          degree: `${degree} ${written.degree}${bassDegree ? `/${bassDegree}` : ''}`,
          chordName: `${rootLetter}${written.name}${bassLetter ? `/${bassLetter}` : ''}`,
          beat: 1,
          duration: 4,
        },
      ],
    });
  }
  if (hits.length === 0) return null;

  const rounds = Math.max(1, Math.ceil(MIN_BARS / hits.length));
  const modeWord = mode === 'major' ? 'major' : mode;
  const built: Song = {
    id: `progression-${progression.id}`,
    // Its own chords as the chart numbers them: from A, for A minor.
    title: hits.map((bar) => bar.chords[0].degree).join(' – '),
    artist: options.heardIn
      ? `Progression #${progression.id}, as heard in ${options.heardIn}`
      : `Progression #${progression.id}`,
    key: `${buildTonic} ${modeWord}`,
    keyRoot: 60 + TONIC_PC[buildTonic],
    mode,
    tempo: options.bpm ?? 90,
    timeSignature: [4, 4],
    difficulty: 1,
    genreTags: [],
    techniques: [],
    sections: [
      {
        id: 'progression',
        label:
          options.sectionLabel && isSectionLabel(options.sectionLabel)
            ? options.sectionLabel.replace(/ \d+$/, '')
            : 'Verse',
        bars: Array.from({ length: rounds }, () => hits).flat(),
      },
    ],
  } as unknown as Song;

  const target = options.tonicPc ?? TONIC_PC[buildTonic];
  const steps = (((target - TONIC_PC[buildTonic]) % 12) + 12) % 12;
  return steps === 0 ? built : transposeSong(built, steps);
}
