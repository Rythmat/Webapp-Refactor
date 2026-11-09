/**
 * Groove Lab's grooves: the owner's designed grooves (the console's Drum
 * Grooves designer, data/drumGrooves), cut to a bar or two and to three
 * drums (Peter, 2026-10-21): the kick, the snare, and the hi-hat or the
 * ride, whichever keeps time in those bars.
 *
 * THE THREE ROWS
 *   kick     the bass drum (36, and GM's 35)
 *   snare    the snare (38, GM's 37) and the sidestick (40): a backbeat on
 *            either is the backbeat. The player's pad is the snare, or the
 *            sidestick when the bars have no snare.
 *   cymbal   the hi-hat (42), open or closed: an open hat (46) is the same
 *            row, clicked twice on the grid and played with U on the pads.
 *            Or the ride (51, 53), when it plays more than the hat. The
 *            pedal hat (44) is a foot keeping time under a ride, not the
 *            time itself.
 *
 * THE GRID
 * The coarsest grid every hit in the bars sits on, never finer than the
 * grid the groove was designed on (or the one the game names for it): a
 * rock groove is eight steps a bar, a shuffle twelve, and a played-in
 * Studio take on a 16th grid stays on 16ths. A hit off that grid goes to
 * the step nearest where it was played.
 *
 * The cells are the written notes; the sound is the groove as designed: its
 * swing, and each hit's feel (`offset`, where the drummer pushed or laid
 * back; a jazz ride's swung skip note lives there). The pads are graded
 * against what the player heard. The designer's humanize stays out.
 *
 * Pure, no React.
 */

import {
  barTicks,
  patternTicks,
  PPQ,
  trimmedVelocity,
  type DrumGroove,
  type DrumGrooveHit,
} from '../drumGrooves/drumGroove';
import { swingOnset } from '../genreGeneration/swing';

export type LabLane = 'cymbal' | 'snare' | 'kick';

/** Top to bottom, as the grid shows them. */
export const LAB_LANES: readonly LabLane[] = ['cymbal', 'snare', 'kick'];

export type LabCymbal = 'hat' | 'ride';

export interface LabHit {
  /** Step in the grid, from 0. */
  step: number;
  /** Its written tick from the groove's first downbeat. */
  tick: number;
  /** Where it sounds, with the groove's swing and the drummer's feel. */
  playedTick: number;
  /** The pad it sounds on. */
  note: number;
  /** An open hi-hat. */
  open: boolean;
  velocity: number;
}

export interface LabGroove {
  /** The game's key for this version of the groove. */
  id: string;
  name: string;
  style: string;
  /** Dealt first on its level. */
  lead: boolean;
  kit: string;
  /** The groove's own tempo, quarter-note bpm. */
  tempo: number;
  swing: number;
  timeSignature: [number, number];
  bars: number;
  barTicks: number;
  /** Ticks per step, and steps per quarter note. */
  stepTicks: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  /** All the steps, `bars` bars of them. */
  steps: number;
  cymbal: LabCymbal;
  /** The pad each row plays when the player plays it (the hat closed). */
  pads: Record<LabLane, number>;
  lanes: Record<LabLane, LabHit[]>;
}

export interface LabGrooveOptions {
  key?: string;
  name?: string;
  style?: string;
  lead?: boolean;
  /** Its first bar, from 1. */
  fromBar?: number;
  /** The finest grid it's written on. */
  grid?: DrumGroove['grid'];
  edit?: (hits: readonly DrumGrooveHit[]) => DrumGrooveHit[];
}

const KICK = new Set([35, 36]);
const SNARE = new Set([37, 38]);
const SIDESTICK = 40;
const OPEN_HAT = 46;
const HAT = new Set([42, OPEN_HAT]);
const RIDE = new Set([51, 53]);

/** Steps per quarter note, coarsest first. */
const STEP_CHOICES = [2, 3, 4, 6, 8] as const;

/** Steps per quarter note on each of the designer's grids. */
const DESIGN_STEPS: Record<DrumGroove['grid'], number> = {
  '8n': 2,
  '16n': 4,
  '8t': 3,
  '16t': 6,
  '32n': 8,
};

/** The row a pad belongs to, given the groove's cymbal. */
function laneOf(note: number, cymbal: LabCymbal): LabLane | null {
  if (KICK.has(note)) return 'kick';
  if (SNARE.has(note) || note === SIDESTICK) return 'snare';
  if ((cymbal === 'hat' ? HAT : RIDE).has(note)) return 'cymbal';
  return null;
}

/**
 * The coarsest grid every tick sits on, among those inside the finest grid
 * allowed; else that grid itself.
 */
function stepsPerBeatFor(
  ticks: readonly number[],
  finestGrid: DrumGroove['grid'],
): number {
  const finest = DESIGN_STEPS[finestGrid] ?? 4;
  const fits = (s: number) => ticks.every((t) => t % (PPQ / s) === 0);
  return STEP_CHOICES.find((s) => finest % s === 0 && fits(s)) ?? finest;
}

/**
 * A designed groove as Groove Lab plays it: `bars` bars from its first (or
 * from `options.fromBar`) on three rows. Null when those bars don't make a
 * groove to learn (no cymbal keeping time, or too little else).
 */
export function buildLabGroove(
  groove: DrumGroove,
  bars: number,
  options: LabGrooveOptions = {},
): LabGroove | null {
  const bar = barTicks(groove.timeSignature);
  const start = ((options.fromBar ?? 1) - 1) * bar;
  const length = bars * bar;
  if (start + length > patternTicks(groove)) return null;
  const hits = options.edit ? options.edit(groove.hits) : groove.hits;
  const inBars = hits
    .filter((h) => h.tick >= start && h.tick < start + length)
    .map((h) => ({ ...h, tick: h.tick - start }));

  const count = (set: Set<number>) =>
    inBars.filter((h) => set.has(h.note)).length;
  const hats = count(HAT);
  const rides = count(RIDE);
  if (hats + rides === 0) return null;
  const cymbal: LabCymbal = rides > hats ? 'ride' : 'hat';
  const hasSnare = count(SNARE) > 0;

  const chosen = inBars
    .map((hit) => ({ hit, lane: laneOf(hit.note, cymbal) }))
    .filter(
      (x): x is { hit: (typeof inBars)[number]; lane: LabLane } => !!x.lane,
    );
  const stepsPerBeat = stepsPerBeatFor(
    chosen.map((x) => x.hit.tick),
    options.grid ?? groove.grid,
  );
  const stepTicks = PPQ / stepsPerBeat;
  const steps = Math.round(length / stepTicks);

  const lanes: Record<LabLane, LabHit[]> = { cymbal: [], snare: [], kick: [] };
  for (const { hit, lane } of chosen) {
    const played = hit.tick + (hit.offset ?? 0);
    // On the grid where it's written; off it, where it was played.
    const at = hit.tick % stepTicks === 0 ? hit.tick : played;
    const step = Math.max(0, Math.min(steps - 1, Math.round(at / stepTicks)));
    const velocity = trimmedVelocity(groove, hit);
    const open = hit.note === OPEN_HAT;
    const already = lanes[lane].find((h) => h.step === step);
    if (already) {
      // Two hits on one step (a doubled snare): the louder speaks; an open
      // hat stays open.
      if (velocity > already.velocity)
        Object.assign(already, { note: hit.note, velocity });
      if (open) Object.assign(already, { note: OPEN_HAT, open: true });
      continue;
    }
    lanes[lane].push({
      step,
      tick: step * stepTicks,
      playedTick: Math.max(
        0,
        swingOnset(hit.tick, groove.swing) + (hit.offset ?? 0),
      ),
      note: hit.note,
      open,
      velocity,
    });
  }
  for (const lane of LAB_LANES) lanes[lane].sort((a, b) => a.step - b.step);

  const others = lanes.kick.length + lanes.snare.length;
  if (lanes.cymbal.length < 2 || others < 2) return null;

  return {
    id: options.key ?? groove.id,
    name: options.name ?? groove.name,
    style: options.style ?? groove.genre ?? '',
    lead: !!options.lead,
    kit: groove.kit,
    tempo: groove.tempo,
    swing: groove.swing,
    timeSignature: groove.timeSignature,
    bars,
    barTicks: bar,
    stepTicks,
    stepsPerBeat,
    stepsPerBar: Math.round(bar / stepTicks),
    steps,
    cymbal,
    pads: {
      kick: 36,
      snare: hasSnare ? 38 : SIDESTICK,
      cymbal: cymbal === 'hat' ? 42 : 51,
    },
    lanes,
  };
}

/** Each row's steps, and the open hats', for comparing and drawing. */
export function laneSteps(
  groove: LabGroove,
): Record<LabLane, Set<number>> & { open: Set<number> } {
  return {
    cymbal: new Set(groove.lanes.cymbal.map((h) => h.step)),
    snare: new Set(groove.lanes.snare.map((h) => h.step)),
    kick: new Set(groove.lanes.kick.map((h) => h.step)),
    open: new Set(groove.lanes.cymbal.filter((h) => h.open).map((h) => h.step)),
  };
}

/**
 * Whether a groove's second half is more than its first again: the second
 * bar of a two-bar groove.
 */
export function secondBarDiffers(groove: LabGroove): boolean {
  if (groove.bars < 2) return false;
  const per = groove.steps / 2;
  const half = (lane: LabLane, from: number) =>
    groove.lanes[lane]
      .filter((h) => h.step >= from && h.step < from + per)
      .map((h) => `${h.step - from}${h.open ? 'o' : ''}`)
      .join(',');
  return LAB_LANES.some((lane) => half(lane, 0) !== half(lane, per));
}

/** Every hit, all rows, in the order they sound. */
export function labHits(groove: LabGroove): ({ lane: LabLane } & LabHit)[] {
  return LAB_LANES.flatMap((lane) =>
    groove.lanes[lane].map((hit) => ({ lane, ...hit })),
  ).sort((a, b) => a.playedTick - b.playedTick);
}
