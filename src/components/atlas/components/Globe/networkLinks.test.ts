/**
 * The links on the map, pure: their features, their colours and their draw.
 */
import { describe, expect, it } from 'vitest';
import type { NetworkIndex } from '@/components/atlas/network/networkIndex';
import type { PlaceLink, PlaceNode } from '@/components/atlas/network/types';
import {
  BRAND_YELLOW_INDEX,
  ROOTS_RAMP,
  ROUTES_RAMP,
  edgeWidth,
} from '@/components/atlas/theme/marks';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { drawOnPlan, drawProgress, lineLength, sliceLine } from './drawOn';
import { arcLinkFeatures, scopeLinkFeatures } from './networkFeatures';
import {
  NETWORK_LAYER,
  PULSE,
  networkLineLayers,
  pulsePaint,
} from './networkLayers';

const node = (
  id: string,
  label: string,
  lat: number,
  lng: number,
): PlaceNode => ({
  id,
  level: id.startsWith('region:') ? 'region' : 'city',
  label,
  lat,
  lng,
  regionId: 'north-america',
  place: id.startsWith('city:') ? { type: 'city', id: id.slice(5) } : null,
});
const NODES = [
  node('city:new-orleans', 'New Orleans', 29.95, -90.07),
  node('city:chicago', 'Chicago', 41.88, -87.63),
  node('city:memphis', 'Memphis', 35.15, -90.05),
  node('city:london', 'London', 51.5, -0.13),
  node('region:west-africa', 'West Africa', 12, -5),
  node('region:north-america', 'North America', 40, -100),
];
const byId = new Map(NODES.map((n) => [n.id, n]));
const ix = {
  edges: [],
  nodeOf: () => '',
  node: (id: string) => byId.get(id),
} as NetworkIndex;

const link = (
  from: string,
  to: string,
  weight: number,
  years: [number, number] = [1917, 1965],
): PlaceLink => ({
  id: `${from}>${to}`,
  from,
  to,
  weight,
  years,
  sample: [],
});

describe('a stop’s links', () => {
  const links = scopeLinkFeatures(ix, {
    roots: [link('city:new-orleans', 'city:chicago', 14)],
    routes: [
      link('city:chicago', 'city:london', 1),
      link('city:chicago', 'city:memphis', 5),
    ],
    local: 0,
    total: 21,
  });

  it('draws strong links solid and weak ties dotted, by side', () => {
    expect(
      links.solid.features.map((f) => [f.properties.id, f.properties.side]),
    ).toEqual([
      ['city:new-orleans>city:chicago', 'in'],
      ['city:chicago>city:memphis', 'out'],
    ]);
    expect(links.dotted.features.map((f) => f.properties.id)).toEqual([
      'city:chicago>city:london',
    ]);
  });

  it('keeps ids stable, sizes by count, and says what each carries', () => {
    const [roots] = links.solid.features;
    expect(roots.id).toBe('city:new-orleans>city:chicago');
    expect(roots.properties).toMatchObject({
      w: edgeWidth(14),
      title: 'New Orleans → Chicago',
      detail: '14 influences · 1917–1965',
      // Into the stop, a click opens where it came from.
      place: 'city:new-orleans',
      eventId: '',
    });
    expect(links.solid.features[1].properties.place).toBe('city:memphis');
  });

  it('runs each line from the influencer to the influenced', () => {
    const coords = links.solid.features[0].geometry.coordinates;
    expect(coords[0]).toEqual([-90.07, 29.95]);
    expect(coords.at(-1)![0]).toBeCloseTo(-87.63);
  });
});

describe('an event’s links', () => {
  it('draws a pinned event’s influences solid, each opening its event', () => {
    const arcs = arcLinkFeatures([
      {
        startLat: 12,
        startLng: -5,
        endLat: 29.95,
        endLng: -90.07,
        label: 'Griots',
        eventId: 'evt-griot',
        direction: 'upstream',
        color: '',
      },
      {
        startLat: 29.95,
        startLng: -90.07,
        endLat: 41.88,
        endLng: -87.63,
        label: 'Chicago jazz',
        eventId: 'evt-chi',
        direction: 'downstream',
        color: '',
      },
    ]);
    expect(
      arcs.solid.features.map((f) => [f.properties.side, f.properties.eventId]),
    ).toEqual([
      ['in', 'evt-griot'],
      ['out', 'evt-chi'],
    ]);
    expect(new Set(arcs.solid.features.map((f) => f.properties.id)).size).toBe(
      2,
    );
  });
});

describe('the colours', () => {
  it('colours links from the key rainbow, never the brand’s yellow', () => {
    const yellow = KEY_RAINBOW_COLORS[BRAND_YELLOW_INDEX];
    for (const c of [...ROOTS_RAMP, ...ROUTES_RAMP]) expect(c).not.toBe(yellow);
    expect(ROOTS_RAMP.at(-1)).toBe(ROUTES_RAMP[0]);
  });
});

describe('drawing on', () => {
  const line = [
    [0, 0],
    [1, 0],
    [2, 0],
    [4, 0],
  ];

  it('cuts a line to a share of its length, from either end', () => {
    expect(lineLength(line)).toBeCloseTo(4);
    expect(sliceLine(line, 0.5)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(sliceLine(line, 0.25, true)).toEqual([
      [3, 0],
      [4, 0],
    ]);
    expect(sliceLine(line, 0)).toHaveLength(2);
    expect(sliceLine(line, 1)).toEqual(line);
  });

  it('starts the nearest first and the farthest last, all within the draw', () => {
    const delays = drawOnPlan([30, 5, 12], { total: 850, perLink: 520 });
    expect(delays).toEqual([330, 0, 165]);
    expect(drawProgress(0, 165)).toBe(0);
    expect(drawProgress(165 + 520, 165)).toBe(1);
    expect(drawOnPlan([7])).toEqual([0]);
  });
});

describe('the far ends', () => {
  const links = scopeLinkFeatures(ix, {
    roots: [
      link('city:new-orleans', 'city:chicago', 14),
      link('city:memphis', 'city:chicago', 3),
    ],
    routes: [
      link('city:chicago', 'city:london', 9),
      link('city:chicago', 'city:new-orleans', 1),
    ],
    local: 0,
    total: 27,
  });

  it('puts a dot where each line came from or went to, each place once', () => {
    const ends = links.ends.features.map((f) => ({
      at: f.geometry.coordinates,
      side: f.properties.side,
    }));
    // New Orleans both gave and took: one dot.
    expect(ends).toHaveLength(3);
    expect(ends[0].at[0]).toBeCloseTo(-90.07);
    expect(ends[0].side).toBe('in');
    expect(ends.some((e) => e.side === 'out' && e.at[1] > 51)).toBe(true);
  });

  it('starts each ring at its own phase', () => {
    const phases = links.ends.features.map((f) => f.properties.phase);
    expect(new Set(phases).size).toBe(phases.length);
    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('grows the ring from the dot and fades it out', () => {
    const { radius, opacity } = pulsePaint(0.25);
    expect(JSON.stringify(radius)).toContain(String(PULSE.from));
    expect(JSON.stringify(opacity)).toContain('phase');
    const layers = networkLineLayers().map((l) => l.id);
    expect(layers.indexOf(NETWORK_LAYER.endRing)).toBeLessThan(
      layers.indexOf(NETWORK_LAYER.endDot),
    );
  });
});
