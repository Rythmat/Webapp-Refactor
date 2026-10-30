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
  stopPlaces,
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

describe('the places a stop is about', () => {
  const points = [
    point('rio'),
    point('salvador'),
    point('lagos'),
    point('memphis'),
  ];
  const places: Record<string, { country: string; subdivision?: string }> = {
    rio: { country: 'Brazil' },
    salvador: { country: 'Brazil' },
    lagos: { country: 'Nigeria' },
    memphis: { country: 'US', subdivision: 'Tennessee' },
  };
  const placeOf = (id: string) => places[id];

  it('are a country’s places, a state’s, or an artist’s', () => {
    expect([...stopPlaces(points, { country: 'brazil' }, placeOf)]).toEqual([
      'rio',
      'salvador',
    ]);
    expect([
      ...stopPlaces(
        points,
        { state: { name: 'Tennessee', country: 'United States' } },
        placeOf,
      ),
    ]).toEqual(['memphis']);
    expect([...stopPlaces(points, { cityIds: ['lagos'] }, placeOf)]).toEqual([
      'lagos',
    ]);
  });

  it('are named from orbit, whatever their rank', () => {
    const { features } = placeCollection(
      points,
      weights({ rio: 1, salvador: 1, lagos: 9, memphis: 9 }),
      null,
      null,
      new Set(['rio']),
    );
    const rio = features.find((f) => f.properties.cityId === 'rio');
    expect(rio?.properties).toMatchObject({ priority: 2, minzoom: 0 });
  });

  it('hands a lifted region’s places to its dots, naming only the busiest', () => {
    const points = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      lat: 0,
      lng: i,
      color: 'x',
    }));
    const weights = {
      places: new Map(
        points.map((p, i) => [p.id, { events: 20 - i, era: null }]),
      ),
    } as unknown as MusicWeights;
    const inside = new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    const { features } = placeCollection(
      points,
      weights,
      'p6',
      null,
      new Set(),
      inside,
    );
    const by = (id: string) =>
      features.find((f) => f.properties.cityId === id)!.properties;
    expect(by('p0')).toMatchObject({ under: true, quiet: false, minzoom: 0 });
    expect(by('p4').minzoom).toBe(0);
    // Past the busiest five, unnamed; but the selected place always is.
    expect(by('p5').minzoom).toBe(99);
    expect(by('p6').minzoom).toBe(0);
    // Beyond the region: quiet and unnamed, however busy.
    expect(by('p7')).toMatchObject({ under: false, quiet: true, minzoom: 99 });
  });
});
