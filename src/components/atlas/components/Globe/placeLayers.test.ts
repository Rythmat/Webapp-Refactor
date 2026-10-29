import { describe, expect, it } from 'vitest';
import { ERA_HEX, MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { MusicWeights } from '@/components/atlas/stats/musicWeights';
import type { CityPoint } from './globeLayers';
import {
  PLACE_LAYER,
  TOWN_NAMES_FROM,
  labelPriority,
  namedFrom,
  placeCollection,
  placeLayers,
} from './placeLayers';

const point = (id: string, town = false): CityPoint => ({
  id,
  name: id,
  lat: 0,
  lng: 0,
  town,
  color: '',
});

const weights = (events: Record<string, number>): MusicWeights => ({
  countries: new Map(),
  maxCountry: 0,
  places: new Map(
    Object.entries(events).map(([id, n]) => [id, { events: n, era: null }]),
  ),
  maxPlace: Math.max(0, ...Object.values(events)),
});

describe('the places on the map', () => {
  it('names the selected place first, then the pinned, the linked, the busy', () => {
    expect(
      labelPriority({ selected: true, pinned: true, connected: true, rank: 9 }),
    ).toBe(0);
    expect(
      labelPriority({
        selected: false,
        pinned: true,
        connected: false,
        rank: 0,
      }),
    ).toBe(1);
    expect(
      labelPriority({
        selected: false,
        pinned: false,
        connected: true,
        rank: 0,
      }),
    ).toBe(2);
    expect(
      labelPriority({
        selected: false,
        pinned: false,
        connected: false,
        rank: 3,
      }),
    ).toBe(13);
  });

  it('names more places the closer the map comes', () => {
    expect(namedFrom(0)).toBe(0);
    expect(namedFrom(10)).toBe(2);
    expect(namedFrom(50)).toBe(4);
    expect(namedFrom(500)).toBe(6);
  });

  it('gives each place its name, its events, and when it is named', () => {
    const { features } = placeCollection(
      [
        point('new-orleans'),
        point('memphis'),
        point('aspen', true),
        point('quiet'),
        point('a-very-long-town-name-indeed'),
      ],
      weights({
        'new-orleans': 21,
        memphis: 1,
        aspen: 3,
        'a-very-long-town-name-indeed': 1,
      }),
      'memphis',
      null,
    );
    const by = Object.fromEntries(
      features.map((f) => [f.properties.cityId, f.properties]),
    );
    expect(by['new-orleans']).toMatchObject({
      sub: '21 events',
      minzoom: 0,
      priority: 10,
    });
    // Selected: named whatever its rank, and lit.
    expect(by.memphis).toMatchObject({
      sub: '1 event',
      highlight: true,
      priority: 0,
      minzoom: 0,
    });
    // A town waits for the map to come close.
    expect(by.aspen.minzoom).toBeGreaterThanOrEqual(TOWN_NAMES_FROM);
    // No music in the years shown: a dot, but no name.
    expect(by.quiet).toMatchObject({
      sub: 'No events in these years',
      minzoom: 99,
    });
    expect(by['a-very-long-town-name-indeed'].name).toBe('a-very-long-town-…');
  });

  it('tints a halo by every era there is', () => {
    const halo = placeLayers('places').find((l) => l.id === PLACE_LAYER.halo);
    const color = JSON.stringify(
      (halo?.paint as Record<string, unknown>)['circle-color'],
    );
    for (const era of MUSICAL_ERAS) expect(color).toContain(ERA_HEX[era.id]);
  });
});
