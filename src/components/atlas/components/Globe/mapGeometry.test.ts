import type { Feature } from 'geojson';
import { describe, expect, it } from 'vitest';
import type { ArcDatum } from '@/components/atlas/data';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { regionColor, type CityPoint } from './globeLayers';
import {
  altitudeToMapZoom,
  arcCollection,
  cityPointCollection,
  cssColor,
  distanceKm,
  flyZoom,
  greatCircle,
  mapZoomToAltitude,
  regionCollection,
  statesInViewAt,
  zoomToAltitude,
} from './mapGeometry';

/** A laptop's map area, under the app bar and the Globe's top bar. */
const H = 775;

describe('zoom mapping', () => {
  it('keeps the three.js altitudes for the page zooms', () => {
    expect(zoomToAltitude(6)).toBeCloseTo(1.7);
    expect(zoomToAltitude(10)).toBeCloseTo(0.5);
    expect(zoomToAltitude(20)).toBe(0.3);
  });

  it('frames a whole globe at the default altitude and a city closer in', () => {
    const globe = altitudeToMapZoom(2.5, H);
    expect(globe).toBeGreaterThan(1.5);
    expect(globe).toBeLessThan(3);
    // Country < state/event city < city, as resolvePlaceFly orders them.
    const country = flyZoom(6, H, 0);
    const state = flyZoom(8, H, 0);
    const city = flyZoom(10, H, 0);
    expect(country).toBeLessThan(state);
    expect(state).toBeLessThan(city);
    expect(city - country).toBeCloseTo(Math.log2(1.7 / 0.5), 5);
  });

  it('zooms one step in when the camera comes twice as close', () => {
    expect(altitudeToMapZoom(1, H) - altitudeToMapZoom(2, H)).toBeCloseTo(1, 5);
  });

  it('zooms in further from the equator, where the globe draws larger', () => {
    // cos 60° = ½: one zoom step.
    expect(
      altitudeToMapZoom(1, H, 60) - altitudeToMapZoom(1, H, 0),
    ).toBeCloseTo(1, 5);
    expect(altitudeToMapZoom(1, H, -60)).toBeCloseTo(
      altitudeToMapZoom(1, H, 60),
    );
  });

  it('a taller map shows the same ground at a higher zoom', () => {
    expect(altitudeToMapZoom(1, 2 * H) - altitudeToMapZoom(1, H)).toBeCloseTo(
      1,
      5,
    );
  });

  it('inverts', () => {
    for (const [alt, lat] of [
      [2.5, 0],
      [1.1, 30],
      [0.5, -45],
    ]) {
      const zoom = altitudeToMapZoom(alt, H, lat);
      expect(mapZoomToAltitude(zoom, H, lat)).toBeCloseTo(alt, 6);
    }
  });

  it('stays within the map’s zoom range', () => {
    expect(altitudeToMapZoom(1e6, H)).toBe(0);
    expect(altitudeToMapZoom(1e-9, H)).toBe(18);
  });

  it('shows the states from zoom 3 and hides them below 2.8', () => {
    expect(statesInViewAt(2.9, false)).toBe(false);
    expect(statesInViewAt(3, false)).toBe(true);
    expect(statesInViewAt(2.9, true)).toBe(true);
    expect(statesInViewAt(2.7, true)).toBe(false);
  });
});

describe('great circles', () => {
  const lagos = { lat: 6.5, lng: 3.4 };
  const nola = { lat: 29.95, lng: -90.07 };

  it('runs from the start to the end', () => {
    const line = greatCircle(lagos, nola, 32);
    expect(line).toHaveLength(33);
    expect(line[0][0]).toBeCloseTo(lagos.lng);
    expect(line[0][1]).toBeCloseTo(lagos.lat);
    expect(line[32][0]).toBeCloseTo(nola.lng);
    expect(line[32][1]).toBeCloseTo(nola.lat);
  });

  it('puts its middle halfway along the shortest path', () => {
    const line = greatCircle(lagos, nola, 32);
    const [lng, lat] = line[16];
    const total = distanceKm(lagos, nola);
    expect(distanceKm(lagos, { lat, lng })).toBeCloseTo(total / 2, 0);
    expect(distanceKm({ lat, lng }, nola)).toBeCloseTo(total / 2, 0);
  });

  it('crosses the Pacific without jumping back across the map', () => {
    const tokyo = { lat: 35.7, lng: 139.7 };
    const la = { lat: 34.05, lng: -118.24 };
    const line = greatCircle(tokyo, la);
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(10);
    }
    // Ends past 180°, at Los Angeles' longitude plus a turn.
    expect(line.at(-1)![0]).toBeCloseTo(-118.24 + 360);
  });

  it('is a plain segment between two points in one place', () => {
    expect(greatCircle(nola, nola)).toHaveLength(2);
  });
});

describe('sources', () => {
  const city = (id: string, lat: number, lng: number): CityPoint => ({
    id,
    name: id,
    lat,
    lng,
    color: '#cc4455',
  });

  it('places each city’s name at the city', () => {
    const [nola] = cityPointCollection(
      [city('new-orleans', 29.95, -90.07)],
      null,
      null,
    ).features;
    expect(nola.geometry.coordinates).toEqual([-90.07, 29.95]);
    expect(nola.properties).toEqual({
      cityId: 'new-orleans',
      name: 'new-orleans',
      town: false,
      highlight: false,
    });
  });

  it('highlights the selected city and the pinned event’s city', () => {
    const points = [
      city('new-orleans', 29.95, -90.07),
      city('memphis', 35.15, -90.05),
    ];
    const bySelection = cityPointCollection(points, 'memphis', null);
    expect(bySelection.features.map((f) => f.properties.highlight)).toEqual([
      false,
      true,
    ]);
    const byPin = cityPointCollection(points, null, 'new-orleans');
    expect(byPin.features[0].properties.highlight).toBe(true);
  });

  it('numbers the outlines and works out their colour and centroid whole', () => {
    const square: Feature = {
      type: 'Feature',
      properties: { NAME: 'Testland', ISO_A3: 'USA' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        ],
      },
    };
    const [feature] = regionCollection([square], 'country', true).features;
    expect(feature.id).toBe(0);
    expect(feature.properties).toMatchObject({
      _layer: 'country',
      NAME: 'Testland',
      ISO_A3: 'USA',
      clat: 5,
      clng: 5,
      color: regionColor(square, true),
    });
    const plain = regionCollection([square], 'country', false).features[0];
    expect(plain.properties.color).toBe(ATLAS_SCENE.landPlain);
  });

  it('gives a state its country’s colour', () => {
    const ontario: Feature = {
      type: 'Feature',
      properties: { name: 'Ontario', iso_a2: 'CA' },
      geometry: { type: 'Point', coordinates: [-85, 50] },
    };
    const [state] = regionCollection([ontario], 'state', true).features;
    expect(state.properties.color).toBe(
      regionColor({ properties: { ISO_A3: 'CAN' } }, true),
    );
  });

  it('draws arcs as great circles in rgba colours MapLibre reads', () => {
    const arc: ArcDatum = {
      startLat: 6.5,
      startLng: 3.4,
      endLat: 29.95,
      endLng: -90.07,
      label: 'Griots',
      eventId: 'evt-1',
      direction: 'downstream',
      color: '#cc4455',
    };
    const [line] = arcCollection([arc]).features;
    expect(line.geometry.coordinates.length).toBeGreaterThan(2);
    expect(line.properties).toMatchObject({
      eventId: 'evt-1',
      label: 'Griots',
      head: 'rgba(255, 255, 255, 0.902)',
      tail: 'rgba(255, 255, 255, 0.4)',
    });
  });

  it('converts only eight-digit hex colours', () => {
    expect(cssColor('#ffffff66')).toBe('rgba(255, 255, 255, 0.4)');
    expect(cssColor('#123456')).toBe('#123456');
    expect(cssColor('rgba(1, 2, 3, 0.5)')).toBe('rgba(1, 2, 3, 0.5)');
  });
});
