/**
 * The legend explains the marks on the globe right now, in the colours the
 * globe paints them: its swatches come from the globe's own constants.
 */
import { describe, expect, it } from 'vitest';
import {
  getContrastColor,
  getCountryColor,
} from '@/components/atlas/data/continentColors';
import { DEFAULT_LAYERS } from '@/components/atlas/state/appReducer';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { legendEntries, type LegendContext } from './legendModel';

const HOME: LegendContext = {
  layers: DEFAULT_LAYERS,
  statesInView: false,
  regionSelected: false,
  cityHighlighted: false,
  artistShown: false,
  arcDirections: new Set(),
};

const ids = (ctx: LegendContext) => legendEntries(ctx).map((e) => e.id);
const entry = (ctx: LegendContext, id: string) =>
  legendEntries(ctx).find((e) => e.id === id);

describe('legend', () => {
  it('lists only what the globe shows', () => {
    expect(ids(HOME)).toEqual(['countries', 'cities']);
    expect(
      ids({
        ...HOME,
        statesInView: true,
        regionSelected: true,
        cityHighlighted: true,
        artistShown: true,
        arcDirections: new Set(['upstream', 'downstream']),
      }),
    ).toEqual([
      'countries',
      'selected-region',
      'states',
      'cities',
      'selected-city',
      'artist-points',
      'arcs-in',
      'arcs-out',
    ]);
  });

  it('drops what Layers hides', () => {
    const everything: LegendContext = {
      ...HOME,
      statesInView: true,
      cityHighlighted: true,
      artistShown: true,
      arcDirections: new Set(['upstream', 'downstream']),
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
      arcDirections: new Set(['upstream', 'downstream']),
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
    expect(entry(all, 'arcs-out')?.swatch).toEqual({
      shape: 'arc',
      colors: [...ATLAS_SCENE.arcDownstream],
    });
    const shade = getContrastColor(getCountryColor('USA'));
    expect(entry(all, 'arcs-in')?.swatch).toEqual({
      shape: 'arc',
      colors: [`${shade}e6`, `${shade}66`],
    });
  });

  it('names every mark in words', () => {
    for (const e of legendEntries({
      ...HOME,
      statesInView: true,
      regionSelected: true,
      cityHighlighted: true,
      artistShown: true,
      arcDirections: new Set(['upstream', 'downstream']),
    })) {
      expect(e.label.length).toBeGreaterThan(3);
      expect(e.detail.length).toBeGreaterThan(10);
    }
  });

  it('describes cities by their names', () => {
    const names: LegendContext = { ...HOME, cityHighlighted: true };
    expect(entry(names, 'cities')).toMatchObject({
      detail: expect.stringContaining('select a name to open the city'),
      swatch: { shape: 'label', color: ATLAS_SCENE.label },
    });
    expect(entry(names, 'selected-city')).toMatchObject({
      detail: 'Its name turns warm.',
      swatch: { shape: 'label', color: ATLAS_SCENE.labelHot },
    });
  });
});
