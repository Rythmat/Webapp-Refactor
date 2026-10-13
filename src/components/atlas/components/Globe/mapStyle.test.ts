import type { LayerSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { ATLAS_BASEMAP, ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { COUNTRY_TINT } from './mapGeometry';
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

  it('makes a file on this site absolute against the page', () => {
    expect(
      basemapFromEnv(
        { VITE_BASEMAP_PMTILES_URL: '/__protomaps/latest.pmtiles' },
        'http://localhost:5179/atlas/globe?place=city:new-orleans',
      ),
    ).toEqual({
      kind: 'pmtiles',
      url: 'http://localhost:5179/__protomaps/latest.pmtiles',
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

  it('tints the basemap’s land under its sea, and keeps its labels on top of the shapes and dots', () => {
    const order = ids(style.layers);
    const at = (id: string) => order.indexOf(id);
    // Over the land and land use, under the sea that trims the coast.
    expect(at(LAYER.countriesFill)).toBeGreaterThan(at('earth'));
    expect(at(LAYER.countriesFill)).toBeGreaterThan(at('landuse_park'));
    expect(at(LAYER.countriesFill)).toBe(at('water') - 1);
    const firstLabel = style.layers.findIndex(
      (l) => l.type === 'symbol' && !l.id.startsWith('atlas-'),
    );
    for (const id of [LAYER.statesLine, LAYER.countriesLine, LAYER.arcsDash]) {
      expect(at(id)).toBeGreaterThan(at('roads_highway'));
      expect(at(id)).toBeLessThan(firstLabel);
    }
    // An artist's points too: a name reads over a point, not under it.
    expect(at(LAYER.artistPoints)).toBeGreaterThan(at(LAYER.arcsDash));
    expect(at(LAYER.artistPoints)).toBeLessThan(firstLabel);
    // The cities' names are over everything.
    expect(at(LAYER.cityLabels)).toBe(order.length - 1);
  });

  it('names each city once: the basemap skips the names the Globe shows', () => {
    const named = buildStyle({
      basemap: { kind: 'pmtiles', url: 'https://tiles.example/world.pmtiles' },
      lang: 'en',
      assetsUrl: ASSETS,
      cityNames: ['Aspen', 'New Orleans'],
    });
    const towns = named.layers.find((l) => l.id === 'places_locality');
    expect(
      JSON.stringify(towns && 'filter' in towns && towns.filter),
    ).toContain('"Aspen","New Orleans"');
    expect(ids(named.layers)).not.toContain('atlas-city-circles');
  });

  it('marks a city by its name: warm while hovered or selected', () => {
    const names = style.layers.find((l) => l.id === LAYER.cityLabels);
    expect(names?.type).toBe('symbol');
    const paint = JSON.stringify(names?.paint);
    expect(paint).toContain('feature-state');
    expect(paint).toContain(ATLAS_SCENE.strokeSelected);
  });

  it('outlines the selected city in the selected region’s line', () => {
    const outline = style.layers.find((l) => l.id === LAYER.cityOutline);
    expect(outline?.paint).toMatchObject({
      'line-color': ATLAS_SCENE.strokeSelected,
    });
    expect(ids(style.layers).indexOf(LAYER.cityOutline)).toBeGreaterThan(
      ids(style.layers).indexOf(LAYER.countriesLine),
    );
  });

  it('labels places at every zoom', () => {
    const country = style.layers.find((l) => l.id === 'places_country');
    expect(country?.minzoom ?? 0).toBeLessThan(3);
  });

  it('tints the land by COUNTRY_TINT, lighter among the streets', () => {
    const fill = style.layers.find((l) => l.id === LAYER.countriesFill);
    expect(fill?.paint).toMatchObject({
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        ...COUNTRY_TINT.flat(),
      ],
    });
  });

  it('paints the basemap in the Atlas flavor: the globe’s cyan sea, plain land', () => {
    const paint = (id: string) => style.layers.find((l) => l.id === id)?.paint;
    expect(paint('earth')).toMatchObject({
      'fill-color': ATLAS_SCENE.landPlain,
    });
    expect(paint('water')).toMatchObject({ 'fill-color': ATLAS_SCENE.ocean });
    expect(paint('background')).toMatchObject({
      'background-color': ATLAS_SCENE.ocean,
    });
    expect(JSON.stringify(paint('places_locality'))).toContain(
      ATLAS_BASEMAP.city_label,
    );
    // Labels that would take the land's grey as a halo get the dark one.
    expect(paint('places_country')).toMatchObject({
      'text-halo-color': ATLAS_SCENE.labelHalo,
    });
    expect(JSON.stringify(paint('pois'))).toContain(ATLAS_BASEMAP.pois.pink);
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
