import type { LayerSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { BASEMAP_FADE } from './mapGeometry';
import {
  CLICK_LAYERS,
  DEFAULT_ASSETS_URL,
  LAYER,
  SOURCE,
  assetsUrlFromEnv,
  basemapFromEnv,
  basemapLang,
  buildStyle,
} from './mapStyle';

const ASSETS = 'https://assets.example/basemaps';

describe('where the basemap comes from', () => {
  it('prefers a self-hosted file over the hosted API', () => {
    expect(
      basemapFromEnv({
        VITE_BASEMAP_PMTILES_URL: ' https://tiles.example/world.pmtiles ',
        VITE_PROTOMAPS_API_KEY: 'key',
      }),
    ).toEqual({ kind: 'pmtiles', url: 'https://tiles.example/world.pmtiles' });
    expect(basemapFromEnv({ VITE_PROTOMAPS_API_KEY: 'key' })).toEqual({
      kind: 'api',
      key: 'key',
    });
  });

  it('has none when neither is set', () => {
    expect(basemapFromEnv({})).toBeNull();
    expect(basemapFromEnv({ VITE_BASEMAP_PMTILES_URL: '  ' })).toBeNull();
  });

  it('takes its fonts and icons from Protomaps unless told otherwise', () => {
    expect(assetsUrlFromEnv({})).toBe(DEFAULT_ASSETS_URL);
    expect(assetsUrlFromEnv({ VITE_BASEMAP_ASSETS_URL: `${ASSETS}/` })).toBe(
      ASSETS,
    );
  });

  it('labels in Spanish when the page is in Spanish', () => {
    expect(basemapLang('es')).toBe('es');
    expect(basemapLang('es-MX')).toBe('es');
    expect(basemapLang('en')).toBe('en');
    expect(basemapLang('')).toBe('en');
    expect(basemapLang(null)).toBe('en');
  });
});

const ids = (layers: LayerSpecification[]) => layers.map((l) => l.id);

describe('the style with a basemap', () => {
  const style = buildStyle({
    basemap: { kind: 'pmtiles', url: 'https://tiles.example/world.pmtiles' },
    lang: 'en',
    assetsUrl: ASSETS,
  });

  it('is a globe, credits OpenStreetMap and reads tiles through pmtiles://', () => {
    expect(style.projection).toEqual({ type: 'globe' });
    const source = style.sources[SOURCE.basemap] as {
      url: string;
      attribution: string;
    };
    expect(source.url).toBe('pmtiles://https://tiles.example/world.pmtiles');
    expect(source.attribution).toContain('OpenStreetMap');
    expect(style.glyphs).toBe(`${ASSETS}/fonts/{fontstack}/{range}.pbf`);
    expect(style.sprite).toBe(`${ASSETS}/sprites/v4/dark`);
  });

  it('reads the hosted API with the key', () => {
    const api = buildStyle({
      basemap: { kind: 'api', key: 'a b' },
      lang: 'es',
      assetsUrl: ASSETS,
    });
    expect((api.sources[SOURCE.basemap] as { url: string }).url).toBe(
      'https://api.protomaps.com/tiles/v4.json?key=a%20b',
    );
  });

  it('puts the Globe’s shapes under the basemap’s labels and its points over them', () => {
    const order = ids(style.layers);
    const firstLabel = style.layers.findIndex(
      (l) => l.type === 'symbol' && !l.id.startsWith('atlas-'),
    );
    for (const id of [LAYER.countriesFill, LAYER.cityHexes, LAYER.arcsDash]) {
      expect(order.indexOf(id)).toBeLessThan(firstLabel);
      expect(order.indexOf(id)).toBeGreaterThan(order.indexOf('water'));
    }
    for (const id of [
      LAYER.cityCircles,
      LAYER.cityLabels,
      LAYER.artistPoints,
    ]) {
      expect(order.indexOf(id)).toBeGreaterThan(firstLabel);
    }
  });

  it('holds the basemap’s labels back until the country colours fade', () => {
    for (const layer of style.layers) {
      if (layer.type === 'symbol' && !layer.id.startsWith('atlas-')) {
        expect(layer.minzoom ?? 0).toBeGreaterThanOrEqual(BASEMAP_FADE[0]);
      }
    }
  });

  it('fades the country colours out over BASEMAP_FADE', () => {
    const fill = style.layers.find((l) => l.id === LAYER.countriesFill);
    expect(fill?.paint).toMatchObject({
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.86, 6, 0],
    });
  });

  it('starts the sea in the Globe’s colour', () => {
    const water = style.layers.find((l) => l.id === 'water');
    expect(JSON.stringify(water?.paint)).toContain(ATLAS_SCENE.ocean);
  });

  it('fades the atmosphere out by zoom 7', () => {
    expect(style.sky?.['atmosphere-blend']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      1,
      5,
      1,
      7,
      0,
    ]);
  });

  it('has every layer a click can land on', () => {
    for (const id of CLICK_LAYERS) expect(ids(style.layers)).toContain(id);
  });
});

describe('the style without a basemap', () => {
  const style = buildStyle({ basemap: null, lang: 'en', assetsUrl: ASSETS });

  it('draws the Globe’s own countries on a plain sea, for good', () => {
    expect(style.sources[SOURCE.basemap]).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(style.layers[0]).toMatchObject({
      type: 'background',
      paint: { 'background-color': ATLAS_SCENE.ocean },
    });
    const fill = style.layers.find((l) => l.id === LAYER.countriesFill);
    expect(fill?.paint).toMatchObject({ 'fill-opacity': 0.86 });
  });

  it('still has every Globe layer', () => {
    for (const id of Object.values(LAYER))
      expect(ids(style.layers)).toContain(id);
  });
});
