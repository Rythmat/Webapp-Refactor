/**
 * How many nodes a box can hold on its rings, and which go where. Pure, and
 * knows nothing about what the nodes are. Rings flatten into ellipses in a short
 * wide box, because a true circle there would use only the middle of it.
 */

export type OrbitRing = 'inner' | 'outer';

export interface OrbitGeometry {
  /** Where the middle is, in the box. */
  cx: number;
  cy: number;
  /** Each ring's radius across. Up and down, multiply by `flatten`. */
  outerRadius: number;
  /** 0: no room for an inner ring. */
  innerRadius: number;
  /** Height over width: 1 is a circle. */
  flatten: number;
  capacity: Readonly<Record<OrbitRing, number>>;
}

/** All in rem, the app's own scale. */
const NODE = 2.25;
const LABEL_HEIGHT = 1.25;
const LABEL_WIDTH = 6.25;
const LABEL_WIDTH_NARROW = 5;
const LABEL_GAP = 0.5;
const EDGE = 0.25;
/** Between the rings, so a name clears the node below it. */
const RING_GAP = 4.5;
/** Under this, an inner ring's names would run into the core. */
const INNER_MIN = 3;
/** Room for a card beside the rings, where one opens at the side. */
const CARD = 17.75;
/** A phone's header takes a line more. */
const HEADER_NARROW = 2.6;

const MAX_STRETCH = 1.8;
const NARROW_PX = 640;
/** From here a card opens at the side; under it, it's a sheet from the bottom. */
const SIDE_CARD_PX = 1024;

const fits = (
  radius: number,
  flatten: number,
  across: number,
  down: number,
): number => {
  const circumference = Math.PI * 2;
  return Math.max(
    0,
    Math.min(
      Math.floor((circumference * radius) / across),
      Math.floor((circumference * radius * flatten) / down),
    ),
  );
};

export const orbitGeometry = (
  width: number,
  height: number,
  rem: number,
  centre: { x: number; y: number } = { x: width / 2, y: height / 2 },
): OrbitGeometry => {
  const narrow = width < NARROW_PX;
  const labelWidth = (narrow ? LABEL_WIDTH_NARROW : LABEL_WIDTH) * rem;
  const nodeHalf = (NODE * rem) / 2;
  const edge = EDGE * rem;
  const above = centre.y - nodeHalf - edge - (narrow ? HEADER_NARROW * rem : 0);
  const below = height - centre.y - nodeHalf - LABEL_HEIGHT * rem - edge;
  const sides = Math.min(centre.x, width - centre.x) - labelWidth / 2 - edge;
  const tall = Math.max(0, Math.min(above, below));
  // Never taller than wide. Stretching stops short of a card at the side, but
  // that never squeezes it narrower than a circle.
  const circle = Math.min(tall, Math.max(0, sides));
  const beside = width >= SIDE_CARD_PX ? sides - CARD * rem : sides;
  const outerRadius = Math.max(circle, Math.min(tall * MAX_STRETCH, beside));
  const flatten = outerRadius > 0 ? circle / outerRadius : 1;
  const innerDown = circle - RING_GAP * rem;
  const innerRadius =
    innerDown >= INNER_MIN * rem && flatten > 0 ? innerDown / flatten : 0;
  const across = labelWidth + LABEL_GAP * rem;
  const down = (NODE + LABEL_HEIGHT) * rem;
  return {
    cx: centre.x,
    cy: centre.y,
    outerRadius,
    innerRadius,
    flatten,
    capacity: {
      outer: fits(outerRadius, flatten, across, down),
      inner: innerRadius > 0 ? fits(innerRadius, flatten, across, down) : 0,
    },
  };
};

/**
 * Who takes a ring's slots, by slot. `ranked` is best first; `arrange` puts the
 * winners in their order around the ring. Each pin is shown whatever its rank,
 * first in a free slot, then in place of the lowest-ranked node that isn't
 * pinned, so nothing else moves when a selection brings its neighbours in.
 */
export const assignSlots = (
  ranked: readonly string[],
  pinned: readonly string[],
  capacity: number,
  arrange: (ids: readonly string[]) => readonly string[] = (ids) => ids,
): string[] => {
  if (capacity <= 0) return [];
  const slots = [...arrange(ranked.slice(0, capacity))];
  const pins = new Set(pinned.slice(0, capacity));
  const rank = new Map(ranked.map((id, i) => [id, i]));
  const shown = new Set(slots);
  const replaceable = slots
    .map((id, slot) => ({ id, slot }))
    .filter(({ id }) => !pins.has(id))
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
  for (const id of pins) {
    if (shown.has(id)) continue;
    if (slots.length < capacity) {
      slots.push(id);
    } else {
      const out = replaceable.shift();
      if (!out) break;
      slots[out.slot] = id;
    }
    shown.add(id);
  }
  return slots;
};

/** Where slot `index` of `used` sits, in radians from the top. */
export const slotAngle = (
  index: number,
  used: number,
  ring: OrbitRing,
): number => {
  const step = (Math.PI * 2) / Math.max(1, used);
  return -Math.PI / 2 + step * (index + (ring === 'inner' ? 0.5 : 0));
};
