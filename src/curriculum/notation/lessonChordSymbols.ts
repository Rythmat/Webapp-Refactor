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
 * WHERE A SYMBOL SITS — the rule
 * Above the measures, as a lead sheet writes it: each chord at the start of
 * its bar, and a change inside a bar on its own beat. When the targets play
 * the chords (voicings, comping, a bass under chords), the strikes tell which
 * chord is in which bar, and a bar's first change sits on its downbeat even
 * when the chord is struck later (a bolero's "and", a groove's beat 3); a
 * second change in the bar sits on its strike — Am9 on beat 1, D13 on beat 3.
 * That is the timeline the backing track plays (chordTimeline.ts `onTheBar`),
 * so what's written and what's heard never disagree. A single line (a melody,
 * a bass line) gets one chord a bar, looping, as the band plays them — Gm7 |
 * C7 | Fmaj7 over a four-bar line, however its notes fall. Only an
 * out-of-time exercise with more chords than bars shares its chords out
 * across the beats. Never past the music: the bars counted are the notes'
 * own, not the roll's padding, which walked a one-bar exercise's second chord
 * onto the empty bar after it. lessonChordPlacement.test.ts holds the whole
 * library to this. See `placeLessonChords`.
 */

import {
  chordStrikes,
  onTheBar,
} from '@/curriculum/engine/genreGeneration/chordTimeline';
import { PPQ } from '@/curriculum/engine/meter';
import {
  formatChord,
  normalizeQuality,
  parseChord,
  type ChordContext,
  type ChordNotation,
  type FormatChordOptions,
} from '@/lib/chordNotation';
import { qualityIntervals } from '@/lib/chordNotation/qualities';

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

const ROOT = '[A-G](?:bb|##|b|#|♭|♯)?';
/**
 * A chord name in running text: a letter root and what follows it up to a
 * space or separator ("Am9", "Ddom13", "Bb/D", "A♭13" in "A♭13-G7alt"), or a
 * root, a space and an abbreviated quality with a number ("A Funk9",
 * "F Dom13"). Never inside a word: the lookbehind keeps "Dorian" and "Bass"
 * whole.
 */
const CHORD_IN_TEXT = new RegExp(
  `(?<![\\w#♭♯])(${ROOT})(?: ((?:[Dd]om|[Mm]in|[Mm]aj|[Ff]unk|[Dd]im|[Aa]ug|[Ss]us)\\d+)(?!\\w)|([^\\s,;:.()\\[\\]→–—-]*))`,
  'g',
);

/** A label the formatter reads as a letter-root chord with a known quality. */
function isLetterChord(label: string): boolean {
  const spec = parseChord(label);
  if (!spec || spec.tonicDegree || spec.root === undefined) return false;
  return !!qualityIntervals(normalizeQuality(spec.quality));
}

/**
 * Chord names in running text — a step's title, its subsection, its
 * direction — written as the symbols over the staff are: "Am9 → Ddom13 Voice
 * Leading" reads "A min9 → D dom13 Voice Leading" in hybrid and "A−9 → D13
 * Voice Leading" in jazz. So a chord is named one way across the whole screen.
 *
 * Only an unmistakable chord changes: a letter root and a quality the
 * formatter knows. A bare number after a letter ("D5", "C6", "B1", "D3") is a
 * note, a section code or a power chord as often as a chord, so it changes
 * only when it is one of `chords`, the step's own; a bare letter never does.
 */
export function formatChordsInText(
  text: string,
  notation: ChordNotation,
  context: ChordContext,
  chords: readonly string[] = [],
): string {
  return text.replace(
    CHORD_IN_TEXT,
    (match, root: string, spaced?: string, attached?: string) => {
      const quality = spaced ?? attached ?? '';
      if (!quality) return match;
      const label = `${root}${quality}`;
      if (!isLetterChord(label)) return match;
      if (/^\d+$/.test(quality)) {
        const jazz = (l: string) => formatLessonChord(l, 'jazz', context);
        if (!chords.some((chord) => jazz(chord) === jazz(label))) return match;
      }
      return formatLessonChord(label, notation, context);
    },
  );
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

/**
 * Labels two to a bar (a step's `chordsPerBar: 2`), each where its half bar
 * starts. A chord held across halves is labelled once.
 */
export function chordsTwoABar(
  labels: readonly string[],
  ticksPerBar: number,
  startTick = 0,
): LessonChord[] {
  const half = ticksPerBar / 2;
  return labels.flatMap((label, i) =>
    i > 0 && labels[i - 1] === label
      ? []
      : [{ label, startTick: startTick + i * half }],
  );
}

/**
 * An out-of-time exercise's chords when they outnumber its bars: shared out
 * evenly across the music, each on the nearest beat (two in a bar on beats 1
 * and 3), never two on one beat and never past the music.
 */
export function chordsOnTheBeats(
  labels: readonly string[],
  contentEndTick: number,
  beatTicks = 480,
  startTick = 0,
): LessonChord[] {
  if (labels.length === 0 || contentEndTick <= 0) return [];
  const out: LessonChord[] = [];
  let previous = -Infinity;
  labels.forEach((label, index) => {
    const even = (index * contentEndTick) / labels.length;
    const tick = Math.max(
      Math.round(even / beatTicks) * beatTicks,
      previous + beatTicks,
    );
    if (tick >= contentEndTick) return;
    previous = tick;
    out.push({ label, startTick: startTick + tick });
  });
  return out;
}

/** What placement reads of a target note. */
export interface PlacementNote {
  onset: number;
  duration: number;
  midi: number;
}

/**
 * Where an activity's chord symbols go (the rule is in the header).
 *
 * Given notes that play the chords, each symbol goes where its chord is
 * struck, a bar's first change moved to that bar's downbeat. Otherwise one
 * label a bar, looping — a two-chord progression over four bars is heard
 * twice — and when the labels outnumber the bars, the bars keep the first
 * ones, as the band plays them. Only `outOfTime` with more labels than bars
 * shares them out across the beats instead. The notes also set the bar count:
 * theirs, not `bars`, when `bars` runs past them (the roll's two-bar minimum).
 */
export function placeLessonChords(
  labels: readonly string[],
  options: {
    bars: number;
    ticksPerBar: number;
    /** The target notes, relative to `startTick`. */
    notes?: readonly PlacementNote[];
    /** Where the notes stop, relative to `startTick` (read from `notes` when given). */
    contentEndTick?: number;
    startTick?: number;
    /** An out-of-time exercise: no band, so chords may share a bar. */
    outOfTime?: boolean;
  },
): LessonChord[] {
  const { ticksPerBar, notes, startTick = 0 } = options;
  if (labels.length === 0) return [];

  const struck = notes?.length ? chordStrikes(labels, notes) : null;
  if (struck) {
    return onTheBar(struck, ticksPerBar).map((chord) => ({
      label: chord.symbol,
      startTick: startTick + chord.tick,
    }));
  }

  const contentEndTick =
    options.contentEndTick ??
    (notes?.length
      ? Math.max(...notes.map((n) => n.onset + n.duration))
      : undefined);
  const bars =
    contentEndTick !== undefined
      ? Math.min(
          options.bars,
          Math.max(1, Math.ceil(contentEndTick / ticksPerBar)),
        )
      : options.bars;

  if (labels.length > bars && options.outOfTime) {
    return chordsOnTheBeats(
      labels,
      contentEndTick ?? bars * ticksPerBar,
      PPQ,
      startTick,
    );
  }
  return chordsPerBar(labels, bars, ticksPerBar, startTick);
}
