import type { Feature, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import {
  COUNTRY_LABEL_ZOOMS,
  LAND_LAYER,
  countryLabelCollection,
  labelPointIn,
  landLayers,
  landPaint,
  regionLabelCollection,
} from './landLayers';
import { pointInRing } from './mapFraming';

const box = (
  name: string,
  w: number,
  e: number,
  s: number,
  n: number,
): Feature =>
  ({
    type: 'Feature',
    properties: { NAME: name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    },
  }) as Feature<Polygon>;

describe('the land', () => {
  it('lights a country by its music level, from unlit land up', () => {
    const fill = landPaint('music')['fill-color'];
    expect(JSON.stringify(fill)).toContain('"feature-state","music"');
    expect(fill).toContain(ATLAS_SCENE.landPlain);
    expect(fill).toContain(ATLAS_SCENE.landLit[3]);
    expect(landPaint('continent')).toEqual({
      'fill-color': ['get', 'color'],
      'fill-opacity': ATLAS_SCENE.continentOpacity,
    });
    expect(landPaint('plain')['fill-color']).toBe(ATLAS_SCENE.landPlain);
  });

  it('draws the fill under the glow, the glow under the borders', () => {
    const order = landLayers('music').map((l) => l.id);
    expect(order[0]).toBe(LAND_LAYER.countriesFill);
    expect(order.indexOf(LAND_LAYER.countriesGlow)).toBeLessThan(
      order.indexOf(LAND_LAYER.countriesLine),
    );
  });

  it('glows only round a hovered or selected place', () => {
    const glow = landLayers('music').find(
      (l) => l.id === LAND_LAYER.countriesGlow,
    );
    const opacity = (glow?.paint as Record<string, unknown>)['line-opacity'];
    expect(JSON.stringify(opacity)).toMatch(
      /selected.*0\.9.*hover.*0\.35.*0\]$/,
    );
  });

  it('writes a name inside even a crescent', () => {
    // A C shape: its centroid falls in the bite, out at sea.
    const crescent = [
      [0, 0],
      [10, 0],
      [10, 2],
      [2, 2],
      [2, 8],
      [10, 8],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const [x, y] = labelPointIn(crescent);
    expect(pointInRing(x, y, crescent)).toBe(true);
  });

  it('tiers the countries by size, the biggest named first', () => {
    const many = Array.from({ length: 90 }, (_, i) =>
      box(`Land ${i}`, 0, 1 + i * 0.1, 0, 1),
    );
    const usa = box('United States of America', -125, -67, 25, 49);
    const labels = countryLabelCollection([...many, usa]).features;
    expect(labels[0].properties).toMatchObject({
      name: 'United States',
      tier: 1,
      rank: 0,
    });
    const tiers = labels.map((l) => l.properties.tier);
    expect(tiers.filter((t) => t === 1)).toHaveLength(30);
    expect(tiers.filter((t) => t === 2)).toHaveLength(50);
    expect(tiers.filter((t) => t === 3)).toHaveLength(11);
    expect(COUNTRY_LABEL_ZOOMS).toEqual([2.5, 3.5, 4.5]);
  });

  it('names the world’s regions at their centres', () => {
    const regions = regionLabelCollection().features;
    expect(regions).toHaveLength(18);
    expect(regions.map((r) => r.properties.name)).toContain('West Africa');
  });
});
