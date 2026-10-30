/**
 * The links on the map, pure: their features, their flow and their draw.
 */
import type { LayerSpecification } from 'maplibre-gl';
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
import {
  PILLS_MAX,
  arcLinkFeatures,
  compactCount,
  scopeLinkFeatures,
  worldLinkFeatures,
} from './networkFeatures';
import {
  FLOW_PHASES,
  NETWORK_LAYER,
  networkLineLayers,
  phaseDash,
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

  it('puts count pills on the strongest, strongest first', () => {
    expect(links.pills.features.map((f) => f.properties.count)).toEqual([
      '14',
      '5',
    ]);
    expect(links.pills.features[0].properties.rank).toBe(0);
    const many = scopeLinkFeatures(ix, {
      roots: Array.from({ length: 12 }, (_, i) => ({
        ...link('city:new-orleans', 'city:chicago', 20 - i),
        id: `l${i}`,
      })),
      routes: [],
      local: 0,
      total: 0,
    });
    expect(many.pills.features).toHaveLength(PILLS_MAX);
  });
});

describe('the world’s links and an event’s', () => {
  it('draws the links between regions dotted, opening nothing', () => {
    const world = worldLinkFeatures(ix, [
      link('region:west-africa', 'region:north-america', 40),
    ]);
    expect(world.solid.features).toHaveLength(0);
    expect(world.dotted.features[0].properties).toMatchObject({
      side: 'world',
      place: '',
    });
    expect(world.dotted.features[0].properties.w).toBeLessThanOrEqual(3);
  });

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

  it('writes counts short', () => {
    expect([7, 999, 1000, 2140, 12_400].map(compactCount)).toEqual([
      '7',
      '999',
      '1K',
      '2.1K',
      '12K',
    ]);
  });
});

describe('the flow', () => {
  it('keeps one period and steps the dot along it, phase by phase', () => {
    const period = (d: number[]) => d.reduce((a, b) => a + b, 0);
    const dashed = (d: number[]) => d[0] + d[2];
    const start = (d: number[]) => (d[0] > 0 ? period(d) - d[2] : d[1]);
    let last = -1;
    for (let k = 0; k < FLOW_PHASES; k++) {
      const d = phaseDash(k);
      expect(d).toHaveLength(4);
      expect(period(d)).toBeCloseTo(3);
      expect(dashed(d)).toBeCloseTo(1);
      expect(start(d)).toBeGreaterThan(last);
      last = start(d);
    }
    expect(phaseDash(FLOW_PHASES)).toEqual(phaseDash(0));
  });

  it('shows one phase at first, and never changes a dash after', () => {
    const layers = networkLineLayers();
    const flow = layers.filter((l) =>
      NETWORK_LAYER.flow.includes(l.id),
    ) as Extract<LayerSpecification, { type: 'line' }>[];
    expect(flow).toHaveLength(FLOW_PHASES);
    expect(flow.map((l) => l.paint?.['line-opacity'])).toEqual([
      1, 0, 0, 0, 0, 0,
    ]);
    expect(flow.map((l) => l.paint?.['line-dasharray'])).toEqual(
      flow.map((_, k) => phaseDash(k)),
    );
  });

  it('colours links from the key rainbow, never the brand’s yellow', () => {
    const yellow = KEY_RAINBOW_COLORS[BRAND_YELLOW_INDEX];
    for (const c of [...ROOTS_RAMP, ...ROUTES_RAMP]) expect(c).not.toBe(yellow);
    expect(ROOTS_RAMP.at(-1)).toBe(ROUTES_RAMP[0]);
    const roots = networkLineLayers().find(
      (l) => l.id === NETWORK_LAYER.roots,
    ) as Extract<LayerSpecification, { type: 'line' }>;
    expect(JSON.stringify(roots.paint?.['line-gradient'])).toContain(
      ROOTS_RAMP[0],
    );
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
