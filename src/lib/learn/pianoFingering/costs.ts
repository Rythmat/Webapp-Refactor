import type { PianoFinger } from './types';

/**
 * How hard a fingering is to play, after Parncutt, Sloboda, Clarke, Raekallio
 * & Desain (1997), "An ergonomic model of keyboard fingering", with Jacobs'
 * (2001) span table. Distances are semitones in "hand space": the pitch for the
 * right hand, the pitch mirrored for the left, so in both hands the thumb is
 * the lowest finger and a negative span is a finger crossing the thumb.
 */

interface Span {
  minPrac: number;
  minComf: number;
  minRel: number;
  maxRel: number;
  maxComf: number;
  maxPrac: number;
}

const span = (...v: number[]): Span => ({
  minPrac: v[0],
  minComf: v[1],
  minRel: v[2],
  maxRel: v[3],
  maxComf: v[4],
  maxPrac: v[5],
});

/** From the lower-numbered finger to the higher. */
const SPANS: Record<string, Span> = {
  '1-2': span(-5, -3, 1, 2, 8, 10),
  '1-3': span(-4, -2, 3, 4, 10, 12),
  '1-4': span(-3, -1, 5, 6, 12, 14),
  '1-5': span(-1, 1, 7, 8, 13, 15),
  '2-3': span(1, 1, 1, 2, 3, 5),
  '2-4': span(1, 1, 3, 4, 5, 7),
  '2-5': span(2, 2, 5, 6, 8, 10),
  '3-4': span(1, 1, 1, 2, 2, 4),
  '3-5': span(1, 1, 3, 4, 5, 7),
  '4-5': span(1, 1, 1, 2, 3, 5),
};

/** The most semitones two fingers comfortably hold apart, thumb side first. */
export function comfortableSpan(a: PianoFinger, b: PianoFinger): number {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return lo === hi ? 0 : SPANS[`${lo}-${hi}`].maxComf;
}

/** Past what a hand can practically reach between two notes. */
export const IMPRACTICAL = 10;
/**
 * One finger playing two different keys in a row: never in legato, so dearer
 * than any stretch a hand can make (an A minor 9 arpeggio is 1 2 3 4 5, not
 * 1 2 2 3 5).
 */
const SAME_FINGER = 15;
/** A finger 4 or 5. */
const WEAK = 1;
/** The thumb on a black key. */
const THUMB_ON_BLACK = 1;

const BLACK = new Set([1, 3, 6, 8, 10]);
export const isBlack = (midi: number) => BLACK.has(((midi % 12) + 12) % 12);

export interface Placed {
  finger: PianoFinger;
  /** Pitch in hand space (see the file note). */
  pos: number;
  /** Real pitch, for black and white keys. */
  midi: number;
}

/** The span rules for two fingers, whether together or one after the other. */
function spanCost(a: Placed, b: Placed): number {
  const [lo, hi] = a.finger < b.finger ? [a, b] : [b, a];
  const s = SPANS[`${lo.finger}-${hi.finger}`];
  const d = hi.pos - lo.pos;
  const thumb = lo.finger === 1;
  let cost = 0;
  // Stretch: past the comfortable span, two points a semitone.
  if (d > s.maxComf) cost += 2 * (d - s.maxComf);
  if (d < s.minComf) cost += 2 * (s.minComf - d);
  // Small span, large span: away from the relaxed span.
  if (d < s.minRel) cost += (thumb ? 2 : 1) * (s.minRel - d);
  if (d > s.maxRel) cost += (thumb ? 1 : 2) * (d - s.maxRel);
  if (d > s.maxPrac || d < s.minPrac) cost += IMPRACTICAL;
  return cost;
}

/** Held together past a hand's reach: no fingering of it is playable. */
const UNPLAYABLE_CHORD = 50;

/** A chord: every pair of its fingers, together. */
export function chordCost(notes: readonly Placed[]): number {
  let cost = 0;
  for (let i = 0; i < notes.length; i++) {
    cost += fingerCost(notes[i]);
    for (let j = i + 1; j < notes.length; j++) {
      const c = spanCost(notes[i], notes[j]);
      cost += c >= IMPRACTICAL ? UNPLAYABLE_CHORD : c;
    }
  }
  return cost;
}

/** What one finger on one key costs, whatever comes before or after. */
export function fingerCost(n: Placed): number {
  let cost = 0;
  if (n.finger >= 4) cost += WEAK;
  if (n.finger === 1 && isBlack(n.midi)) cost += THUMB_ON_BLACK;
  return cost;
}

/** One note to the next. */
export function stepCost(a: Placed, b: Placed): number {
  if (a.finger === b.finger)
    return a.pos === b.pos ? 0 : SAME_FINGER + Math.abs(b.pos - a.pos) / 2;
  let cost = spanCost(a, b);
  const aBlack = isBlack(a.midi);
  const bBlack = isBlack(b.midi);
  // Thumb on black, with a white key either side of it.
  if (b.finger === 1 && bBlack && !aBlack) cost += 2;
  if (a.finger === 1 && aBlack && !bBlack) cost += 2;
  // Five on black, the same.
  if (b.finger === 5 && bBlack && !aBlack) cost += 2;
  if (a.finger === 5 && aBlack && !bBlack) cost += 2;
  // 3 then 4, and 4 on black beside 3 on white.
  if (a.finger === 3 && b.finger === 4) cost += 1;
  const three = a.finger === 3 ? a : b.finger === 3 ? b : null;
  const four = a.finger === 4 ? a : b.finger === 4 ? b : null;
  if (three && four && !isBlack(three.midi) && isBlack(four.midi)) cost += 1;
  // Thumb passing: the thumb beyond the finger it passes.
  const thumb = a.finger === 1 ? a : b.finger === 1 ? b : null;
  const other = thumb === a ? b : a;
  if (thumb && thumb.pos > other.pos) {
    const otherBlack = isBlack(other.midi);
    const thumbBlack = isBlack(thumb.midi);
    if (otherBlack === thumbBlack) cost += 1;
    else if (!otherBlack && thumbBlack) cost += 3;
  }
  return cost;
}

/** Where a finger sits from the thumb in a five-finger position on white keys. */
export const POSITION_OFFSET: Record<PianoFinger, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
};

/** The thumb's place, in hand space, implied by a group of placed fingers. */
export const handPosition = (notes: readonly Placed[]) =>
  notes.reduce((s, n) => s + n.pos - POSITION_OFFSET[n.finger], 0) /
  notes.length;
