/**
 * Approaches in a captured part, as the Parts editor marks and writes them
 * (PartNote.approach; parts/followChords.ts plays them).
 *
 * Marking: the selected notes are approaches into their hand's next chord,
 * each note's step read from what was played — B9 over B♭9 is +1 — so it
 * keeps that distance from the goal over any chart. Laying: the menu's
 * pattern (2A 1B…) written before a selected chord, its voicing moved.
 */

import {
  approachPitch,
  chordScale,
  patternSteps,
  type ApproachMotion,
  type ApproachScale,
  type ApproachStep,
} from '@/curriculum/engine/approach/approach';
import type { ChordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import type { PartNote } from '@/curriculum/engine/parts/part';
import type { ApproachChoice } from '../approach/approachEdit';

const handOf = (n: PartNote) => n.hand ?? '-';

/** The distinct pitches a hand strikes at a tick, low to high. */
const voicesAt = (notes: readonly PartNote[], hand: string, tick: number) =>
  [
    ...new Set(
      notes
        .filter((n) => handOf(n) === hand && n.tick === tick)
        .map((n) => n.midi),
    ),
  ].sort((a, b) => a - b);

/** Diatonic steps from `goal` to `midi` in `scale`: the nearest that lands. */
function stepsBetween(goal: number, midi: number, scale: readonly number[]) {
  if (midi === goal) return 0;
  const dir = Math.sign(midi - goal);
  let best = dir;
  let bestGap = Infinity;
  for (let k = 1; k <= 12; k++) {
    const gap = Math.abs(
      approachPitch(goal, dir * k, 'diatonic', scale) - midi,
    );
    if (gap < bestGap) {
      best = dir * k;
      bestGap = gap;
    }
    if (gap === 0) break;
  }
  return best;
}

/** Which goal voice an approach voice moves with: by place, else the nearest. */
const voiceFor = (voices: number[], goals: number[], midi: number) =>
  voices.length === goals.length
    ? goals[voices.indexOf(midi)]
    : goals.reduce((best, g) =>
        Math.abs(g - midi) < Math.abs(best - midi) ? g : best,
      );

/**
 * The selected notes marked as approaches into their hand's next chord
 * (round the loop, at the end), each its step from the goal note it moves
 * with: half steps, or steps of `scale` for a diatonic mark.
 */
export function markApproach(
  notes: readonly PartNote[],
  indices: readonly number[],
  motion: ApproachMotion,
  scale: ApproachScale,
  /** The part's key's notes, for a diatonic mark. */
  keyScale: readonly number[],
  /** The part's own chord at a tick, for a mark diatonic to the goal. */
  chordAt?: (tick: number) => ChordSymbolTones | null,
): PartNote[] {
  const picked = new Set(indices);
  const out = notes.map((n) => ({ ...n }));
  const hands = new Set(indices.map((i) => handOf(notes[i])));
  for (const hand of hands) {
    const mine = indices.filter((i) => handOf(notes[i]) === hand);
    const last = Math.max(...mine.map((i) => notes[i].tick));
    const rest = notes.filter((n, i) => !picked.has(i) && handOf(n) === hand);
    if (!rest.length) continue;
    const after = rest.filter((n) => n.tick > last);
    const goalTick = Math.min(
      ...(after.length ? after : rest).map((n) => n.tick),
    );
    const goals = voicesAt(rest, hand, goalTick);
    const chord = chordAt?.(goalTick);
    const steps =
      motion === 'diatonic'
        ? scale === 'goal' && chord
          ? chordScale(chord)
          : keyScale
        : undefined;
    for (const i of mine) {
      const n = notes[i];
      const voices = [
        ...new Set(
          mine
            .filter((k) => notes[k].tick === n.tick)
            .map((k) => notes[k].midi),
        ),
      ].sort((a, b) => a - b);
      const goal = voiceFor(voices, goals, n.midi);
      const step =
        motion === 'chromatic'
          ? n.midi - goal
          : stepsBetween(goal, n.midi, steps!);
      out[i].approach = {
        step,
        motion,
        ...(motion === 'diatonic' && scale === 'goal' ? { scale: 'goal' } : {}),
      } as ApproachStep;
    }
  }
  return out;
}

/** The selected notes no longer approaches. */
export const clearApproach = (
  notes: readonly PartNote[],
  indices: readonly number[],
): PartNote[] =>
  notes.map((n, i) => {
    if (!indices.includes(i)) return n;
    const next = { ...n };
    delete next.approach;
    delete next.goal;
    return next;
  });

/**
 * The menu's pattern written before the selected chord (the selection's
 * notes at its first tick, in that hand): its voicing moved each step, a
 * chord `lengthTicks` long each, the last ending where it starts — in place
 * of that hand's notes there; one ringing into them ends where they start.
 */
export function layApproach(
  notes: readonly PartNote[],
  indices: readonly number[],
  choice: ApproachChoice,
  lengthTicks: number,
  /** The part's loop, in ticks. */
  loop: number,
  keyScale: readonly number[],
  chordAt?: (tick: number) => ChordSymbolTones | null,
): PartNote[] {
  if (!indices.length) return [...notes];
  const goalTick = Math.min(...indices.map((i) => notes[i].tick));
  const first = notes[indices.find((i) => notes[i].tick === goalTick)!];
  const hand = handOf(first);
  const goalNotes = indices
    .map((i) => notes[i])
    .filter((n) => n.tick === goalTick && handOf(n) === hand)
    .sort((a, b) => a.midi - b.midi);
  const steps = patternSteps(choice.pattern);
  const span = steps.length * lengthTicks;
  const wrap = (t: number) => ((t % loop) + loop) % loop;
  const chord = chordAt?.(goalTick);
  const scale =
    choice.motion === 'diatonic'
      ? choice.scale === 'goal' && chord
        ? chordScale(chord)
        : keyScale
      : undefined;
  const kept = notes
    .filter((n) => {
      if (handOf(n) !== hand) return true;
      const before = wrap(goalTick - n.tick);
      return !(before > 0 && before <= span);
    })
    .map((n) => {
      if (handOf(n) !== hand) return n;
      const toStart = wrap(goalTick - span - n.tick);
      return toStart > 0 && n.duration > toStart
        ? { ...n, duration: toStart }
        : n;
    });
  const laid: PartNote[] = steps.flatMap((step, k) =>
    goalNotes.map((g) => ({
      tick: wrap(goalTick - (steps.length - k) * lengthTicks),
      duration: lengthTicks,
      midi: approachPitch(g.midi, step, choice.motion, scale),
      velocity: g.velocity,
      ...(g.hand ? { hand: g.hand } : {}),
      approach: {
        step,
        motion: choice.motion,
        ...(choice.motion === 'diatonic' && choice.scale === 'goal'
          ? { scale: 'goal' as const }
          : {}),
      },
    })),
  );
  return [...kept, ...laid];
}

/** What the selected notes are, as approaches: '+2 +1 chromatic'. */
export function describeApproach(
  notes: readonly PartNote[],
  indices: readonly number[],
): string | null {
  const marked = indices.map((i) => notes[i]).filter((n) => n.approach);
  if (!marked.length) return null;
  const byTick = new Map<number, number>();
  for (const n of marked) byTick.set(n.tick, n.approach!.step);
  const steps = [...byTick]
    .sort((a, b) => a[0] - b[0])
    .map(([, s]) => `${s > 0 ? '+' : s < 0 ? '−' : '±'}${Math.abs(s)}`);
  const { motion, scale } = marked[0].approach!;
  return `${steps.join(' ')} ${motion}${motion === 'diatonic' ? (scale === 'goal' ? ' to the goal' : ' to the key') : ''}`;
}
