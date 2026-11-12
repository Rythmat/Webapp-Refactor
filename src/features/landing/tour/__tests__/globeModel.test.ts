import { beforeAll, describe, expect, it } from 'vitest';
import { allConnections } from '@/components/atlas/data/eventConnections';
import { getCityById } from '@/components/atlas/data/lookups';
import {
  eraOfYear,
  MUSICAL_ERAS,
  type EraId,
} from '@/components/atlas/data/musicalEras';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import { scopeLinks } from '@/components/atlas/network/placeNetwork';
import { getNetworkIndex } from '@/components/atlas/network/useNetwork';
import { ensureAtlasContent } from '@/content/contentStore';
import {
  COUNTRY_PATHS,
  STATE_BOXES,
  STATE_PATHS,
} from '../scenes/globe/globeArt.generated';
import {
  DETROIT_STORY,
  ERA_TOTALS,
  eraCounts,
  NEW_ORLEANS,
  PLACES,
  placeById,
  type GlobeStory,
} from '../scenes/globe/globeData';
import { GLOBE_VIEW, project } from '../scenes/globe/orthographic';
import { TOUR_BY_ID } from '../tourSteps';

beforeAll(() => ensureAtlasContent(), 60_000);

const eventsAt = (city: string) =>
  getTimelineIndex().filter((t) => t.cityId === city);

describe('Globe demo: copied from the Atlas', () => {
  it('lights real places at their coordinates, counts and busiest era', () => {
    for (const p of PLACES) {
      const city = getCityById(p.id) as
        | { name: string; coordinates: [number, number] }
        | undefined;
      expect(city, p.id).toBeDefined();
      expect([p.label, p.lat, p.lng]).toEqual([
        city!.name,
        ...city!.coordinates,
      ]);
      const years = eventsAt(p.id).map((t) => t.event.year);
      expect(p.events, p.id).toBe(years.length);
      // Busiest era; a tie goes to the earlier era.
      const counts = eraCounts(years);
      const busiest = counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      expect(p.era, p.id).toBe(busiest);
    }
  });

  it.each([
    ['New Orleans', NEW_ORLEANS],
    ['Detroit', DETROIT_STORY],
  ] as [string, GlobeStory][])(
    'tells %s’s story from its real events and links',
    (_, story) => {
      const evs = eventsAt(story.place);
      expect(story.years).toEqual(
        evs.map((t) => t.event.year).sort((a, b) => a - b),
      );
      for (const e of story.events) {
        const real = evs.find((t) => t.event.id === e.id)?.event;
        expect(real, e.id).toBeDefined();
        expect(e).toEqual({
          id: real!.id,
          year: real!.year,
          title: real!.title,
        });
      }

      const ix = getNetworkIndex(allConnections());
      const { roots, routes } = scopeLinks(
        ix,
        new Set(evs.map((t) => t.event.id)),
        null,
      );
      const side = (links: typeof roots, end: 'from' | 'to') =>
        links.map((l) => ({
          place: ix.node(l[end])!.id.replace(/^city:/, ''),
          label: ix.node(l[end])!.label,
          n: l.weight,
        }));
      expect(side(roots, 'from')).toEqual(
        expect.arrayContaining([...story.cameFrom]),
      );
      if (story.wentTo.length > 0)
        expect(side(routes, 'to')).toEqual([...story.wentTo]);
      if (story === NEW_ORLEANS)
        expect(side(roots, 'from')).toEqual([...story.cameFrom]);
      else expect(story.cameFrom[0]).toEqual(side(roots, 'from')[0]);
    },
  );

  it('sizes the era rail by every era’s events', () => {
    const totals = Object.fromEntries(
      MUSICAL_ERAS.map((e) => [e.id, 0]),
    ) as Record<EraId, number>;
    for (const t of getTimelineIndex()) totals[eraOfYear(t.event.year).id] += 1;
    expect(ERA_TOTALS).toEqual(totals);
  });
});

describe('Globe demo: the map art', () => {
  it('draws the lifted states and every story place on the facing side', () => {
    for (const story of [NEW_ORLEANS, DETROIT_STORY]) {
      const p = placeById(story.place)!;
      const { x, y, visible } = project(p.lat, p.lng);
      expect(visible).toBe(true);
      const [x0, y0, x1, y1] = STATE_BOXES[story.lift];
      expect(x).toBeGreaterThan(x0);
      expect(x).toBeLessThan(x1);
      expect(y).toBeGreaterThan(y0);
      expect(y).toBeLessThan(y1);
      expect(STATE_PATHS[story.lift]).toMatch(/^M[\d.]+ [\d.]+l/);
    }
  });

  it('keeps the countries in view, on the art board', () => {
    const isos = COUNTRY_PATHS.map(([iso]) => iso);
    expect(isos).toEqual(expect.arrayContaining(['USA', 'CAN', 'MEX', 'CUB']));
    expect(isos).not.toContain('AUS');
    for (const [, d] of COUNTRY_PATHS) {
      const [x, y] = d.slice(1).split(/[ l]/).map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(GLOBE_VIEW.size);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(GLOBE_VIEW.size);
    }
  });
});

describe('Globe demo: tour config', () => {
  it('points at the scene’s parts, with short callouts', () => {
    const steps = TOUR_BY_ID.globe.steps;
    expect(steps.map((s) => s.target)).toEqual([
      'globe',
      'place',
      'connections',
    ]);
    steps.forEach((s) => expect(s.callout.length).toBeLessThanOrEqual(80));
  });
});
