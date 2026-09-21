/**
 * lessonChordSymbols.ts — Chord symbols above the staff in Learn.
 *
 * Lessons write chords in whatever form their source had: genre steps carry a
 * symbol per bar ("Ebmaj7", "Bb/D", "Afunk9"), theory activities carry none at
 * all and name their chords by scale degree. This turns either into placed text
 * over the staff, written in the reader's chosen notation.
 *
 * ONE SOURCE OF TRUTH FOR THE TEXT
 * The symbol is written by `lib/chordNotation`, the same formatter the song
 * charts and the Learn overview pages use, so a chord reads identically
 * wherever the student meets it and follows the Jazz/Roman switcher. A label
 * the formatter cannot parse is shown exactly as written rather than dropped —
 * that is what keeps a hand-authored symbol like "Afunk9" intact.
 *
 * LETTERS, NOT DEGREES
 * A lead sheet names its chords by letter, so hybrid is asked for the letter
 * root: "B♭ maj", "E♭ min", "F maj7" — what Studio's lead sheet writes, not the
 * "1 maj" degree numbering the Learn overview pages use. The theory activities
 * name their chords by degree ("6 min"), so this is also what converts those
 * into letters, using the lesson's key.
 *
 * ONE SYMBOL PER CHANGE
 * Lead-sheet convention: a symbol appears where the harmony changes and is
 * understood to hold until the next one. The repeated-strike activities restate
 * the same chord 2, 4 or 8 times a bar, and marking every attack would bury the
 * staff, so consecutive repeats collapse into the first.
 *
 * WHERE A SYMBOL SITS
 * `chordSymbols` is documented as one entry per bar, and for most steps it is:
 * the labels loop across the bars and each sits on its downbeat. But plenty of
 * steps carry more labels than the notes have bars — two chords inside a single
 * bar of voice leading, four across two bars of comping. Spreading those one
 * per bar walks them off the end of the music, so the second chord of a one-bar
 * exercise ends up over the empty bar after it. See `placeLessonChords`.
 */

import {
  formatChord,
  parseChord,
  type ChordContext,
  type ChordNotation,
  type FormatChordOptions,
} from '@/lib/chordNotation';

/** Lead sheets name chords by letter; only hybrid reads this. */
const LEAD_SHEET: FormatChordOptions = { hybridRoot: 'letter' };

/** A chord the lesson plays, and the tick it starts on. */
export interface LessonChord {
  /** The chord as the lesson wrote it: "Ebmaj7", "2 min7", "Bb/D", "Afunk9". */
  label: string;
  startTick: number;
}

/** A chord symbol to draw, with the tick that decides where it sits. */
export interface LessonChordSymbol {
  id: string;
  text: string;
  startTick: number;
}

/**
 * Write one lesson chord in the reader's notation.
 *
 * Falls back to the label as written when it isn't parseable — a curriculum
 * author's own symbol is more trustworthy than an empty space.
 */
export function formatLessonChord(
  label: string,
  notation: ChordNotation,
  context: ChordContext,
): string {
  const spec = parseChord(label);
  if (!spec) return label;
  const text = formatChord(spec, notation, context, LEAD_SHEET);
  return text || label;
}

/**
 * The symbols to draw for one activity: formatted, and thinned to one per
 * harmonic change.
 */
export function lessonChordSymbols(
  chords: readonly LessonChord[],
  notation: ChordNotation,
  context: ChordContext,
): LessonChordSymbol[] {
  const symbols: LessonChordSymbol[] = [];
  let previous: string | null = null;

  for (const chord of [...chords].sort((a, b) => a.startTick - b.startTick)) {
    const text = formatLessonChord(chord.label, notation, context);
    if (!text || text === previous) continue;
    previous = text;
    symbols.push({
      id: `chord-${chord.startTick}-${text}`,
      text,
      startTick: chord.startTick,
    });
  }

  return symbols;
}

/**
 * Spread a per-bar symbol list across an activity, the way the genre steps
 * write them: one entry per bar, looping when the list is shorter than the
 * activity. Mirrors how the backing-track engine reads `chordSymbols`.
 */
export function chordsPerBar(
  labels: readonly string[],
  bars: number,
  ticksPerBar: number,
  startTick = 0,
): LessonChord[] {
  if (labels.length === 0 || bars <= 0) return [];
  return Array.from({ length: bars }, (_, bar) => ({
    label: labels[bar % labels.length],
    startTick: startTick + bar * ticksPerBar,
  }));
}

/** The note onset nearest a tick, or the tick itself when there are none. */
function nearestOnset(tick: number, onsets: readonly number[]): number {
  if (onsets.length === 0) return tick;
  return onsets.reduce((best, onset) =>
    Math.abs(onset - tick) < Math.abs(best - tick) ? onset : best,
  );
}

/**
 * Share a label list out across the notes when the labels outnumber the bars.
 *
 * The content is divided evenly — two labels split a bar in half, four split
 * two bars into quarters — and each label then snaps to the nearest note
 * onset. The snap matters: an exercise ending at 1880 ticks divides at 940,
 * which is nowhere near a note, and a symbol hanging between two chords reads
 * worse than no symbol at all. Snapping puts every label over a real chord.
 */
export function chordsAcrossContent(
  labels: readonly string[],
  contentEndTick: number,
  onsets: readonly number[],
  startTick = 0,
): LessonChord[] {
  if (labels.length === 0 || contentEndTick <= 0) return [];
  const span = contentEndTick / labels.length;
  return labels.map((label, index) => ({
    label,
    startTick: startTick + nearestOnset(index * span, onsets),
  }));
}

/**
 * Where an activity's chord symbols go.
 *
 * With a label per bar or fewer, the labels belong to bars and loop across
 * them — a two-chord progression over four bars is heard twice, not squeezed
 * into the first half. With more labels than bars they cannot be bar-sized, so
 * they are shared out across the notes instead.
 */
export function placeLessonChords(
  labels: readonly string[],
  options: {
    bars: number;
    ticksPerBar: number;
    /** Distinct note onsets, relative to `startTick`. */
    onsets?: readonly number[];
    /** Where the notes stop, relative to `startTick`. */
    contentEndTick?: number;
    startTick?: number;
  },
): LessonChord[] {
  const { bars, ticksPerBar, onsets = [], startTick = 0 } = options;
  if (labels.length <= bars) {
    return chordsPerBar(labels, bars, ticksPerBar, startTick);
  }
  const end = options.contentEndTick ?? bars * ticksPerBar;
  return chordsAcrossContent(labels, end, onsets, startTick);
}
