/**
 * The ring's geometry, pure: who sits where, which chords are drawn and
 * how, and the keys that move round it.
 */
import { describe, expect, it } from 'vitest';
import type { PlaceLink } from '@/components/atlas/network/types';
import type { RegionId } from '@/components/atlas/types';
import {
  CHORDS_MAX,
  PILLS_MAX,
  labelRoom,
  ringCapacity,
  ringKey,
  ringLayout,
  ringOrder,
  type RingPlace,
} from './ringLayout';

const place = (
  id: string,
  regionId: string,
  lng: number,
  events = 5,
): RingPlace => ({
  id,
  label: id.replace('city:', ''),
  regionId: regionId as RegionId,
  lng,
  events,
  era: 'postwar',
});
const link = (from: string, to: string, weight: number): PlaceLink => ({
  id: `${from}>${to}`,
  from,
  to,
  weight,
  years: [1950, 1960],
  sample: [],
});

const PLACES = [
  place('city:london', 'west-europe', -0.1, 128),
  place('city:lagos', 'west-africa', 3.4),
  place('city:new-orleans', 'north-america', -90.1, 21),
  place('city:chicago', 'north-america', -87.6, 62),
  place('city:tokyo', 'east-asia', 139.7),
  place('city:kingston', 'central-america', -76.8, 41),
];

describe('who sits where', () => {
  it('seats by continent, then region, then west to east', () => {
    expect(ringOrder(PLACES).map((p) => p.id)).toEqual([
      'city:new-orleans',
      'city:chicago',
      'city:kingston',
      'city:london',
      'city:lagos',
      'city:tokyo',
    ]);
  });

  it('keeps a place’s seat order whatever else comes and goes', () => {
    const fewer = PLACES.filter((p) => p.id !== 'city:lagos');
    const order = (ps: RingPlace[]) => ringOrder(ps).map((p) => p.id);
    expect(order(fewer)).toEqual(
      order(PLACES).filter((id) => id !== 'city:lagos'),
    );
  });

  it('starts at the top and runs clockwise, names reading outward', () => {
    const { nodes, cx, cy } = ringLayout({
      places: PLACES,
      links: [],
      focus: new Set(),
      size: 600,
    });
    expect(nodes[0].angle).toBeCloseTo(-Math.PI / 2);
    expect(nodes[0].x).toBeCloseTo(cx);
    expect(nodes[0].y).toBeLessThan(cy);
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i].angle).toBeGreaterThan(nodes[i - 1].angle);
    }
    // The left half's names are turned to read from the outside in.
    for (const n of nodes) expect(n.flip).toBe(n.x < cx - 1e-6);
    // The busiest has the biggest halo.
    const london = nodes.find((n) => n.id === 'city:london')!;
    expect(Math.max(...nodes.map((n) => n.halo))).toBe(london.halo);
  });

  it('seats one place per 16 px of rim, 16 to 64, and 24 on a phone', () => {
    expect(ringCapacity(100)).toBe(39);
    expect(ringCapacity(10)).toBe(16);
    expect(ringCapacity(1000)).toBe(64);
    expect(ringCapacity(1000, true)).toBe(24);
    expect(labelRoom(1000)).toBe(112);
    expect(labelRoom(200)).toBe(56);
  });
});

describe('the chords', () => {
  it('draws one chord a pair, the way most of it ran', () => {
    const { chords } = ringLayout({
      places: PLACES,
      links: [
        link('city:new-orleans', 'city:chicago', 12),
        link('city:chicago', 'city:new-orleans', 3),
        link('city:london', 'city:lagos', 1),
      ],
      focus: new Set(),
      size: 600,
    });
    expect(chords).toHaveLength(2);
    const [jazz, weak] = chords;
    expect(jazz).toMatchObject({
      from: 'city:new-orleans',
      to: 'city:chicago',
      weight: 12,
      back: 3,
      weak: false,
    });
    expect(jazz.width).toBe(8);
    expect(weak.weak).toBe(true);
    expect(weak.width).toBeLessThan(jazz.width);
  });

  it('keeps every chord of the focus, and pills only its strongest', () => {
    const many = Array.from({ length: 70 }, (_, i) =>
      place(`city:p${i}`, 'west-europe', i),
    );
    const places = [...PLACES, ...many];
    const links = [
      ...many.flatMap((a, i) =>
        many.slice(i + 1, i + 4).map((b) => link(a.id, b.id, 5)),
      ),
      ...many.map((p) => link('city:london', p.id, 2)),
    ];
    const { chords } = ringLayout({
      places,
      links,
      focus: new Set(['city:london']),
      size: 900,
    });
    const focus = chords.filter((c) => c.focus);
    expect(focus).toHaveLength(70);
    expect(chords.length).toBeGreaterThanOrEqual(CHORDS_MAX);
    expect(chords.filter((c) => c.pill).length).toBeLessThanOrEqual(PILLS_MAX);
    expect(chords.filter((c) => c.pill).every((c) => c.focus)).toBe(true);
  });
});

describe('keys round the ring', () => {
  const nodes = ringOrder(PLACES);

  it('steps, wraps, and jumps to the ends', () => {
    expect(ringKey('ArrowRight', 0, nodes)).toBe(1);
    expect(ringKey('ArrowLeft', 0, nodes)).toBe(nodes.length - 1);
    expect(ringKey('ArrowRight', nodes.length - 1, nodes)).toBe(0);
    expect(ringKey('Home', 3, nodes)).toBe(0);
    expect(ringKey('End', 0, nodes)).toBe(nodes.length - 1);
    expect(ringKey('a', 0, nodes)).toBeNull();
  });

  it('moves a region at a time with the page keys', () => {
    // New Orleans, Chicago (North America) | Kingston | London | …
    expect(ringKey('PageDown', 0, nodes)).toBe(2);
    expect(ringKey('PageDown', 2, nodes)).toBe(3);
    expect(ringKey('PageUp', 1, nodes)).toBe(0);
    expect(ringKey('PageUp', 3, nodes)).toBe(2);
    expect(ringKey('PageUp', 2, nodes)).toBe(0);
  });
});
