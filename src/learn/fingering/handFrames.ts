import {
  comfortableSpan,
  type FingeredNote,
  type FingeringTimeline,
  type Hand,
  type PianoFinger,
} from '@/lib/learn/pianoFingering';

/** Notes this close together are one chord. */
const CHORD_WINDOW = 30;

/**
 * Where a lesson is, told to the hands by what the keyboard is already
 * lighting: before anything plays (`start`), the notes sounding now (the
 * demo, the in-time guide), the notes due next (out of time), or nothing
 * (Play Now: no hands on a graded take).
 */
export type FingeringCursor =
  | { kind: 'start' }
  | { kind: 'sounding'; midis: ReadonlySet<number> }
  | { kind: 'due'; midis: ReadonlySet<number> }
  | { kind: 'off' };

/** One hand's notes struck together. */
export interface HandGroup {
  onset: number;
  notes: FingeredNote[];
}

/** Each hand's notes, grouped into what it plays at once. */
export function handGroups(t: FingeringTimeline): Record<Hand, HandGroup[]> {
  const out: Record<Hand, HandGroup[]> = { rh: [], lh: [] };
  for (const hand of ['rh', 'lh'] as const)
    for (const n of t.byHand[hand]) {
      const last = out[hand][out[hand].length - 1];
      if (last && n.onset - last.onset <= CHORD_WINDOW) last.notes.push(n);
      else out[hand].push({ onset: n.onset, notes: [n] });
    }
  return out;
}

/** A hand in one place: the key each finger is over, for a run of groups. */
export interface HandPosition {
  keys: ReadonlyMap<PianoFinger, number>;
  first: number;
  last: number;
}

/**
 * Where a hand sits, group by group. It stays put while each finger keeps to
 * one key, its fingers in order and no wider apart than they comfortably
 * reach (a seventh chord, block or broken, is one place for the hand); it
 * moves when one of those breaks: a thumb passing under, a new chord, a
 * leap. `at[g]` is group g's position.
 */
export function handPositions(
  groups: readonly HandGroup[],
  hand: Hand,
): { positions: HandPosition[]; at: number[] } {
  const positions: HandPosition[] = [];
  const at: number[] = [];
  const inOrder = (keys: ReadonlyMap<PianoFinger, number>) => {
    const fingers = [...keys.keys()].sort((a, b) => a - b);
    return fingers.every((a, i) =>
      fingers.slice(i + 1).every((b) => {
        // In hand space: the thumb lowest, whichever hand.
        const d = (keys.get(b)! - keys.get(a)!) * (hand === 'rh' ? 1 : -1);
        // Neighboring fingers hold a third, as in any close-position chord.
        return d > 0 && d <= comfortableSpan(a, b) + (b - a === 1 ? 1 : 0);
      }),
    );
  };
  groups.forEach((g, i) => {
    const here = positions[positions.length - 1];
    if (here) {
      const keys = new Map(here.keys);
      const stays = g.notes.every((n) => {
        const was = keys.get(n.finger);
        if (was !== undefined) return was === n.midi;
        if ([...keys.values()].includes(n.midi)) return false;
        keys.set(n.finger, n.midi);
        return true;
      });
      if (stays && inOrder(keys)) {
        positions[positions.length - 1] = { keys, first: here.first, last: i };
        at.push(positions.length - 1);
        return;
      }
    }
    positions.push({
      keys: new Map(g.notes.map((n) => [n.finger, n.midi])),
      first: i,
      last: i,
    });
    at.push(positions.length - 1);
  });
  return { positions, at };
}

/** What a hand is doing: keys it holds down, keys its fingers wait over. */
export interface HandFrame {
  down: FingeredNote[];
  hover: FingeredNote[];
  /** The group it is at, so the next frame looks forward from here. */
  at: number;
  /** The group it shows: its position is where the hand sits. */
  group: number;
}

const within = (g: HandGroup, midis: ReadonlySet<number>) =>
  g.notes.length > 0 && g.notes.every((n) => midis.has(n.midi));

/**
 * The group that matches, looking forward from where the hand was: the next
 * group first, then staying put, then further on, then from the top (a
 * restarted run).
 */
function find(
  groups: readonly HandGroup[],
  midis: ReadonlySet<number>,
  from: number,
): number {
  if (from + 1 < groups.length && within(groups[from + 1], midis))
    return from + 1;
  if (from >= 0 && within(groups[from], midis)) return from;
  for (let i = from + 2; i < groups.length; i++)
    if (within(groups[i], midis)) return i;
  for (let i = 0; i < Math.min(from, groups.length); i++)
    if (within(groups[i], midis)) return i;
  return -1;
}

/** The fingers of `next` not already holding a key in `down`. */
const waiting = (next: HandGroup | undefined, down: readonly FingeredNote[]) =>
  (next?.notes ?? []).filter((n) => !down.some((d) => d.finger === n.finger));

/** One hand's frame for the cursor; null when it shows nothing. */
export function handFrame(
  groups: readonly HandGroup[],
  cursor: FingeringCursor,
  from: number,
): HandFrame | null {
  if (cursor.kind === 'off' || groups.length === 0) return null;
  if (cursor.kind === 'start')
    return { down: [], hover: groups[0].notes, at: -1, group: 0 };
  const i = find(groups, cursor.midis, from);
  if (cursor.kind === 'due') {
    if (i < 0) {
      const g = Math.min(Math.max(0, from), groups.length - 1);
      return { down: [], hover: groups[g].notes, at: from, group: g };
    }
    return { down: [], hover: groups[i].notes, at: i - 1, group: i };
  }
  // Sounding: down on what plays, the next fingers waiting over their keys.
  if (i < 0) {
    const g = from + 1 < groups.length ? from + 1 : 0;
    return { down: [], hover: groups[g].notes, at: from, group: g };
  }
  return {
    down: groups[i].notes,
    hover: waiting(groups[i + 1], groups[i].notes),
    at: i,
    group: i,
  };
}
