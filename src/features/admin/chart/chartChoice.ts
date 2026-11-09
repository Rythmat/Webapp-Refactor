/**
 * What the console's editors play over: a preset progression in a key, or a
 * typed chart — the Band, Parts, Bass line and Comping editors alike, with
 * the one picker (ChartPicker.tsx). A band saves its choice as `preview`;
 * the others keep it for the session.
 *
 * Everything an editor needs of the choice comes from here: the chart's
 * bars, its key as the parts that follow it read it (chartKey.ts), how its
 * chords spell, and the chords a part captured over it writes down.
 */

import {
  chordSpans,
  chordSymbol,
  guessKey,
  keyPrefersFlats,
  parseChart,
  progressionById,
  PROGRESSIONS,
  quartersPerBar,
  realizePreset,
  type Chord,
  type Progression,
  type TimeSignature,
} from '@/curriculum/engine/bassLines/harmony';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { chartKey } from '@/curriculum/engine/parts/chartKey';
import { PPQ, type PartKey } from '@/curriculum/engine/parts/part';

/** A choice of chart. Leave `progression` out for the meter's default. */
export interface ChartChoice {
  /** A preset's id (harmony.ts PROGRESSIONS), or OWN_CHORDS. */
  progression?: string;
  /** The preset's key, a pitch class. */
  key?: number;
  /** A typed chart ('| Am | Dm | E7 | Am |'), which wins over the preset. */
  chart?: string;
  /**
   * The typed chart's key, when it's set: '| Am | F | C | G |' as C major
   * rather than the A minor its first chord suggests. A hand that Stays in
   * Key plays this key's notes. Its mode is the one the chords fit best.
   */
  chartKey?: { tonic: number; minor: boolean };
}

/**
 * The Parts editor's own choice: a part over the chords it was captured
 * over, as captured.
 */
export const OWN_CHORDS = 'own';

/** The progression an editor opens on: a waltz turnaround in 3. */
export const defaultProgressionId = (ts: TimeSignature) =>
  ts[0] === 3 ? 'turnaround' : PROGRESSIONS[0].id;

/** The key a typed chart's chords suggest: its first chord's. */
export const guessedKey = (bars: Chord[][]) => chartKey(bars);

export interface ChosenChart {
  /** The part's own chords, as captured (OWN_CHORDS): no chart. */
  own: boolean;
  progression: Progression;
  /** The preset's key. */
  keyPc: number;
  /** The typed chart, parsed, when one is typed. */
  typed: { bars: Chord[][]; bad: string[] } | null;
  /** The chart's bars of chords: the typed chart's, else the preset's. */
  bars: Chord[][];
  /** Its key, as the parts that follow it read it. */
  key: PartKey;
  /** A typed chart's key is the one set for it, not a guess. */
  keySet: boolean;
  /** Whether its chords spell with flats. */
  flats: boolean;
}

export function chosenChart(
  choice: ChartChoice,
  ts: TimeSignature,
): ChosenChart {
  const typed = choice.chart?.trim() ? parseChart(choice.chart) : null;
  const isTyped = Boolean(typed?.bars.length);
  const own = !isTyped && choice.progression === OWN_CHORDS;
  const progression = progressionById(
    choice.progression && choice.progression !== OWN_CHORDS
      ? choice.progression
      : defaultProgressionId(ts),
  );
  const keyPc = choice.key ?? 0;
  const bars = isTyped ? typed!.bars : realizePreset(progression, keyPc);
  const minor = Boolean(progression.minor);
  const set = isTyped ? choice.chartKey : undefined;
  // Spelled as before: a preset in the key picked, a typed chart in the key
  // set for it or the one its chords suggest.
  const spelling = set
    ? { pc: set.tonic, minor: set.minor }
    : isTyped
      ? guessKey(bars)
      : { pc: keyPc, minor };
  return {
    own,
    progression,
    keyPc,
    typed,
    bars,
    key: set
      ? chartKey(bars, set.tonic, set.minor)
      : isTyped
        ? chartKey(bars)
        : chartKey(bars, keyPc, minor),
    keySet: Boolean(set),
    flats: keyPrefersFlats(spelling.pc, spelling.minor),
  };
}

/** A part's chords as the Parts editor shows them: 'Dm7 G7 | Cmaj7'. */
export const formatPartChords = (symbols: readonly string[] | undefined) =>
  (symbols ?? []).join(' | ');

/**
 * A part's chords as typed in the Parts editor: bars between '|', a bar's
 * chords splitting it ('Dm7 G7 | Cmaj7'); without a '|', a chord a bar
 * ('Dm9 G13'). Undefined when there are none.
 */
export function parsePartChords(text: string): string[] | undefined {
  const words = (bar: string) => bar.trim().split(/\s+/).filter(Boolean);
  const bars = text.includes('|')
    ? text
        .split('|')
        .map((bar) => words(bar).join(' '))
        .filter(Boolean)
    : words(text);
  return bars.length ? bars : undefined;
}

/** Slots a bar is read in: every even split of 2, 3, 4, 6 or 12. */
const SLOTS = 12;

/** A note the part plays there: when, what, and for how long. */
export interface PlayedNote {
  tick: number;
  midi: number;
  duration?: number;
}

const ROOT_NAME = /^[A-G][#b♯♭]?/;

/**
 * A chart chord named for what a hand plays over it. A hand that never plays
 * the chord's third plays a sus chord: the 4th there makes G7 'Gsus4', the
 * 2nd 'Gsus2' (with the 7th played too, 'G7sus4'). Anything else, a third
 * among it, is the chart's chord as written.
 */
export function soundedSymbol(
  symbol: string,
  pcs: ReadonlySet<number>,
): string {
  const tones = chordSymbolTones(symbol);
  const root = symbol.match(ROOT_NAME)?.[0];
  if (!tones || !root || !pcs.size || tones.third === undefined) return symbol;
  const has = (interval: number) =>
    pcs.has((((tones.rootPc + interval) % 12) + 12) % 12);
  if (has(tones.third)) return symbol;
  const sus = has(5) ? 'sus4' : has(2) ? 'sus2' : null;
  if (!sus) return symbol;
  const slash = symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
  const seventh =
    tones.seventh !== undefined && has(tones.seventh)
      ? tones.seventh === 11
        ? 'maj7'
        : '7'
      : '';
  const named = `${root}${seventh}${sus}${slash}`;
  return chordSymbolTones(named) ? named : `${root}${sus}${slash}`;
}

/**
 * The chords a part captured over a chart writes down: an entry for each of
 * its `bars` bars (InstrumentPart.chordSymbols), each the chords sounding in
 * that bar as a chart writes them — 'Dm7 G7', 'C . . G7' — read off the
 * chart as it plays in the meter (a 2/4 bar is half a chart bar). Given what
 * the part plays (`played`, ticks from the chart's start), each stretch of a
 * chord is named for what sounds there (`soundedSymbol`): a hand that plays
 * Gsus4 and resolves to G halfway through a bar of G7 writes 'Gsus4 G7'.
 */
export function takeChordSymbols(
  bars: readonly (readonly Chord[])[],
  ts: TimeSignature,
  partBars: number,
  flats = true,
  played: readonly PlayedNote[] = [],
): string[] {
  const { spans, totalQuarters } = chordSpans(bars as Chord[][], ts);
  if (!spans.length) return Array.from({ length: partBars }, () => '');
  const barQ = quartersPerBar(ts);
  const symbolOf = (chord: Chord) => chord.symbol ?? chordSymbol(chord, flats);
  const at = (q: number) => {
    const inChart = q % totalQuarters;
    const span =
      spans.find((s) => inChart >= s.start && inChart < s.end) ??
      spans[spans.length - 1];
    return symbolOf(span.chord);
  };
  /** The pitch classes sounding from `startQ` to `endQ`, held ones too. */
  const pcsIn = (startQ: number, endQ: number) =>
    new Set(
      played
        .filter((n) => {
          const from = n.tick / PPQ;
          const to = from + Math.max(1, n.duration ?? 1) / PPQ;
          return from < endQ - 1e-6 && to > startQ + 1e-6;
        })
        .map((n) => ((n.midi % 12) + 12) % 12),
    );
  const slotQ = barQ / SLOTS;
  return Array.from({ length: partBars }, (_, b) => {
    const chart = Array.from({ length: SLOTS }, (_, i) =>
      at(b * barQ + i * slotQ),
    );
    // Each slot's chord as it sounds there; where nothing sounds, as the
    // hand last voiced the same chord.
    const slots: string[] = [];
    chart.forEach((symbol, i) => {
      const pcs = played.length
        ? pcsIn(b * barQ + i * slotQ, b * barQ + (i + 1) * slotQ)
        : new Set<number>();
      slots.push(
        pcs.size
          ? soundedSymbol(symbol, pcs)
          : i > 0 && chart[i - 1] === symbol
            ? slots[i - 1]
            : symbol,
      );
    });
    // The fewest even slots that say the bar, a chord in each.
    const count =
      [1, 2, 3, 4, 6].find((n) =>
        slots.every((s, i) => s === slots[i - (i % (SLOTS / n))]),
      ) ?? SLOTS;
    const tokens = Array.from(
      { length: count },
      (_, k) => slots[k * (SLOTS / count)],
    );
    return tokens
      .map((t, k) => (k > 0 && t === tokens[k - 1] ? '.' : t))
      .join(' ');
  });
}
