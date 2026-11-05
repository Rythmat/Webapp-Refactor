/**
 * Hands in a piano part, as the Parts editor sets them (PartNote.hand): the
 * selected notes given to one hand, notes split at a key — below it the left
 * hand, from it up the right — or guessed as the grand staff splits them
 * (pianoFingering/hands.ts).
 *
 * A hand is what a lesson grades a note by and the staff draws it on, and
 * what followChords reads a part's stacks by. A note left without one plays
 * with the hand nearest it in pitch, so a note drawn or moved in a part that
 * has hands takes that hand at once. A finger was picked for its hand, so a
 * note that changes hands lets its finger go.
 */

import type { PartNote } from '@/curriculum/engine/parts/part';
import { inferHands, nearestHand } from '@/lib/learn/pianoFingering/hands';

export type Hand = 'lh' | 'rh';

/** A note given to `hand` (to none, for null), its finger let go if it moves. */
function withHand(n: PartNote, hand: Hand | null): PartNote {
  if ((n.hand ?? null) === hand) return n;
  const out: PartNote = { ...n };
  delete out.finger;
  if (hand) out.hand = hand;
  else delete out.hand;
  return out;
}

/** The notes at `indices`, or every note when none are given. */
const chosen = (indices?: readonly number[]) => {
  const picked = indices?.length ? new Set(indices) : null;
  return (i: number) => !picked || picked.has(i);
};

/** The notes at `indices` given to `hand`, or to none. */
export function setHands(
  notes: readonly PartNote[],
  indices: readonly number[],
  hand: Hand | null,
): PartNote[] {
  const picked = new Set(indices);
  return notes.map((n, i) => (picked.has(i) ? withHand(n, hand) : n));
}

/**
 * The notes at `indices` (every note when none are given) split at `split`:
 * below it the left hand, from it up the right.
 */
export function splitHands(
  notes: readonly PartNote[],
  split: number,
  indices?: readonly number[],
): PartNote[] {
  const isChosen = chosen(indices);
  return notes.map((n, i) =>
    isChosen(i) ? withHand(n, n.midi < split ? 'lh' : 'rh') : n,
  );
}

/**
 * The notes at `indices` (every note when none are given) given the hands
 * the grand staff would put them in: treble the right hand, bass the left,
 * whatever hands they had.
 */
export function guessHands(
  notes: readonly PartNote[],
  indices?: readonly number[],
): PartNote[] {
  const isChosen = chosen(indices);
  const picked = notes.flatMap((n, i) => (isChosen(i) ? [i] : []));
  const hands = inferHands(
    picked.map((i) => ({
      midi: notes[i].midi,
      onset: notes[i].tick,
      duration: notes[i].duration,
    })),
  );
  const handOf = new Map(picked.map((i, k) => [i, hands[k]]));
  return notes.map((n, i) => {
    const hand = handOf.get(i);
    return hand ? withHand(n, hand) : n;
  });
}

/**
 * An edit's notes with a hand for each one it added or moved (none was at its
 * tick and pitch before): the hand nearest it in pitch, as it would play
 * anyway. A part without hands is left without them.
 */
export function carryHands(
  next: readonly PartNote[],
  previous: readonly PartNote[],
): PartNote[] {
  const handed = previous.filter((n) => n.hand);
  if (!handed.length) return [...next];
  const before = new Set(previous.map((n) => `${n.tick}:${n.midi}`));
  return next.map((n) =>
    n.hand || before.has(`${n.tick}:${n.midi}`)
      ? n
      : withHand(n, nearestHand(n.midi, handed) ?? null),
  );
}

/** How many notes each hand plays, and how many have no hand. */
export function handCounts(notes: readonly PartNote[]) {
  const counts = { lh: 0, rh: 0, none: 0 };
  for (const n of notes) counts[n.hand ?? 'none']++;
  return counts;
}
