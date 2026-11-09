import type { EraId } from '@/components/atlas/data/musicalEras';
import {
  CONTINENTS,
  continentOf,
  regionLabel,
  type ContinentId,
} from '@/components/atlas/data/placeTree';
import type { PlaceLink, PlaceNodeId } from '@/components/atlas/network/types';
import { WEAK_LINK_MAX } from '@/components/atlas/theme/marks';
import type { RegionId } from '@/components/atlas/types';

/**
 * The ring view's geometry, pure (after the network-graph reference's map
 * that becomes a ring): the places round a circle, by continent, then
 * region, then west to east, from the top and clockwise, so a place keeps
 * its seat when the years change; the links between them as chords bowed
 * toward the middle; each continent's arc of the rim in its colours.
 */

export interface RingPlace {
  id: PlaceNodeId;
  label: string;
  regionId: RegionId;
  lng: number;
  /** Its events in the years shown. */
  events: number;
  /** The era it was busiest in, for its halo's colour. */
  era: EraId | null;
}

export interface RingNode extends RingPlace {
  /** Radians, screen-wise: from +x, clockwise (y runs down). */
  angle: number;
  x: number;
  y: number;
  /** Its halo's radius, px: its area follows its events. */
  halo: number;
  /** Its name reads from the outside in: the ring's left half. */
  flip: boolean;
  continent: ContinentId;
}

export interface RingChord {
  /** `${a}~${b}`, the pair in id order: the same pair, the same chord. */
  id: string;
  /** The way most of its influence ran. */
  from: PlaceNodeId;
  to: PlaceNodeId;
  /** Influences that way, and back. */
  weight: number;
  back: number;
  /** The SVG path, a quadratic curve bowed toward the middle. */
  d: string;
  /** Where it starts and ends, and its middle (for its gradient and pill). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
  width: number;
  weak: boolean;
  /** It touches a place the stop is about. */
  focus: boolean;
  /** Its count shows on it (the focus's strongest). */
  pill: boolean;
}

export interface RingArc {
  id: string;
  label: string;
  continent: ContinentId;
  /** The arc of the rim it spans, as an SVG path. */
  d: string;
  /** Its middle's angle, where its name goes. */
  mid: number;
  span: number;
}

export interface RingLayout {
  size: number;
  cx: number;
  cy: number;
  radius: number;
  nodes: RingNode[];
  chords: RingChord[];
  arcs: RingArc[];
}

/** How many places a ring of `radius` seats: one per 16 px of rim. */
export function ringCapacity(radius: number, phone = false): number {
  if (phone) return 24;
  return Math.max(16, Math.min(64, Math.round((2 * Math.PI * radius) / 16)));
}

export const CHORDS_MAX = 160;
export const PILLS_MAX = 8;
/** How far a chord bows toward the middle (0: straight; 1: through it). */
export const BOW = 0.85;
/**
 * Room outside the dots for the names, px: a fifth of the ring's box, from
 * 56 to 112, so a ring squeezed between the cards and the Inspector keeps
 * a circle worth the name.
 */
export const labelRoom = (size: number): number =>
  Math.round(Math.min(112, Math.max(56, size * 0.2)));

/** The longest name, in letters, for a ring of `size`. */
export const nameLength = (size: number): number =>
  labelRoom(size) >= 100 ? 16 : 10;

const CONTINENT_ORDER = new Map(CONTINENTS.map((c, i) => [c.id, i]));
const REGION_ORDER = new Map(
  CONTINENTS.flatMap((c) => c.regions.map((r, i) => [r, i] as const)),
);

/** The ring's order: continent, region, then west to east. */
export function ringOrder(places: readonly RingPlace[]): RingPlace[] {
  return [...places].sort((a, b) => {
    const ca = CONTINENT_ORDER.get(continentOf(a.regionId)) ?? 0;
    const cb = CONTINENT_ORDER.get(continentOf(b.regionId)) ?? 0;
    return (
      ca - cb ||
      (REGION_ORDER.get(a.regionId) ?? 0) -
        (REGION_ORDER.get(b.regionId) ?? 0) ||
      a.lng - b.lng ||
      a.id.localeCompare(b.id)
    );
  });
}

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (a: number) =>
    `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  return `M${p(a0)} A${r.toFixed(1)},${r.toFixed(1)} 0 ${large} 1 ${p(a1)}`;
};

export function ringLayout({
  places,
  links,
  focus,
  size,
}: {
  places: readonly RingPlace[];
  links: readonly PlaceLink[];
  focus: ReadonlySet<PlaceNodeId>;
  size: number;
}): RingLayout {
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(40, size / 2 - labelRoom(size));
  const ordered = ringOrder(places);

  // A gap of one seat between continents, so each reads as a group.
  const seats: { place: RingPlace; seat: number }[] = [];
  let seat = 0;
  let last: ContinentId | null = null;
  for (const place of ordered) {
    const c = continentOf(place.regionId);
    if (last !== null && c !== last) seat += 1;
    seats.push({ place, seat });
    seat += 1;
    last = c;
  }
  const total = Math.max(1, seat + (ordered.length > 1 ? 1 : 0));
  const angleOf = (s: number) => -Math.PI / 2 + (s / total) * 2 * Math.PI;

  const most = Math.max(1, ...places.map((p) => p.events));
  const nodes: RingNode[] = seats.map(({ place, seat: s }) => {
    const angle = angleOf(s);
    return {
      ...place,
      angle,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      halo: 3 + 9 * Math.sqrt(place.events / most),
      flip: Math.cos(angle) < -1e-9,
      continent: continentOf(place.regionId),
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // One chord per pair, the way most of it ran.
  const pairs = new Map<
    string,
    { a: PlaceNodeId; b: PlaceNodeId; ab: number; ba: number }
  >();
  for (const l of links) {
    if (!byId.has(l.from) || !byId.has(l.to) || l.from === l.to) continue;
    const [a, b] = l.from < l.to ? [l.from, l.to] : [l.to, l.from];
    const key = `${a}~${b}`;
    const pair = pairs.get(key) ?? { a, b, ab: 0, ba: 0 };
    if (l.from === a) pair.ab += l.weight;
    else pair.ba += l.weight;
    pairs.set(key, pair);
  }
  const all = [...pairs.entries()].map(([id, p]) => ({
    id,
    ...p,
    total: p.ab + p.ba,
    focus: focus.has(p.a) || focus.has(p.b),
  }));
  all.sort((x, y) => y.total - x.total || x.id.localeCompare(y.id));
  // All of the focus's chords; the strongest others up to the most drawn.
  const focusCount = all.filter((p) => p.focus).length;
  let others = Math.max(0, CHORDS_MAX - focusCount);
  const kept = all.filter((p) => p.focus || others-- > 0);
  const heaviest = Math.max(1, ...kept.map((p) => p.total));
  const pills = new Set(
    kept
      .filter((p) => p.focus && p.total > WEAK_LINK_MAX)
      .slice(0, PILLS_MAX)
      .map((p) => p.id),
  );

  const chords: RingChord[] = kept.map((p) => {
    const forward = p.ab >= p.ba;
    const from = byId.get(forward ? p.a : p.b)!;
    const to = byId.get(forward ? p.b : p.a)!;
    const mxs = (from.x + to.x) / 2;
    const mys = (from.y + to.y) / 2;
    const qx = mxs + (cx - mxs) * BOW;
    const qy = mys + (cy - mys) * BOW;
    return {
      id: p.id,
      from: from.id,
      to: to.id,
      weight: forward ? p.ab : p.ba,
      back: forward ? p.ba : p.ab,
      d: `M${from.x.toFixed(1)},${from.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${to.x.toFixed(1)},${to.y.toFixed(1)}`,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      // A quadratic's middle: a quarter each end, half the control.
      mx: 0.25 * from.x + 0.5 * qx + 0.25 * to.x,
      my: 0.25 * from.y + 0.5 * qy + 0.25 * to.y,
      width: 1 + 7 * Math.sqrt(p.total / heaviest),
      weak: p.total <= WEAK_LINK_MAX,
      focus: p.focus,
      pill: pills.has(p.id),
    };
  });

  // Each region's arc of the rim, from its first seat to its last.
  const half = Math.PI / total;
  const arcs: RingArc[] = [];
  for (const node of nodes) {
    const prev = arcs[arcs.length - 1];
    if (prev && prev.id === node.regionId) {
      const a0 = prev.mid - prev.span / 2;
      const a1 = node.angle + half * 0.8;
      prev.span = a1 - a0;
      prev.mid = a0 + prev.span / 2;
      prev.d = arcPath(cx, cy, radius - 16, a0, a1);
    } else {
      const a0 = node.angle - half * 0.8;
      const a1 = node.angle + half * 0.8;
      arcs.push({
        id: node.regionId,
        label: regionLabel(node.regionId),
        continent: node.continent,
        d: arcPath(cx, cy, radius - 16, a0, a1),
        mid: node.angle,
        span: a1 - a0,
      });
    }
  }

  return { size, cx, cy, radius, nodes, chords, arcs };
}

/**
 * Keys round the ring: ←/→ the next place, PgUp/PgDn the next region's
 * first, Home/End the ends. The index moved to, or null for another key.
 */
export function ringKey(
  key: string,
  at: number,
  nodes: readonly Pick<RingNode, 'regionId'>[],
): number | null {
  const n = nodes.length;
  if (n === 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (at + 1) % n;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (at - 1 + n) % n;
    case 'Home':
      return 0;
    case 'End':
      return n - 1;
    case 'PageDown': {
      for (let i = at + 1; i < n; i++) {
        if (nodes[i].regionId !== nodes[at].regionId) return i;
      }
      return 0;
    }
    case 'PageUp': {
      // The start of this region, else of the one before.
      let i = at;
      while (i > 0 && nodes[i - 1].regionId === nodes[at].regionId) i--;
      if (i !== at) return i;
      if (i === 0) return null;
      const before = nodes[i - 1].regionId;
      let j = i - 1;
      while (j > 0 && nodes[j - 1].regionId === before) j--;
      return j;
    }
    default:
      return null;
  }
}
