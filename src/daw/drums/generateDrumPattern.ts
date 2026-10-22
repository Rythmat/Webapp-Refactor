import type { MidiNoteEvent } from '@prism/engine';

// ── Generate: a drum pattern for the drum grid (owner, 2026-10-22) ─────────
//
// The drum grid's Generate, after Soundtrap's drum editor: one press writes
// a fresh groove over the pattern, no questions asked (another press, another
// groove; undo brings the old one back). A groove is a kick, a snare on the
// backbeat and a hat (or ride) keeping time, with a drummer's accents: loud
// on the beat, softer off it, ghost notes quieter still, and a fill or an
// open hat at the end of the phrase. It is in the style of the kit: the 808
// gets trap (half-time snare, hat rolls), House four on the floor with open
// hats off the beat, every other kit rock, pop and funk.
//
// A phrase is two bars, repeated to fill the clip, the second bar a
// variation of the first. The metre is the song's: the backbeat falls on its
// even beats, so 3/4 and 6/8 get grooves too. Pure; `random` makes it
// repeatable in tests.

/** General MIDI pad notes (instruments/drumKits.ts DRUM_PADS). */
export const PAD = {
  kick: 36,
  snare: 38,
  sidestick: 40,
  closedHat: 42,
  openHat: 46,
  floorTom: 41,
  rackTom2: 45,
  rackTom1: 48,
  crash: 49,
  ride: 51,
} as const;

export type GrooveStyle =
  | 'rock'
  | 'pop'
  | 'funk'
  | 'halftime'
  | 'trap'
  | 'house';

export interface GenerateOptions {
  /** The pattern's length in bars (the clip's); a phrase is two. */
  bars: number;
  /** Ticks in a bar and in a felt beat (a dotted quarter in 6/8), the
   *  song's metre at PPQ 480. */
  barTicks: number;
  beatTicks: number;
  /** The kit the track plays: it picks the styles. */
  kit: string;
  /** 0 ≤ x < 1; Math.random unless a test fixes it. */
  random?: () => number;
  /** A style to write, instead of one picked for the kit. */
  style?: GrooveStyle;
}

/** The styles a kit's Generate picks from. */
export function stylesForKit(kit: string): readonly GrooveStyle[] {
  if (kit === '808') return ['trap', 'halftime'];
  if (kit === 'house') return ['house'];
  return ['rock', 'pop', 'funk', 'halftime'];
}

/** A small seeded generator (mulberry32), for repeatable patterns. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Hit {
  tick: number;
  note: number;
  velocity: number;
}

const clampVel = (v: number) => Math.max(1, Math.min(127, Math.round(v)));

/**
 * A fresh drum pattern, `bars` long, as clip events (clip-relative ticks,
 * one sixteenth long each), sorted by time.
 */
export function generateDrumPattern(opts: GenerateOptions): MidiNoteEvent[] {
  const random = opts.random ?? Math.random;
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length) % items.length];
  const chance = (p: number) => random() < p;
  const jitter = (v: number, spread = 8) =>
    clampVel(v + (random() * 2 - 1) * spread);

  const { barTicks, beatTicks } = opts;
  const bars = Math.max(1, Math.floor(opts.bars));
  const style = opts.style ?? pick(stylesForKit(opts.kit));
  const step = Math.min(120, beatTicks); // a sixteenth
  const perBeat = Math.max(1, Math.round(beatTicks / step));
  const beats = Math.max(1, Math.round(barTicks / beatTicks));
  const steps = Math.max(1, Math.round(barTicks / step));
  const beatStep = (beat: number) => beat * perBeat;

  // The backbeat: the even beats (2 and 4 in 4/4, 2 in 3/4); half time
  // and trap put one snare in the middle of the bar.
  const halfTime = style === 'halftime' || style === 'trap';
  const snareBeats = halfTime
    ? [Math.floor(beats / 2)].filter((b) => b > 0)
    : Array.from({ length: beats }, (_, b) => b).filter((b) => b % 2 === 1);
  const snareSteps = new Set(snareBeats.map(beatStep));
  if (snareSteps.size === 0 && beats > 1) snareSteps.add(beatStep(beats - 1));

  /** One bar's hits; `variation` is the phrase's second bar. */
  const bar = (base: Hit[] | null, variation: boolean, last: boolean) => {
    const hits: Hit[] = [];
    const add = (s: number, note: number, velocity: number) =>
      hits.push({ tick: s * step, note, velocity: clampVel(velocity) });

    // ── Time: hats (or ride), accented on the beat ──
    const sixteenths =
      style === 'funk' || style === 'trap' || (style === 'pop' && chance(0.4));
    const timeNote =
      style === 'rock' && chance(0.25) ? PAD.ride : PAD.closedHat;
    for (let s = 0; s < steps; s++) {
      const onBeat = s % perBeat === 0;
      const onEighth = s % 2 === 0;
      if (style === 'house') {
        // Open hats off the beat, closed sixteenths between, quiet.
        if (s % perBeat === perBeat / 2) add(s, PAD.openHat, jitter(92));
        else if (!onBeat && chance(0.5)) add(s, PAD.closedHat, jitter(58));
        continue;
      }
      if (!sixteenths && !onEighth) continue;
      const v = onBeat ? 104 : onEighth ? 80 : 58;
      add(s, timeNote, jitter(v));
    }
    // A trap roll: a beat of the hat in thirty-seconds, once a bar.
    if (style === 'trap' && chance(0.75)) {
      const s0 = beatStep(
        Math.min(beats - 1, 1 + Math.floor(random() * beats)),
      );
      for (let i = hits.length - 1; i >= 0; i--) {
        const s = hits[i].tick / step;
        if (s >= s0 && s < s0 + perBeat) hits.splice(i, 1);
      }
      for (let k = 0; k < perBeat * 2; k++) {
        hits.push({
          tick: s0 * step + (k * step) / 2,
          note: PAD.closedHat,
          velocity: jitter(62 + k * 5, 4),
        });
      }
    }

    // ── Snare on the backbeat; ghosts in funk ──
    for (const s of snareSteps) add(s, PAD.snare, jitter(112, 6));
    if (style === 'funk' || (style === 'pop' && chance(0.3))) {
      for (let s = 1; s < steps; s++) {
        if (snareSteps.has(s) || s % 2 === 0) continue;
        if (chance(0.22)) add(s, PAD.snare, jitter(36, 6));
      }
    }

    // ── Kick: the one, then the style's pushes ──
    const kicks = new Set<number>([0]);
    if (style === 'house') {
      for (let b = 0; b < beats; b++) kicks.add(beatStep(b));
    } else if (base) {
      // The variation keeps the first bar's kick and moves one or two.
      for (const h of base) if (h.note === PAD.kick) kicks.add(h.tick / step);
    } else {
      const weights: number[] = [];
      for (let s = 1; s < steps; s++) {
        if (snareSteps.has(s)) {
          weights.push(0);
          continue;
        }
        const w =
          s % perBeat === 0
            ? 0.55
            : s % 2 === 0
              ? 0.4
              : style === 'rock'
                ? 0.06
                : 0.2;
        weights.push(style === 'trap' ? w * 1.3 : w);
      }
      for (let s = 1; s < steps; s++) {
        if (chance(weights[s - 1] * 0.6)) kicks.add(s);
      }
      // Never a kick right before the snare in rock: it smears the backbeat.
      if (style === 'rock') for (const s of snareSteps) kicks.delete(s - 1);
    }
    if (variation && style !== 'house') {
      const free = Array.from({ length: steps }, (_, s) => s).filter(
        (s) => s > 0 && !snareSteps.has(s) && !kicks.has(s) && s % 2 === 0,
      );
      if (free.length) kicks.add(pick(free));
      const moved = [...kicks].filter((s) => s > 0);
      if (moved.length > 1 && chance(0.5)) kicks.delete(pick(moved));
    }
    for (const s of kicks) add(s, PAD.kick, jitter(s === 0 ? 116 : 98, 6));

    // ── The phrase's end: a fill or an open hat ──
    if (last && style !== 'house') {
      if (chance(0.35) && beats >= 2) {
        // A tom fill after the last beat, high to low: the beat itself
        // (the backbeat in 4/4) stays, the time stops for the toms.
        const s0 = beatStep(beats - 1);
        for (let i = hits.length - 1; i >= 0; i--) {
          const s = hits[i].tick / step;
          const note = hits[i].note;
          if (s > s0 && note !== PAD.kick && note !== PAD.snare) {
            hits.splice(i, 1);
          }
        }
        const toms = [PAD.rackTom1, PAD.rackTom2, PAD.floorTom];
        toms
          .slice(0, Math.max(0, steps - s0 - 1))
          .forEach((note, k) => add(s0 + 1 + k, note, jitter(92 + k * 6, 6)));
      } else if (chance(0.6)) {
        // The last offbeat's hat opens.
        const s = steps - 2;
        for (let i = hits.length - 1; i >= 0; i--) {
          if (hits[i].tick === s * step && hits[i].note === timeNote) {
            hits.splice(i, 1);
          }
        }
        add(s, PAD.openHat, jitter(88));
      }
    }
    return hits;
  };

  const phrase: Hit[][] = [];
  const first = bar(null, false, bars === 1);
  phrase.push(first);
  if (bars > 1) phrase.push(bar(first, true, true));

  const out: MidiNoteEvent[] = [];
  for (let b = 0; b < bars; b++) {
    // The phrase repeats; the clip's last bar always ends it.
    const isLast = b === bars - 1;
    const source =
      bars === 1 ? first : isLast || b % 2 === 1 ? phrase[1] : phrase[0];
    for (const h of source) {
      out.push({
        note: h.note,
        velocity: h.velocity,
        startTick: b * barTicks + h.tick,
        durationTicks: step,
        channel: 10,
      });
    }
  }
  // A crash on the very first downbeat now and then, as a drummer starts.
  if (style !== 'house' && chance(0.3)) {
    out.push({
      note: PAD.crash,
      velocity: jitter(100, 6),
      startTick: 0,
      durationTicks: step,
      channel: 10,
    });
  }
  return out.sort((a, b) => a.startTick - b.startTick || a.note - b.note);
}

/** The bars Generate writes into a clip `length` ticks long: 2 for none. */
export function generateBars(length: number, barTicks: number): number {
  if (length <= 0) return 2;
  return Math.max(1, Math.min(16, Math.ceil(length / barTicks - 1e-6)));
}
