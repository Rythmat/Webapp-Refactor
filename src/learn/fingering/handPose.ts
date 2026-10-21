import { keyBox, type KeyRange } from '@/learn/keyboard/lessonKeyboardRange';
import type { Hand, PianoFinger } from '@/lib/learn/pianoFingering';
import type { HandFrame, HandPosition } from './handFrames';
import type { HandPoseArt, HandPoseLibrary } from './handPoseTypes';

/**
 * Which of Peter's drawings a hand shows over the keys, and where. Each
 * drawing is a hand shape (a five-finger position, a triad, a seventh, an
 * octave), with the fingers that play reaching into the keys and the rest
 * curled; some serve two shapes, the fingers one doesn't use hovering. For
 * a position — the keys a hand's fingers stay over for a run of
 * notes — the hand is the drawing whose playing fingers are the position's
 * and whose fingertips best fit its keys, laid over them at the hand's size
 * and stretched a little across if the keys ask. Either hand can show the
 * other's drawing mirrored, when it fits better.
 */

export const FINGERS: PianoFinger[] = [1, 2, 3, 4, 5];

export interface KeyboardGeometry {
  range: KeyRange;
  /** The keys' width and height in pixels. */
  width: number;
  height: number;
}

/** A white key's width in pixels. */
export const whiteKeyWidth = (geo: KeyboardGeometry) =>
  geo.width / whiteCount(geo.range);

function whiteCount(range: KeyRange) {
  let n = 0;
  for (let m = range.low; m <= range.high; m++)
    if (![1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12)) n++;
  return Math.max(1, n);
}

/** A drawing over the keys. Art to screen: x = left + mirror·sx·ax, y = top + sy·ay. */
export interface PlacedHand {
  art: HandPoseArt;
  /** Which of the drawing's shapes: the fingers it plays on these keys. */
  use: readonly PianoFinger[];
  left: number;
  top: number;
  sx: number;
  sy: number;
  mirror: 1 | -1;
}

export type FingerState = 'down' | 'hover' | 'idle';

export interface HandPose extends PlacedHand {
  hand: Hand;
  /** Each finger's state, and its tip on screen if it is on a key in the drawing. */
  fingers: Record<
    PianoFinger,
    { state: FingerState; tip: [number, number] | null }
  >;
}

/**
 * Where on a key a fingertip may sit, as a share of the keys' length (0 the
 * back, 1 the front edge). A black key ends at 0.62: a fingertip on one
 * keeps its pad on it. A hand with a finger on a black key plays its other
 * fingers in between the black keys.
 */
const ON_WHITE = { lo: 0.42, hi: 0.92 };
const THUMB_ON_WHITE = { lo: 0.7, hi: 0.95 };
const AMONG_BLACK = { lo: 0.12, hi: 0.92 };
const ON_BLACK = { lo: 0.12, hi: 0.58 };

/**
 * Where each fingertip would sit if it could, and how hard it pulls the hand
 * there. The thumb plays out at the front, on the key only to its first
 * knuckle (Peter, 2026-10-20), and pulls hardest; the long fingers reach up
 * as far as the drawing takes them from it.
 */
const AIM = {
  thumbOnWhite: 0.88,
  thumbOnBlack: 0.52,
  onWhite: 0.72,
  amongBlack: 0.62,
  onBlack: 0.48,
};
const THUMB_PULL = 4;

/** How far across a drawing stretches, or squeezes, to fit its keys. */
const STRETCH = { min: 0.8, max: 1.3 };
/** How stiffly it keeps its own spread: higher, less stretch for a better fit. */
const STIFF = 1.5;
/** Costs, in squared white keys a fingertip lands off its key. */
const COST = {
  /** Stretching: per squared log of the stretch. */
  stretch: 6,
  /** A finger of the position the shape doesn't play. */
  missing: 5,
  /** A finger the shape plays that the position doesn't use. */
  extra: 0.6,
  /**
   * ...though a relaxed five-finger hand never costs more than this: less
   * than any shape with one finger to spare, so a lone note (a bass line's
   * root again and again) shows the hand at rest around it.
   */
  neutralExtra: 0.5,
  /** The other hand's drawing, mirrored. */
  mirrored: 0.35,
  /** Tips that can't all reach their keys' bands, per key height. */
  depth: 2,
};

/** The drawing, and where it goes, for a hand over these keys. */
export function placeHand(
  hand: Hand,
  keys: ReadonlyMap<PianoFinger, number>,
  geo: KeyboardGeometry,
  library: HandPoseLibrary,
): PlacedHand | null {
  const W = whiteKeyWidth(geo);
  const H = geo.height;
  const scale = W / library.key;
  const targets = [...keys]
    .map(([finger, midi]) => {
      const k = keyBox(geo.range, midi);
      return k
        ? { finger, x: (k.left + k.width / 2) * geo.width, black: k.black }
        : null;
    })
    .filter((t): t is NonNullable<typeof t> => !!t);
  if (!targets.length) return null;
  const amongBlack = targets.some((t) => t.black);

  let best: PlacedHand | null = null;
  let bestCost = Infinity;
  for (const art of library.poses)
    for (const use of art.uses) {
      const mirror: 1 | -1 = art.hand === hand ? 1 : -1;
      const on = targets.filter(
        (t) => use.includes(t.finger) && art.fingers[t.finger],
      );
      if (!on.length) continue;
      const extra = use.length - on.length;
      let cost =
        COST.missing * (targets.length - on.length) +
        (art.neutral
          ? Math.min(COST.extra * extra, COST.neutralExtra)
          : COST.extra * extra) +
        (mirror < 0 ? COST.mirrored : 0);
      if (cost >= bestCost) continue;

      // Across: the tips on their keys' middles, stretching as little as will do.
      const u = on.map((t) => mirror * scale * art.fingers[t.finger]!.tip[0]);
      const ub = u.reduce((s, v) => s + v, 0) / u.length;
      const xb = on.reduce((s, t) => s + t.x, 0) / on.length;
      let num = STIFF * W * W;
      let den = STIFF * W * W;
      on.forEach((t, i) => {
        num += (u[i] - ub) * (t.x - xb);
        den += (u[i] - ub) ** 2;
      });
      const s = Math.max(STRETCH.min, Math.min(STRETCH.max, num / den));
      const left = xb - s * ub;
      on.forEach((t, i) => {
        cost += ((left + s * u[i] - t.x) / W) ** 2;
      });
      cost += COST.stretch * Math.log(s) ** 2;

      // Down the keys: every tip in its key's band if it can be, as near
      // where each would sit (the thumb's pull the strongest) as it can be.
      let lo = -Infinity;
      let hi = Infinity;
      let home = 0;
      let pulls = 0;
      for (const t of on) {
        const band = t.black
          ? ON_BLACK
          : amongBlack
            ? {
                ...AMONG_BLACK,
                hi: t.finger === 1 ? THUMB_ON_WHITE.hi : AMONG_BLACK.hi,
              }
            : t.finger === 1
              ? THUMB_ON_WHITE
              : ON_WHITE;
        const aim =
          t.finger === 1
            ? t.black
              ? AIM.thumbOnBlack
              : AIM.thumbOnWhite
            : t.black
              ? AIM.onBlack
              : amongBlack
                ? AIM.amongBlack
                : AIM.onWhite;
        const pull = t.finger === 1 ? THUMB_PULL : 1;
        const y = scale * art.fingers[t.finger]!.tip[1];
        lo = Math.max(lo, band.lo * H - y);
        hi = Math.min(hi, band.hi * H - y);
        home += (aim * H - y) * pull;
        pulls += pull;
      }
      home /= pulls;
      const top = lo <= hi ? Math.max(lo, Math.min(hi, home)) : (lo + hi) / 2;
      if (lo > hi) cost += (COST.depth * (lo - hi)) / H;

      if (cost < bestCost) {
        best = { art, use, left, top, sx: s * scale, sy: scale, mirror };
        bestCost = cost;
      }
    }
  return best;
}

/** A drawing point on screen. */
export const onScreen = (
  p: PlacedHand,
  [ax, ay]: readonly [number, number],
): [number, number] => [p.left + p.mirror * p.sx * ax, p.top + p.sy * ay];

/**
 * The hand for a frame: its position's drawing, the fingers playing now
 * washed full, the ones whose keys come next washed lightly.
 */
export function handPose(
  hand: Hand,
  frame: HandFrame,
  position: HandPosition,
  placed: PlacedHand,
): HandPose {
  const fingers = {} as HandPose['fingers'];
  for (const f of FINGERS) {
    const tip = placed.art.fingers[f]?.tip;
    fingers[f] = {
      state: 'idle',
      tip:
        tip && position.keys.has(f) && placed.use.includes(f)
          ? onScreen(placed, tip)
          : null,
    };
  }
  const here = (n: { finger: PianoFinger; midi: number }) =>
    position.keys.get(n.finger) === n.midi;
  for (const n of frame.hover) if (here(n)) fingers[n.finger].state = 'hover';
  for (const n of frame.down) if (here(n)) fingers[n.finger].state = 'down';
  return { ...placed, hand, fingers };
}
