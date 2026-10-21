/**
 * Suggested piano fingering for a lesson's notes: which hand plays each note
 * (hands.ts), then, for each hand, the cheapest finger for every note by the
 * ergonomic costs in costs.ts, found by dynamic programming over the hand's
 * notes in order. What teachers write anyway — the scale tables, chord
 * shapes, a five-finger position — is preferred unless a note can't be played
 * that way. Authored fingers are kept, and the notes around them fit them.
 * Pure and deterministic: the same notes always get the same fingers.
 */

import { chordCost, handPosition, stepCost, type Placed } from './costs';
import { inferHands } from './hands';
import { scaleTable, tableFinger } from './scaleTables';
import { chordShape, fiveFingerPosition, increasingFingers } from './shapes';
import type {
  FingeredNote,
  FingeringContext,
  FingeringInputNote,
  FingeringTimeline,
  Hand,
  NoteFingering,
  PianoFinger,
} from './types';

export type {
  FingeredNote,
  FingeringContext,
  FingeringInputNote,
  FingeringTimeline,
  Hand,
  NoteFingering,
  PianoFinger,
  RootTriad,
} from './types';
export { isPianoFinger } from './types';
export { inferHands, nearestHand } from './hands';
export { comfortableSpan } from './costs';

/** Notes this close together start as one chord. */
const CHORD_WINDOW = 30;
/** A rest this long lets the hand go anywhere. */
const BAR = 1920;
/** A rest this long halves what moving the hand costs. */
const BEAT = 480;
/** Not what a teacher would write: the scale table, chord shape, position. */
const PRIOR = 20;
/** Not what the lesson says. */
const AUTHORED = 1000;
/** A finger still holding a note asked to play another. */
const HELD_FINGER = 12;
/** Thumb to little finger, comfortably: a five-note arpeggio inside it. */
const SPREAD_SPAN = 14;

/** Pitch in hand space: the thumb lowest in both hands. */
const handPos = (midi: number, hand: Hand) => (hand === 'rh' ? midi : -midi);

interface Group {
  onset: number;
  /** Each pitch, ascending in hand space. */
  midis: number[];
  /** Where each pitch's longest note ends. */
  ends: number[];
  /** The input indices of each pitch's notes. */
  members: number[][];
}

function groupsFor(
  indices: readonly number[],
  notes: readonly FingeringInputNote[],
  hand: Hand,
): Group[] {
  const sorted = [...indices].sort(
    (a, b) => notes[a].onset - notes[b].onset || notes[a].midi - notes[b].midi,
  );
  const groups: Group[] = [];
  let current: { onset: number; indices: number[] } | null = null;
  const close = () => {
    if (!current) return;
    const byMidi = new Map<number, number[]>();
    for (const i of current.indices) {
      const list = byMidi.get(notes[i].midi) ?? [];
      list.push(i);
      byMidi.set(notes[i].midi, list);
    }
    const midis = [...byMidi.keys()].sort(
      (a, b) => handPos(a, hand) - handPos(b, hand),
    );
    groups.push({
      onset: current.onset,
      midis,
      members: midis.map((m) => byMidi.get(m)!),
      ends: midis.map((m) =>
        Math.max(
          ...byMidi.get(m)!.map((i) => notes[i].onset + notes[i].duration),
        ),
      ),
    });
  };
  for (const i of sorted) {
    if (!current || notes[i].onset - current.onset > CHORD_WINDOW) {
      close();
      current = { onset: notes[i].onset, indices: [] };
    }
    current.indices.push(i);
  }
  close();
  return groups;
}

// ── What a teacher would write ─────────────────────────────────────────────

type Priors = Map<number, { finger: PianoFinger; weight: number }>;

/**
 * Runs of single notes moving one way by steps in [minStep, maxStep]
 * semitones, as lists of group indices. A run that turns shares the note it
 * turns on.
 */
function runs(groups: readonly Group[], minStep: number, maxStep: number) {
  const out: number[][] = [];
  let run: number[] = [];
  let direction = 0;
  const flush = () => {
    if (run.length > 1) out.push(run);
    run = [];
    direction = 0;
  };
  groups.forEach((g, gi) => {
    if (g.midis.length !== 1) {
      flush();
      return;
    }
    if (run.length === 0) {
      run = [gi];
      return;
    }
    const step = g.midis[0] - groups[run[run.length - 1]].midis[0];
    const size = Math.abs(step);
    if (size < minStep || size > maxStep) {
      flush();
      run = [gi];
      return;
    }
    const sign = Math.sign(step);
    if (direction !== 0 && sign !== direction) {
      const turn = run[run.length - 1];
      flush();
      run = [turn];
    }
    direction = sign;
    run.push(gi);
  });
  flush();
  return out;
}

function priorsFor(
  groups: readonly Group[],
  notes: readonly FingeringInputNote[],
  hand: Hand,
  ctx: FingeringContext,
): Priors {
  const priors: Priors = new Map();
  const set = (index: number, finger: PianoFinger, weight: number) => {
    if (!priors.has(index)) priors.set(index, { finger, weight });
  };
  for (const g of groups)
    for (const members of g.members)
      for (const i of members) {
        const f = notes[i].finger;
        if (f) set(i, f, AUTHORED);
      }
  // A pattern (a position, a chord's shape, a scale's table) gives way where
  // a finger pinned in it says otherwise: the notes around the pin are then
  // fingered by what plays, never pulled across it to keep the pattern.
  const agrees = (members: readonly number[], finger: PianoFinger) =>
    members.every((i) => !notes[i].finger || notes[i].finger === finger);

  // Everything this hand plays fits one five-finger position.
  const position = fiveFingerPosition(
    groups.flatMap((g) => g.midis.map((m) => handPos(m, hand))),
    hand,
  );
  // Only a chord's notes (a triad, broken or held): the chord's fingers, as
  // its block chord takes them — never a tie broken by finger order (D F A
  // as 1 2 5).
  const played = [...new Set(groups.flatMap((g) => g.midis))].sort(
    (a, b) => a - b,
  );
  const ownShape = position && chordShape(played, hand, ctx.rootTriad);
  if (position && ownShape)
    played.forEach((m, k) => position.set(handPos(m, hand), ownShape[k]));
  if (
    position &&
    groups.every((g) =>
      g.midis.every((m, k) =>
        agrees(g.members[k], position.get(handPos(m, hand))!),
      ),
    )
  ) {
    // A left hand on one key all step long is a bass note: the little finger.
    if (hand === 'lh' && position.size === 1)
      for (const k of position.keys()) position.set(k, 5);
    for (const g of groups)
      g.midis.forEach((m, k) => {
        for (const i of g.members[k])
          set(i, position.get(handPos(m, hand))!, PRIOR);
      });
    return priors;
  }

  // Block chords.
  for (const g of groups) {
    if (g.midis.length < 2) continue;
    const shape = chordShape(g.midis, hand, ctx.rootTriad);
    if (!shape) continue;
    const lowFirst = [...g.midis].sort((a, b) => a - b);
    if (
      !g.midis.every((m, k) => agrees(g.members[k], shape[lowFirst.indexOf(m)]))
    )
      continue;
    g.midis.forEach((m, k) => {
      for (const i of g.members[k]) set(i, shape[lowFirst.indexOf(m)], PRIOR);
    });
  }

  // Scale runs, by the key's table.
  const table =
    ctx.tonicPc !== undefined && ctx.scalePcs?.length
      ? scaleTable(ctx.tonicPc, ctx.scalePcs, hand)
      : null;
  if (table)
    for (const run of runs(groups, 1, 3)) {
      const midis = run.map((gi) => groups[gi].midis[0]);
      const pcs = new Set(midis.map((m) => m % 12));
      // Five notes or fewer is a hand position, not a scale.
      if (run.length < 5 || new Set(midis).size < 6) continue;
      if (![...pcs].every((pc) => table.pcs.includes(pc))) continue;
      const extreme = hand === 'rh' ? Math.max(...midis) : Math.min(...midis);
      const fingers = run.map((gi, k) => {
        const midi = midis[k];
        const end = (k === 0 || k === run.length - 1) && midi === extreme;
        return tableFinger(table, midi % 12, hand, end);
      });
      if (
        !run.every(
          (gi, k) => !fingers[k] || agrees(groups[gi].members[0], fingers[k]!),
        )
      )
        continue;
      run.forEach((gi, k) => {
        const finger = fingers[k];
        if (finger)
          for (const i of groups[gi].members[0]) set(i, finger, PRIOR);
      });
    }

  // An arpeggio inside one hand position takes its chord's shape; five notes
  // a hand can span (a minor 9 broken up) take a finger each.
  for (const run of runs(groups, 3, 5)) {
    if (run.length < 3) continue;
    const pitches = run.map((gi) => groups[gi].midis[0]);
    const distinct = new Set(pitches).size;
    const spread =
      distinct === 5 &&
      Math.max(...pitches) - Math.min(...pitches) <= SPREAD_SPAN
        ? ([1, 2, 3, 4, 5] as PianoFinger[])
        : null;
    const shape = spread ?? chordShape(pitches, hand, ctx.rootTriad);
    if (!shape) continue;
    if (spread && hand === 'lh') shape.reverse();
    const lowFirst = [...new Set(run.map((gi) => groups[gi].midis[0]))].sort(
      (a, b) => a - b,
    );
    if (
      !run.every((gi) =>
        agrees(
          groups[gi].members[0],
          shape[lowFirst.indexOf(groups[gi].midis[0])],
        ),
      )
    )
      continue;
    for (const gi of run)
      for (const i of groups[gi].members[0])
        set(i, shape[lowFirst.indexOf(groups[gi].midis[0])], PRIOR);
  }
  return priors;
}

// ── The search ─────────────────────────────────────────────────────────────

const placed = (
  g: Group,
  fingers: readonly PianoFinger[],
  hand: Hand,
): Placed[] =>
  g.midis.map((midi, k) => ({
    finger: fingers[k],
    pos: handPos(midi, hand),
    midi,
  }));

function transition(
  a: Group,
  fa: readonly PianoFinger[],
  b: Group,
  fb: readonly PianoFinger[],
  hand: Hand,
): number {
  const end = Math.max(...a.ends);
  const rest = b.onset - end;
  if (rest >= BAR) return 0;
  const scale = rest >= BEAT ? 0.5 : 1;
  const pa = placed(a, fa, hand);
  const pb = placed(b, fb, hand);
  let cost = 0;
  if (pa.length === 1 && pb.length === 1) cost = stepCost(pa[0], pb[0]);
  else {
    cost = Math.abs(handPosition(pb) - handPosition(pa)) / 2;
    for (const x of pa) {
      const y = pb.find((n) => n.finger === x.finger);
      if (y && y.pos !== x.pos) cost += 1;
    }
  }
  // A finger can't leave a key it is still holding.
  a.ends.forEach((noteEnd, k) => {
    if (noteEnd <= b.onset + CHORD_WINDOW) return;
    const y = pb.find((n) => n.finger === pa[k].finger);
    if (y && y.pos !== pa[k].pos) cost += HELD_FINGER;
  });
  return cost * scale;
}

/** The cheapest fingers for one hand's groups (null for a group over five notes). */
function solve(
  groups: readonly Group[],
  hand: Hand,
  priors: Priors,
): (PianoFinger[] | null)[] {
  const out: (PianoFinger[] | null)[] = groups.map(() => null);
  const nodeCost = (g: Group, fingers: readonly PianoFinger[]) => {
    let cost = chordCost(placed(g, fingers, hand));
    g.members.forEach((members, k) => {
      for (const i of members) {
        const p = priors.get(i);
        if (p && p.finger !== fingers[k]) cost += p.weight;
      }
    });
    return cost;
  };

  let start = 0;
  while (start < groups.length) {
    if (groups[start].midis.length > 5) {
      start++;
      continue;
    }
    // A chain of playable groups.
    let stop = start;
    while (stop < groups.length && groups[stop].midis.length <= 5) stop++;
    const states = groups
      .slice(start, stop)
      .map((g) => increasingFingers(g.midis.length));
    let cost = states[0].map((s) => nodeCost(groups[start], s));
    const back: number[][] = [states[0].map(() => -1)];
    for (let gi = start + 1; gi < stop; gi++) {
      const here = states[gi - start];
      const before = states[gi - start - 1];
      const next: number[] = [];
      const from: number[] = [];
      for (const s of here) {
        let best = Infinity;
        let bestFrom = 0;
        before.forEach((p, pi) => {
          const c =
            cost[pi] + transition(groups[gi - 1], p, groups[gi], s, hand);
          // Ties go to the earlier fingering: the output never changes.
          if (c < best - 1e-9) {
            best = c;
            bestFrom = pi;
          }
        });
        next.push(best + nodeCost(groups[gi], s));
        from.push(bestFrom);
      }
      cost = next;
      back.push(from);
    }
    let pick = 0;
    cost.forEach((c, i) => {
      if (c < cost[pick] - 1e-9) pick = i;
    });
    for (let gi = stop - 1; gi >= start; gi--) {
      out[gi] = states[gi - start][pick];
      pick = back[gi - start][pick];
    }
    start = stop;
  }
  return out;
}

// ── Public ─────────────────────────────────────────────────────────────────

/** Hand and finger for every note, index-aligned with `notes`. */
export function suggestFingering(
  notes: readonly FingeringInputNote[],
  ctx: FingeringContext = {},
): NoteFingering[] {
  const hands = inferHands(notes, ctx);
  const result: NoteFingering[] = notes.map((n, i) => ({
    hand: hands[i],
    finger: n.finger ?? null,
    source: n.finger ? 'authored' : 'suggested',
  }));
  for (const hand of ['rh', 'lh'] as const) {
    const indices = notes.flatMap((_, i) => (hands[i] === hand ? [i] : []));
    if (indices.length === 0) continue;
    const groups = groupsFor(indices, notes, hand);
    const fingers = solve(groups, hand, priorsFor(groups, notes, hand, ctx));
    groups.forEach((g, gi) => {
      const chosen = fingers[gi];
      if (!chosen) return;
      g.members.forEach((members, k) => {
        for (const i of members)
          if (!notes[i].finger) result[i].finger = chosen[k];
      });
    });
  }
  return result;
}

/** The fingered notes, for the hands on the keyboard and the staff's numbers. */
export function buildFingeringTimeline(
  notes: readonly FingeringInputNote[],
  ctx: FingeringContext = {},
): FingeringTimeline {
  const fingering = suggestFingering(notes, ctx);
  const fingered: (FingeredNote | null)[] = notes.map((n, index) => {
    const { hand, finger, source } = fingering[index];
    return finger
      ? {
          index,
          midi: n.midi,
          onset: n.onset,
          duration: n.duration,
          hand,
          finger,
          source,
        }
      : null;
  });
  const byHand: Record<Hand, FingeredNote[]> = { rh: [], lh: [] };
  for (const n of fingered) if (n) byHand[n.hand].push(n);
  for (const list of Object.values(byHand))
    list.sort((a, b) => a.onset - b.onset || a.midi - b.midi);
  return { notes: fingered, byHand };
}
