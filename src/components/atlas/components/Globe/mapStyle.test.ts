import type { LayerSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { landPaint } from './landLayers';
import { CHIP } from './mapChips';
import { MAP_FONT } from './mapFonts';
import { CLICK_LAYERS, LAYER, buildStyle } from './mapStyle';

const ORIGIN = 'https://app.example';

const ids = (layers: LayerSpecification[]) => layers.map((l) => l.id);

describe('the style', () => {
  const style = buildStyle({ origin: ORIGIN });

  it('is a globe of the Globe’s own countries on a dark sea, lit by music', () => {
    expect(style.projection).toEqual({ type: 'globe' });
    expect(style.layers[0]).toMatchObject({
      type: 'background',
      paint: { 'background-color': ATLAS_SCENE.ocean },
    });
    const fill = style.layers.find((l) => l.id === LAYER.countriesFill);
    expect(fill?.paint).toEqual(landPaint('music'));
    // Clear round the globe, so the page's ground shows there.
    expect(style.sky?.['sky-color']).toBe('rgba(0, 0, 0, 0)');
  });

  it('starts the land in the colour it is asked for', () => {
    const plain = buildStyle({ origin: ORIGIN, land: 'plain' });
    expect(
      plain.layers.find((l) => l.id === LAYER.countriesFill)?.paint,
    ).toEqual(landPaint('plain'));
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

  it('keeps the outlines, links and points under the names', () => {
    const order = ids(style.layers);
    const at = (id: string) => order.indexOf(id);
    for (const id of [
      LAYER.statesLine,
      LAYER.countriesLine,
      LAYER.linksRoots,
    ]) {
      expect(at(id)).toBeGreaterThan(at(LAYER.countriesFill));
    }
    // A link's glow under it; its count over it, under the places' names.
    expect(at(LAYER.linksGlow)).toBeLessThan(at(LAYER.linksRoots));
    expect(at(LAYER.linkPills)).toBeGreaterThan(at(LAYER.linksRoutes));
    expect(at(LAYER.linkPills)).toBeLessThan(at(LAYER.cityLabels));
    // An artist's points too: a name reads over a point, not under it.
    expect(at(LAYER.artistPoints)).toBeGreaterThan(at(LAYER.linksRoutes));
    // The cities' names are over everything.
    expect(at(LAYER.cityLabels)).toBe(order.length - 1);
  });

  it('marks each place with a dot and a halo, and names it on a chip', () => {
    const order = ids(style.layers);
    expect(order.indexOf(LAYER.placeHalo)).toBeLessThan(
      order.indexOf(LAYER.placeDot),
    );
    const names = style.layers.find((l) => l.id === LAYER.cityLabels);
    expect(names?.type).toBe('symbol');
    expect(JSON.stringify(names?.layout)).toContain(CHIP.on);
    expect(JSON.stringify(names?.paint)).toContain(ATLAS_SCENE.labelHot);
  });

  it('keeps a faint atmosphere from orbit, gone by zoom 4.5', () => {
    expect(style.sky?.['atmosphere-blend']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      0.3,
      3,
      0.15,
      4.5,
      0,
    ]);
  });

  it('names the regions from orbit, then the countries, over the land', () => {
    const order = ids(style.layers);
    expect(order.indexOf(LAYER.regionLabels)).toBeGreaterThan(
      order.indexOf(LAYER.countriesLine),
    );
    expect(order).toContain('atlas-country-labels-1');
    expect(order.indexOf(LAYER.cityLabels)).toBe(order.length - 1);
  });

  it('has every Globe layer, and every layer a click can land on', () => {
    for (const id of Object.values(LAYER)) {
      expect(ids(style.layers)).toContain(id);
    }
    for (const id of CLICK_LAYERS) expect(ids(style.layers)).toContain(id);
  });
});
