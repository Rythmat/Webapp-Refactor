import type { RegionId } from '@/components/atlas/types';
import { getCityById } from './lookups';
import type { TimelineEvent } from './timelineIndex';

/**
 * The timeline's lanes: the world, after Dorot's three bands (owner,
 * 2026-10-14: lanes are places, not genres). Four continents flow from one
 * source; open one and it splits into its regions, open a region and it
 * splits into its busiest cities and the rest. Each split shades its parent's
 * hue, so a family of lanes still reads as one.
 */
export type ContinentId = 'americas' | 'europe' | 'africa-me' | 'asia-pacific';

export interface Continent {
  id: ContinentId;
  label: string;
  /** Its hue; its regions and cities are shades of it. */
  color: string;
  /** Its regions, top to bottom. */
  regions: readonly RegionId[];
}

export const CONTINENTS: readonly Continent[] = [
  {
    id: 'americas',
    label: 'Americas',
    color: '#fb7185',
    regions: ['north-america', 'central-america', 'south-america'],
  },
  {
    id: 'europe',
    label: 'Europe',
    color: '#a78bfa',
    regions: ['north-europe', 'west-europe', 'east-europe'],
  },
  {
    id: 'africa-me',
    label: 'Africa & Middle East',
    color: '#fb923c',
    regions: [
      'west-asia',
      'north-africa',
      'west-africa',
      'central-africa',
      'east-africa',
      'south-africa',
    ],
  },
  {
    id: 'asia-pacific',
    label: 'Asia & Pacific',
    color: '#2dd4bf',
    regions: [
      'north-asia',
      'central-asia',
      'south-asia',
      'east-asia',
      'southeast-asia',
      'oceania',
    ],
  },
];

/** The source's colour: every lane leaves it, so it glows nearly white. */
export const SOURCE_COLOR = '#f4f1ee';

const REGION_LABEL: Readonly<Record<RegionId, string>> = {
  'north-america': 'North America',
  'central-america': 'Central America & Caribbean',
  'south-america': 'South America',
  'north-europe': 'Northern Europe',
  'west-europe': 'Western Europe',
  'east-europe': 'Eastern Europe',
  'west-asia': 'Middle East',
  'north-africa': 'North Africa',
  'west-africa': 'West Africa',
  'central-africa': 'Central Africa',
  'east-africa': 'East Africa',
  'south-africa': 'Southern Africa',
  'north-asia': 'North Asia',
  'central-asia': 'Central Asia',
  'south-asia': 'South Asia',
  'east-asia': 'East Asia',
  'southeast-asia': 'Southeast Asia',
  oceania: 'Oceania',
};

const CONTINENT_OF = new Map<RegionId, ContinentId>(
  CONTINENTS.flatMap((c) => c.regions.map((r) => [r, c.id] as const)),
);

export const continentOf = (region: RegionId): ContinentId =>
  CONTINENT_OF.get(region) ?? 'americas';

export const isContinentId = (id: string): id is ContinentId =>
  CONTINENTS.some((c) => c.id === id);

const isRegionId = (id: string): id is RegionId => id in REGION_LABEL;

/** How many of a region's cities get lanes of their own; the rest share one. */
export const CITY_LANES = 5;

/** A lane of the place river. */
export interface PlaceLane {
  /** `americas` · `north-america` · `city:new-orleans` · `rest:north-america` */
  id: string;
  label: string;
  /** 1 a continent, 2 a region, 3 a city (or a region's other places). */
  depth: 1 | 2 | 3;
  /** The lane it split from; null for a continent. */
  parent: string | null;
  color: string;
  /** Whether opening it splits it further. */
  splits: boolean;
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(
    (c) => c / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h * 60, s, l];
}

function toHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * The colour of child `i` of `n`: the parent's hue turned a step either way
 * (wider for regions than for cities), lightness alternating, so siblings
 * stay apart and still read as their parent's.
 */
export function shadeOf(parent: string, i: number, n: number, step: number) {
  const [h, s, l] = toHsl(parent);
  const turn = (i - (n - 1) / 2) * step;
  const lift = i % 2 === 0 ? 0.04 : -0.04;
  return toHex(
    (h + turn + 360) % 360,
    Math.min(1, s),
    Math.min(0.8, Math.max(0.45, l + lift)),
  );
}

/* ── The tree ───────────────────────────────────────────────────────────── */

/** Each region's cities by how many events they hold, busiest first. */
export function cityCounts(
  index: readonly TimelineEvent[],
): Map<RegionId, [string, number][]> {
  const counts = new Map<RegionId, Map<string, number>>();
  for (const t of index) {
    if (!t.cityId) continue;
    const region = counts.get(t.regionId) ?? new Map<string, number>();
    region.set(t.cityId, (region.get(t.cityId) ?? 0) + 1);
    counts.set(t.regionId, region);
  }
  return new Map(
    [...counts].map(([region, cities]) => [
      region,
      [...cities].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    ]),
  );
}

/** The regions that hold any events. */
function regionsWithEvents(index: readonly TimelineEvent[]): Set<RegionId> {
  return new Set(index.map((t) => t.regionId));
}

/**
 * The lanes for a set of opened places, top to bottom: each closed continent
 * is a lane; an open one is its regions (those with events); an open region
 * is its busiest cities and the rest of it.
 */
export function placeLanes(
  index: readonly TimelineEvent[],
  open: ReadonlySet<string>,
): PlaceLane[] {
  const lanes: PlaceLane[] = [];
  const present = regionsWithEvents(index);
  const cities = cityCounts(index);
  for (const continent of CONTINENTS) {
    const regions = continent.regions.filter((r) => present.has(r));
    if (!open.has(continent.id) || regions.length < 2) {
      lanes.push({
        id: continent.id,
        label: continent.label,
        depth: 1,
        parent: null,
        color: continent.color,
        splits: regions.length > 1,
      });
      continue;
    }
    regions.forEach((region, i) => {
      const color = shadeOf(continent.color, i, regions.length, 16);
      const top = (cities.get(region) ?? []).slice(0, CITY_LANES);
      const total = index.filter((t) => t.regionId === region).length;
      const inTop = top.reduce((sum, [, n]) => sum + n, 0);
      const splits = top.length > 1 || (top.length === 1 && total > inTop);
      if (!open.has(region) || !splits) {
        lanes.push({
          id: region,
          label: REGION_LABEL[region],
          depth: 2,
          parent: continent.id,
          color,
          splits,
        });
        return;
      }
      const parts = top.length + (total > inTop ? 1 : 0);
      top.forEach(([cityId], j) =>
        lanes.push({
          id: `city:${cityId}`,
          label: getCityById(cityId)?.name ?? cityId,
          depth: 3,
          parent: region,
          color: shadeOf(color, j, parts, 9),
          splits: false,
        }),
      );
      if (total > inTop) {
        lanes.push({
          id: `rest:${region}`,
          label: `Elsewhere in ${REGION_LABEL[region]}`,
          depth: 3,
          parent: region,
          color: shadeOf(color, parts - 1, parts, 9),
          splits: false,
        });
      }
    });
  }
  return lanes;
}

/** The lane an event flows in, for the lanes `placeLanes` gave. */
export function placeLaneOf(
  t: TimelineEvent,
  lanes: ReadonlySet<string>,
): string {
  if (t.cityId && lanes.has(`city:${t.cityId}`)) return `city:${t.cityId}`;
  if (lanes.has(`rest:${t.regionId}`)) return `rest:${t.regionId}`;
  if (lanes.has(t.regionId)) return t.regionId;
  return continentOf(t.regionId);
}

/** The place a lane id names, for the URL's `open` list. */
export const isPlaceNodeId = (id: string): boolean =>
  isContinentId(id) || isRegionId(id);

/** The lane a lane was split from, up to its continent. */
export function placePath(id: string): string[] {
  if (isContinentId(id)) return [id];
  if (isRegionId(id)) return [continentOf(id), id];
  const region = id.slice(id.indexOf(':') + 1);
  if (id.startsWith('rest:') && isRegionId(region)) {
    return [continentOf(region), region, id];
  }
  return [id];
}
