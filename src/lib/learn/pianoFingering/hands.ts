import { assignStaves } from '@/lib/notation/staffSplit';
import type { FingeringContext, FingeringInputNote, Hand } from './types';

/**
 * The hand of the handed note nearest in pitch: a note added without a hand,
 * among notes that have one, is played by the hand already near it.
 */
export function nearestHand(
  midi: number,
  handed: readonly { midi: number; hand?: Hand }[],
): Hand | undefined {
  let best: { midi: number; hand?: Hand } | undefined;
  for (const h of handed) {
    if (!h.hand) continue;
    if (!best || Math.abs(h.midi - midi) < Math.abs(best.midi - midi)) best = h;
  }
  return best?.hand;
}

/** Notes this close together start as one chord. */
const CHORD_WINDOW = 30;
/** Most keys one hand holds at once. */
const MAX_ONE_HAND_NOTES = 5;
/** Thumb to little finger, at a stretch. */
const MAX_ONE_HAND_SPAN = 14;

/**
 * Which hand plays each note: its own hand; else the hand of the nearest
 * handed note; else the step's default hand, for every chord one hand can
 * hold; else (and for wider chords) the staff the notation would put it on,
 * treble the right hand, so the fingering matches the grand staff.
 */
export function inferHands(
  notes: readonly FingeringInputNote[],
  ctx: FingeringContext = {},
): Hand[] {
  const handed = notes.filter((n) => n.hand);
  if (handed.length)
    return notes.map(
      (n) => n.hand ?? nearestHand(n.midi, handed) ?? ctx.defaultHand ?? 'rh',
    );
  const byStaff = staffHands(notes);
  const defaultHand = ctx.defaultHand;
  if (!defaultHand) return byStaff;
  // Chords one hand can't hold (a bass note under a voicing, a two-hand
  // chord) split as the staff splits them, whatever the step's hand.
  const order = notes
    .map((_, i) => i)
    .sort((a, b) => notes[a].onset - notes[b].onset);
  const hands: Hand[] = notes.map(() => defaultHand);
  for (let k = 0; k < order.length; ) {
    const start = notes[order[k]].onset;
    const group: number[] = [];
    while (k < order.length && notes[order[k]].onset - start <= CHORD_WINDOW)
      group.push(order[k++]);
    const midis = [...new Set(group.map((i) => notes[i].midi))];
    const span = Math.max(...midis) - Math.min(...midis);
    if (midis.length > MAX_ONE_HAND_NOTES || span > MAX_ONE_HAND_SPAN)
      for (const i of group) hands[i] = byStaff[i];
  }
  return hands;
}

/** Treble is the right hand, bass the left, as the grand staff splits them. */
function staffHands(notes: readonly FingeringInputNote[]): Hand[] {
  const staves = assignStaves(
    notes.map((n, i) => ({
      id: String(i),
      midi: n.midi,
      startTick: n.onset,
      durationTicks: n.duration,
    })),
    60,
  );
  return notes.map((_, i) => (staves.get(String(i)) === 'bass' ? 'lh' : 'rh'));
}
