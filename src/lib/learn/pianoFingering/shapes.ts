import { isBlack } from './costs';
import type { Hand, PianoFinger, RootTriad } from './types';

type Shape = { rh: PianoFinger[]; lh: PianoFinger[] };

const shape = (rh: string, lh: string): Shape => ({
  rh: [...rh].map(Number) as PianoFinger[],
  lh: [...lh].map(Number) as PianoFinger[],
});

/**
 * Block chords and in-position arpeggios as method books finger them, by the
 * intervals between the notes from the bottom up. Fingers are listed from
 * the lowest note: a left-hand root-position triad is 5-3-1.
 */
const SHAPES: Record<string, Shape> = {
  // Octave.
  '12': shape('15', '51'),
  // Triads: root position, first inversion, second inversion.
  '4,3': shape('135', '531'),
  '3,4': shape('135', '531'),
  '3,3': shape('135', '531'),
  '4,4': shape('135', '531'),
  '3,5': shape('125', '531'),
  '4,5': shape('125', '531'),
  '3,6': shape('125', '531'),
  '5,4': shape('135', '521'),
  '5,3': shape('135', '521'),
  '6,3': shape('135', '521'),
  // Four notes in close position, a third apart: seventh chords in root
  // position, and the same stack from the third (3-5-7-9). The right hand
  // plays them thumb, index, ring, little finger (Peter, 2026-10-19), chord
  // or arpeggio, so the hand keeps one shape for them — unless only the
  // third note up is black (MIDDLE_ON_BLACK).
  '4,3,4': shape('1245', '5321'),
  '4,3,3': shape('1245', '5321'),
  '3,4,3': shape('1245', '5321'),
  '3,4,4': shape('1245', '5321'),
  '3,3,4': shape('1245', '5321'),
  '3,3,3': shape('1245', '5321'),
  '4,4,3': shape('1245', '5321'),
  // A triad with its octave, the one-octave arpeggio: root position, then
  // first and second inversion.
  '4,3,5': shape('1235', '5421'),
  '3,4,5': shape('1235', '5421'),
  '3,5,4': shape('1245', '5421'),
  '4,5,3': shape('1245', '5421'),
  '5,4,3': shape('1245', '5321'),
  '5,3,4': shape('1245', '5321'),
};

/** Root-position triads (major, minor, diminished, augmented), by their intervals. */
const ROOT_TRIADS = new Set(['4,3', '3,4', '3,3', '4,4']);

/** The seventh chords in close position, by their intervals. */
const SEVENTHS = new Set([
  '4,3,4',
  '4,3,3',
  '3,4,3',
  '3,4,4',
  '3,3,4',
  '3,3,3',
  '4,4,3',
]);

/**
 * A right-hand seventh whose keys go white white black white, or black
 * white black white (D F A♭ C, E♭ G B♭ D): the middle finger reaches the
 * black key, the ring rests — 1 2 3 5 (Peter's drawing of the shape).
 */
const MIDDLE_ON_BLACK = new Set(['wwbw', 'bwbw']);

/**
 * The shape's fingers for these pitches (any order), lowest first; null when
 * it isn't one. A right-hand root-position triad takes `rootTriad`'s fingers.
 */
export function chordShape(
  midis: readonly number[],
  hand: Hand,
  rootTriad: RootTriad = '135',
): PianoFinger[] | null {
  const sorted = [...new Set(midis)].sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  const key = sorted
    .slice(1)
    .map((m, i) => m - sorted[i])
    .join(',');
  if (
    hand === 'rh' &&
    SEVENTHS.has(key) &&
    MIDDLE_ON_BLACK.has(sorted.map((m) => (isBlack(m) ? 'b' : 'w')).join(''))
  )
    return [1, 2, 3, 5];
  // Thumb, index, ring (FingeringContext.rootTriad). The left hand plays
  // every triad 5-3-1 (Peter, 2026-10-18).
  if (rootTriad === '124' && hand === 'rh' && ROOT_TRIADS.has(key))
    return [1, 2, 4];
  return SHAPES[key]?.[hand] ?? null;
}

/** Most semitones a five-finger position covers: C to G. */
export const FIVE_FINGER_SPAN = 7;

/**
 * Where each finger sits from the thumb in a five-finger position, in hand
 * space: the right hand on C D E F G, the left on G F E D C — the same
 * keys, mirrored.
 */
const POSITION: Record<Hand, Record<PianoFinger, number>> = {
  rh: { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7 },
  lh: { 1: 0, 2: 2, 3: 3, 4: 5, 5: 7 },
};

/**
 * Fingers for pitches that fit one five-finger position: by rank, choosing
 * the fingers whose places best match the pitches (C D E F G is 1 2 3 4 5;
 * C E G is 1 3 5, and 5 3 1 in the left hand). Hand-space pitches: the thumb
 * lowest. Null when the pitches don't fit one position.
 */
export function fiveFingerPosition(
  positions: readonly number[],
  hand: Hand,
): Map<number, PianoFinger> | null {
  const place = POSITION[hand];
  const sorted = [...new Set(positions)].sort((a, b) => a - b);
  if (
    sorted.length === 0 ||
    sorted.length > 5 ||
    sorted[sorted.length - 1] - sorted[0] > FIVE_FINGER_SPAN
  )
    return null;
  let best: PianoFinger[] | null = null;
  let bestCost = Infinity;
  for (const fingers of increasingFingers(sorted.length)) {
    // Each pitch against where its finger sits, from the lowest one's place.
    const base = sorted[0] - place[fingers[0]];
    const cost = sorted.reduce(
      (s, p, i) => s + Math.abs(p - base - place[fingers[i]]),
      0,
    );
    if (cost < bestCost) {
      bestCost = cost;
      best = fingers;
    }
  }
  return new Map(sorted.map((p, i) => [p, best![i]]));
}

const COMBINATIONS = new Map<number, PianoFinger[][]>();

/** Every increasing choice of k fingers, in order (1-2-3 before 1-2-4). */
export function increasingFingers(k: number): PianoFinger[][] {
  const cached = COMBINATIONS.get(k);
  if (cached) return cached;
  const out: PianoFinger[][] = [];
  const pick = (from: number, chosen: PianoFinger[]) => {
    if (chosen.length === k) {
      out.push(chosen);
      return;
    }
    for (let f = from; f <= 5; f++) pick(f + 1, [...chosen, f as PianoFinger]);
  };
  pick(1, []);
  COMBINATIONS.set(k, out);
  return out;
}
