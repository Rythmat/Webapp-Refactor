/**
 * The Chord Comping editor's pure logic: the roll's geometry in each meter,
 * hit placement and snapping, loudness steps, and turning a preview
 * progression into the `chordAt` the realizer voices from.
 */

import {
  chartBarQuarters,
  chordSpans,
  QUALITIES,
  quartersPerBar,
  type Chord,
} from '@/curriculum/engine/bassLines/harmony';
import {
  quartersToTime,
  timeToQuarters,
  type ChordCompingHit,
  type CompingTones,
} from '@/curriculum/engine/chordComping/chordComping';
import type { ChordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { isCompound, PPQ, type TimeSignature } from '@/curriculum/engine/meter';

// ── hits in the editor ──

export interface EditorHit extends ChordCompingHit {
  _id: number;
}

let nextId = 1;
export const newHitId = () => nextId++;

export const withIds = (hits: readonly ChordCompingHit[] = []): EditorHit[] =>
  hits.map((h) => ({ ...h, _id: newHitId() }));

/** Back to file form: no editor ids, and no `tones` when it's the default. */
export const withoutIds = (hits: readonly EditorHit[]): ChordCompingHit[] =>
  hits.map(({ _id, tones, ...h }) =>
    tones && tones !== 'full' ? { ...h, tones } : h,
  );

export const TONE_ROWS: { tones: CompingTones; label: string; hint: string }[] =
  [
    {
      tones: 'full',
      label: 'Full chord',
      hint: 'Every chord tone (up to four), close position',
    },
    {
      tones: 'upper',
      label: 'Upper (no root)',
      hint: 'Without the root: the bass has it',
    },
    {
      tones: 'top',
      label: 'Top note',
      hint: "The voicing's top note alone: a punch or a pick",
    },
  ];

export const rowOfTones = (tones: CompingTones | undefined) =>
  Math.max(
    0,
    TONE_ROWS.findIndex((r) => r.tones === (tones ?? 'full')),
  );

/** Clicking a selected hit steps it through these (soft … accent). */
export const VELOCITY_STEPS = [0.45, 0.6, 0.75, 0.9];
export const DEFAULT_VELOCITY = 0.75;

export const nextVelocity = (v: number | undefined) =>
  VELOCITY_STEPS.find((s) => s > (v ?? DEFAULT_VELOCITY) + 0.02) ??
  VELOCITY_STEPS[0];

// ── geometry ──

export interface RollGeometry {
  /** One column, in quarters. */
  stepQ: number;
  /** Beat-line spacing in quarters: a dotted quarter in 6/8 and 12/8. */
  beatQ: number;
  barQ: number;
  stepsPerBar: number;
  totalSteps: number;
  totalQ: number;
}

/**
 * The roll's columns follow the grid (8ths, 16ths, 8th triplets); beat lines
 * fall on quarters in x/4, on the felt dotted quarter in compound meters, and
 * on each eighth in other x/8 meters (5/8, 7/8).
 */
export function rollGeometry(
  ts: TimeSignature,
  perBeat: number,
  bars: number,
): RollGeometry {
  const barQ = quartersPerBar(ts);
  const stepQ = 1 / perBeat;
  const beatQ = isCompound(ts) ? 1.5 : ts[1] === 8 ? 0.5 : 4 / ts[1];
  const stepsPerBar = Math.max(1, Math.floor(barQ / stepQ + 1e-6));
  return {
    stepQ,
    beatQ,
    barQ,
    stepsPerBar,
    totalSteps: stepsPerBar * bars,
    totalQ: barQ * bars,
  };
}

const round4 = (n: number) => Number(n.toFixed(4));

/** The nearest grid step to `q`, clamped to the pattern. */
export function snapStep(q: number, stepQ: number, totalSteps: number) {
  return Math.max(0, Math.min(totalSteps - 1, Math.round(q / stepQ)));
}

/** A step index as a "bar:beat:sixteenth" time. */
export const timeOfStep = (step: number, stepQ: number, ts: TimeSignature) =>
  quartersToTime(step * stepQ, ts);

/** Where a hit sits, in quarters. */
export const hitQ = (h: Pick<ChordCompingHit, 'time'>, ts: TimeSignature) =>
  timeToQuarters(h.time, ts);

/** A new hit's length: just short of one grid step. */
export const defaultDur = (stepQ: number) => round4(stepQ * 0.9);

/** A hit at `step` in `row`. */
export function newHit(
  step: number,
  row: number,
  g: Pick<RollGeometry, 'stepQ' | 'totalQ'>,
  ts: TimeSignature,
  dur = defaultDur(g.stepQ),
): EditorHit {
  const q = step * g.stepQ;
  const tones = TONE_ROWS[row]?.tones ?? 'full';
  return {
    time: quartersToTime(q, ts),
    dur: round4(Math.min(dur, g.totalQ - q)),
    velocity: DEFAULT_VELOCITY,
    ...(tones === 'full' ? {} : { tones }),
    _id: newHitId(),
  };
}

/** `hit` moved `dSteps` grid steps (snapped) and `dRows` rows. */
export function movedHit<H extends ChordCompingHit>(
  hit: H,
  origQ: number,
  origRow: number,
  dSteps: number,
  dRows: number,
  g: Pick<RollGeometry, 'stepQ' | 'totalSteps'>,
  ts: TimeSignature,
): H {
  const step = snapStep(origQ + dSteps * g.stepQ, g.stepQ, g.totalSteps);
  const row = Math.max(0, Math.min(TONE_ROWS.length - 1, origRow + dRows));
  return withTones(
    { ...hit, time: quartersToTime(step * g.stepQ, ts) },
    TONE_ROWS[row].tones,
  );
}

/** `hit` playing `tones`; 'full' is the default, so it's left out. */
export function withTones<H extends ChordCompingHit>(
  hit: H,
  tones: CompingTones,
): H {
  const next = { ...hit };
  if (tones === 'full') delete next.tones;
  else next.tones = tones;
  return next;
}

/** The length that reaches the end of grid step `endStep`, a hair short. */
export function resizedDur(
  startQ: number,
  endStep: number,
  g: Pick<RollGeometry, 'stepQ' | 'totalQ'>,
) {
  const end = Math.max(startQ + g.stepQ, (endStep + 1) * g.stepQ);
  return round4(Math.min(g.totalQ - startQ, end - startQ) - g.stepQ * 0.1);
}

/** Hits whose start is past the pattern's last bar: they never play. */
export const hitsPastEnd = (
  hits: readonly ChordCompingHit[],
  ts: TimeSignature,
  totalQ: number,
) => hits.filter((h) => hitQ(h, ts) >= totalQ - 1e-6).length;

// ── preview harmony ──

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A Bass Lines chord as the tones the comping realizer voices. */
export function chordTones(chord: Chord): ChordSymbolTones {
  if (chord.nc) return { rootPc: 0, bassPc: 0, intervals: [] };
  const spec = QUALITIES[chord.quality as keyof typeof QUALITIES];
  const tones: number[] = spec ? [...spec.tones] : [0, 4, 7];
  const has = (n: number | undefined) =>
    n !== undefined && tones.includes(n) ? n : undefined;
  const seventh = has(spec?.seventh) ?? tones.find((t) => t === 10 || t === 11);
  return {
    rootPc: mod12(chord.root),
    bassPc: mod12(chord.bass ?? chord.root),
    intervals: tones.sort((a, b) => a - b),
    third: has(spec?.third),
    fifth: has(spec?.fifth),
    ...(seventh !== undefined && seventh !== spec?.sixth ? { seventh } : {}),
  };
}

export interface PreviewHarmony {
  /** The chord sounding at a tick (480 per quarter), the chart looping. */
  chordAt: (tick: number) => ChordSymbolTones;
  /** One pass of the chart, in quarters. */
  chartQ: number;
  /** Bars of the pattern's meter to realize: the chart, repeated to cover the pattern. */
  bars: number;
  /** The loop length in quarters. */
  loopQ: number;
}

/**
 * The preview's chords: the chart laid out the way the Bass Lines editor lays
 * it (short meters stretch a chart bar over two), repeated so a long pattern
 * is heard in full.
 */
export function previewHarmony(
  chartBars: Chord[][],
  ts: TimeSignature,
  patternQ: number,
): PreviewHarmony | null {
  if (!chartBars.length) return null;
  const { spans } = chordSpans(chartBars, ts);
  const chartQ = chartBars.length * chartBarQuarters(ts);
  if (!spans.length || chartQ <= 0) return null;
  const loopQ = Math.max(1, Math.ceil(patternQ / chartQ - 1e-6)) * chartQ;
  const tones = spans.map((s) => ({ ...s, tones: chordTones(s.chord) }));
  const chordAt = (tick: number) => {
    const q = (((tick / PPQ) % chartQ) + chartQ) % chartQ;
    return (
      tones.find((s) => q >= s.start - 1e-6 && q < s.end - 1e-6)?.tones ??
      tones[tones.length - 1].tones
    );
  };
  return {
    chordAt,
    chartQ,
    loopQ,
    bars: Math.max(1, Math.round(loopQ / quartersPerBar(ts))),
  };
}
