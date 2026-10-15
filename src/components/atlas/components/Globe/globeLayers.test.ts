/**
 * The Layers control hides a layer by giving the globe no data for it, and
 * leaves every other layer's array exactly as it was, so react-globe.gl
 * rebuilds only the layer that changed.
 */
import { describe, expect, it } from 'vitest';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import { DEFAULT_LAYERS } from '@/components/atlas/state/appReducer';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { GlobeLayers } from '@/components/atlas/types';
import {
  cityBaseColor,
  landColor,
  visibleArcs,
  visibleArtistPoints,
  visibleCityPoints,
  visiblePolygons,
} from './globeLayers';

const off = (layer: keyof GlobeLayers): GlobeLayers => ({
  ...DEFAULT_LAYERS,
  [layer]: false,
});

const countries = [{ id: 'FRA' }, { id: 'USA' }];
const states = [{ id: 'Texas' }];
const cities = [{ id: 'paris' }, { id: 'austin' }];
const artist = [{ id: 'moment' }];
const arcs = [
  { direction: 'upstream' as const, id: 'in' },
  { direction: 'downstream' as const, id: 'out' },
];
const BOTH = new Set(['upstream', 'downstream'] as const);

describe('globe layers', () => {
  it('draws everything with every layer on', () => {
    expect(visiblePolygons(DEFAULT_LAYERS, countries, states, true)).toEqual([
      ...countries,
      ...states,
    ]);
    expect(visibleCityPoints(DEFAULT_LAYERS, cities)).toBe(cities);
    expect(visibleArtistPoints(DEFAULT_LAYERS, artist)).toBe(artist);
    expect(visibleArcs(DEFAULT_LAYERS, arcs, BOTH)).toBe(arcs);
  });

  it('hides the cities, and only the cities', () => {
    const layers = off('cities');
    expect(visibleCityPoints(layers, cities)).toEqual([]);
    expect(visibleArtistPoints(layers, artist)).toBe(artist);
    expect(visibleArcs(layers, arcs, BOTH)).toBe(arcs);
    expect(visiblePolygons(layers, countries, states, false)).toBe(countries);
  });

  it("hides an artist's points", () => {
    expect(visibleArtistPoints(off('artistPoints'), artist)).toEqual([]);
    expect(visibleCityPoints(off('artistPoints'), cities)).toBe(cities);
  });

  it('hides the influence arcs whatever directions are open', () => {
    expect(visibleArcs(off('arcs'), arcs, BOTH)).toEqual([]);
  });

  it("keeps the arcs' own direction filter", () => {
    expect(
      visibleArcs(DEFAULT_LAYERS, arcs, new Set(['upstream'] as const)),
    ).toEqual([arcs[0]]);
    expect(visibleArcs(DEFAULT_LAYERS, arcs, new Set())).toEqual([]);
  });

  it('shows state lines only when the layer is on and they are in view', () => {
    expect(visiblePolygons(DEFAULT_LAYERS, countries, states, false)).toBe(
      countries,
    );
    expect(visiblePolygons(off('states'), countries, states, true)).toBe(
      countries,
    );
  });

  it('hands back one shared empty array, so "off" never looks like a change', () => {
    expect(visibleCityPoints(off('cities'), cities)).toBe(
      visibleCityPoints(off('cities'), [{ id: 'other' }]),
    );
  });

  it('paints the land plain with country colours off', () => {
    expect(landColor('FRA', true)).toBe(getCountryColor('FRA'));
    expect(landColor('FRA', false)).toBe(ATLAS_SCENE.landPlain);
    expect(cityBaseColor('FRA', false)).toBe(ATLAS_SCENE.landPlain);
    expect(cityBaseColor(undefined, true)).toBe(ATLAS_SCENE.fallback);
  });
});
