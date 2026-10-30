/**
 * The legend explains the marks on the globe right now, in the colours the
 * globe paints them: its swatches come from the globe's own constants.
 */
import { describe, expect, it } from 'vitest';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import { ERA_HEX } from '@/components/atlas/data/musicalEras';
import { DEFAULT_LAYERS } from '@/components/atlas/state/appReducer';
import {
  ROOTS_RAMP,
  ROUTES_RAMP,
  SUN_WHITE,
} from '@/components/atlas/theme/marks';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { legendEntries, type LegendContext } from './legendModel';

const HOME: LegendContext = {
  layers: DEFAULT_LAYERS,
  statesInView: false,
  regionSelected: false,
  cityHighlighted: false,
  artistShown: false,
  arcDirections: new Set(),
  links: null,
};

const ids = (ctx: LegendContext) => legendEntries(ctx).map((e) => e.id);
const entry = (ctx: LegendContext, id: string) =>
  legendEntries(ctx).find((e) => e.id === id);

describe('legend', () => {
  it('lists only what the globe shows', () => {
    expect(ids(HOME)).toEqual(['countries', 'cities']);
    expect(ids({ ...HOME, links: 'world' })).toEqual([
      'countries',
      'cities',
      'links-world',
      'link-count',
    ]);
    expect(
      ids({
        ...HOME,
        statesInView: true,
        regionSelected: true,
        cityHighlighted: true,
        artistShown: true,
        links: 'focus',
      }),
    ).toEqual([
      'countries',
      'selected-region',
      'states',
      'cities',
      'selected-city',
      'artist-points',
      'links-in',
      'links-out',
      'links-weak',
      'link-count',
    ]);
  });

  it('shows an event’s influences only in the directions open', () => {
    const event: LegendContext = { ...HOME, links: 'event' };
    expect(ids(event)).toEqual(['countries', 'cities']);
    expect(ids({ ...event, arcDirections: new Set(['upstream']) })).toEqual([
      'countries',
      'cities',
      'links-in',
    ]);
    expect(
      entry({ ...event, arcDirections: new Set(['downstream']) }, 'links-out')
        ?.label,
    ).toBe('It shaped');
  });

  it('drops what Layers hides', () => {
    const everything: LegendContext = {
      ...HOME,
      statesInView: true,
      cityHighlighted: true,
      artistShown: true,
      links: 'focus',
      layers: {
        landColor: 'music',
        states: false,
        cities: false,
        artistPoints: false,
        arcs: false,
      },
    };
    expect(ids(everything)).toEqual(['countries']);
  });

  it('reads the land lit by music as a range, from unlit to the most', () => {
    expect(entry(HOME, 'countries')).toMatchObject({
      label: 'Music',
      swatch: {
        shape: 'ramp',
        colors: [ATLAS_SCENE.landPlain, ...ATLAS_SCENE.landLit],
      },
    });
  });

  it("samples the continent palette from the globe's own colours", () => {
    const swatch = entry(
      { ...HOME, layers: { ...DEFAULT_LAYERS, landColor: 'continent' } },
      'countries',
    )?.swatch;
    expect(swatch?.shape).toBe('continents');
    if (swatch?.shape !== 'continents') return;
    expect(swatch.continents.map((c) => c.label)).toEqual([
      'North America',
      'South America',
      'Europe',
      'Africa',
      'Asia',
      'Oceania',
    ]);
    // Canada heads North America's list in continentColors.
    expect(swatch.continents[0].colors[0]).toBe(getCountryColor('CAN'));
  });

  it('shows plain land when Layers asks for it', () => {
    const ctx: LegendContext = {
      ...HOME,
      layers: { ...DEFAULT_LAYERS, landColor: 'plain' },
    };
    expect(entry(ctx, 'countries')?.swatch).toEqual({
      shape: 'fill',
      color: ATLAS_SCENE.landPlain,
    });
  });

  it("matches the globe's constants mark by mark", () => {
    const all: LegendContext = {
      ...HOME,
      statesInView: true,
      regionSelected: true,
      cityHighlighted: true,
      artistShown: true,
      links: 'focus',
    };
    expect(entry(all, 'states')?.swatch).toEqual({
      shape: 'outline',
      color: ATLAS_SCENE.strokeState,
    });
    expect(entry(all, 'selected-region')?.swatch).toEqual({
      shape: 'outline',
      color: ATLAS_SCENE.strokeSelected,
    });
    expect(entry(all, 'artist-points')?.swatch).toEqual({
      shape: 'point',
      color: ATLAS_SCENE.highlight,
    });
    expect(entry(all, 'links-in')?.swatch).toEqual({
      shape: 'line',
      colors: [...ROOTS_RAMP],
    });
    expect(entry(all, 'links-out')?.swatch).toEqual({
      shape: 'line',
      colors: [...ROUTES_RAMP],
    });
    expect(entry(all, 'selected-city')?.swatch).toEqual({
      shape: 'sun',
      color: SUN_WHITE,
    });
    const halos = entry(all, 'cities')?.swatch;
    expect(halos?.shape).toBe('halos');
    if (halos?.shape === 'halos') {
      for (const c of halos.colors) {
        expect(Object.values(ERA_HEX)).toContain(c);
      }
    }
  });

  it('names every mark in words', () => {
    for (const e of legendEntries({
      ...HOME,
      statesInView: true,
      regionSelected: true,
      cityHighlighted: true,
      artistShown: true,
      links: 'focus',
    })) {
      expect(e.label.length).toBeGreaterThan(3);
      expect(e.detail.length).toBeGreaterThan(10);
    }
  });

  it('describes places by their dots and halos, and the selected one’s light', () => {
    const names: LegendContext = { ...HOME, cityHighlighted: true };
    expect(entry(names, 'cities')).toMatchObject({
      label: 'Music places',
      detail: expect.stringContaining('select one to open it'),
    });
    expect(entry(names, 'selected-city')).toMatchObject({
      label: 'Selected place',
      detail: 'It glows white, and its links grow out of it.',
    });
  });
});
