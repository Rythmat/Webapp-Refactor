import type { LayerSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { MAP_FONT } from './mapFonts';
import { CLICK_LAYERS, LAYER, buildStyle } from './mapStyle';

const ORIGIN = 'https://app.example';

const ids = (layers: LayerSpecification[]) => layers.map((l) => l.id);

describe('the style', () => {
  const style = buildStyle({ origin: ORIGIN });

  it('is a globe of the Globe’s own countries on a plain sea', () => {
    expect(style.projection).toEqual({ type: 'globe' });
    expect(style.layers[0]).toMatchObject({
      type: 'background',
      paint: { 'background-color': ATLAS_SCENE.ocean },
    });
    const fill = style.layers.find((l) => l.id === LAYER.countriesFill);
    expect(fill?.paint).toMatchObject({ 'fill-opacity': 0.86 });
  });

  it('draws its labels in the app’s font, from this site alone', () => {
    expect(style['font-faces']).toHaveProperty(MAP_FONT.bold);
    const names = style.layers.find((l) => l.id === LAYER.cityLabels);
    expect(names?.layout).toMatchObject({ 'text-font': [MAP_FONT.bold] });
    // No glyph server, no icon sheet: nothing is asked of another site.
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    const urls = JSON.stringify(style).match(/https?:\/\/[^"]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
  });

  it('keeps the outlines, arcs and points under the names', () => {
    const order = ids(style.layers);
    const at = (id: string) => order.indexOf(id);
    for (const id of [LAYER.statesLine, LAYER.countriesLine, LAYER.arcsDash]) {
      expect(at(id)).toBeGreaterThan(at(LAYER.countriesFill));
    }
    // An artist's points too: a name reads over a point, not under it.
    expect(at(LAYER.artistPoints)).toBeGreaterThan(at(LAYER.arcsDash));
    // The cities' names are over everything.
    expect(at(LAYER.cityLabels)).toBe(order.length - 1);
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

  it('has every Globe layer, and every layer a click can land on', () => {
    for (const id of Object.values(LAYER)) {
      expect(ids(style.layers)).toContain(id);
    }
    for (const id of CLICK_LAYERS) expect(ids(style.layers)).toContain(id);
  });
});
