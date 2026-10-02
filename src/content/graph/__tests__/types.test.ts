import { describe, expect, it } from 'vitest';
import {
  EDGE_ENDPOINTS,
  EDGE_KINDS,
  EDGE_LABELS,
  type EdgeKind,
  ENTITY_KINDS,
  entityId,
  type EntityId,
  type EntityKind,
  isValidEdge,
  isWellFormed,
  parseEntityId,
  toSlug,
} from '../types';

/**
 * `true` when `List` is a fixed list naming every member of `All`, else
 * `false`. A plain `EntityKind[]` is not fixed: it could leave any kind out.
 */
type NamesEvery<All, List> = List extends readonly unknown[]
  ? number extends List['length']
    ? false
    : [Exclude<All, List[number]>] extends [never]
      ? true
      : false
  : false;

describe('the kind lists', () => {
  it('name every kind, and the compiler holds them to it', () => {
    // Checked by `tsc -b`, not at run time: these fail to compile if either
    // list stops naming every kind, or is retyped as a plain array that would
    // let one go missing unnoticed.
    const entityKinds: NamesEvery<EntityKind, typeof ENTITY_KINDS> = true;
    const edgeKinds: NamesEvery<EdgeKind, typeof EDGE_KINDS> = true;
    // …and the check is not one that passes anything.
    // @ts-expect-error -- a list with a kind left out
    const short: NamesEvery<EntityKind, readonly ['song', 'artist']> = true;
    // @ts-expect-error -- a plain array, which could leave any kind out
    const loose: NamesEvery<EntityKind, readonly EntityKind[]> = true;
    expect([entityKinds, edgeKinds, short, loose]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});

describe('entity ids', () => {
  it('keeps two things with the same name apart', () => {
    // The case this library already contains: Chicago the band, Chicago the city.
    expect(entityId('artist', 'Chicago')).toBe('artist:chicago');
    expect(entityId('place', 'Chicago')).toBe('place:chicago');
    expect(entityId('artist', 'Chicago')).not.toBe(
      entityId('place', 'Chicago'),
    );
  });

  it('folds accents and drops apostrophes rather than leaving gaps', () => {
    expect(toSlug('Sinéad O’Connor')).toBe('sinead-oconnor');
    expect(toSlug("Ain't No Mountain High Enough")).toBe(
      'aint-no-mountain-high-enough',
    );
    expect(toSlug('Hitsville U.S.A.')).toBe('hitsville-u-s-a');
  });

  it('leaves a song id alone, because 640 of them are referenced elsewhere', () => {
    expect(entityId('song', 'aint_no_mountain_high_enough')).toBe(
      'song:aint_no_mountain_high_enough',
    );
  });

  it('round-trips through parse', () => {
    const id = entityId('studio', 'Abbey Road Studios');
    expect(parseEntityId(id)).toEqual({
      kind: 'studio',
      slug: 'abbey-road-studios',
    });
  });

  it('rejects what is not an id', () => {
    expect(parseEntityId('marvin-gaye')).toBeNull();
    expect(parseEntityId('nonsense:thing')).toBeNull();
    expect(parseEntityId(':detroit')).toBeNull();
    expect(parseEntityId('artist:')).toBeNull();
  });

  it('holds each kind to its slug convention', () => {
    expect(isWellFormed('artist:marvin-gaye')).toBe(true);
    expect(isWellFormed('song:aint_no_mountain_high_enough')).toBe(true);
    // snake_case is the song exception, not a licence everywhere.
    expect(isWellFormed('artist:marvin_gaye')).toBe(false);
    expect(isWellFormed('song:marvin-gaye')).toBe(false);
    expect(isWellFormed('place:Detroit')).toBe(false);
  });

  it('keeps a song-derived event id exactly as the globe stores it', () => {
    // The globe's id for a song's event carries the song's underscores; the
    // old rule kebab-cased it into an id that matched no event.
    expect(entityId('event', 'song-100_days_100_nights')).toBe(
      'event:song-100_days_100_nights',
    );
    expect(isWellFormed('event:song-100_days_100_nights')).toBe(true);
    expect(isWellFormed('event:evt-motown-founded')).toBe(true);
  });

  it('mints artist ids with the registry normaliser, not the generic one', () => {
    // '&' folds to 'and' — the reason Hall & Oates and Hall and Oates meet.
    expect(entityId('artist', 'Hall & Oates')).toBe('artist:hall-and-oates');
    expect(entityId('artist', 'hall-and-oates')).toBe('artist:hall-and-oates');
  });

  it('keeps the accidental on a key', () => {
    expect(entityId('key', 'E♭')).toBe('key:e-flat');
    expect(entityId('key', 'F♯')).toBe('key:f-sharp');
    expect(entityId('key', 'E')).toBe('key:e');
    expect(entityId('key', 'E♭')).not.toBe(entityId('key', 'E'));
  });

  it('does not read a Teach activity ref as an entity', () => {
    // `song:<id>:chart` is the classroom's grammar, not a song whose slug is
    // 'africa:chart'.
    expect(parseEntityId('song:africa:chart')).toBeNull();
    expect(isWellFormed('song:africa:chart')).toBe(false);
  });
});

describe('edges', () => {
  it('lists every edge kind once (the compiler checks it too)', () => {
    expect(new Set(EDGE_KINDS).size).toBe(EDGE_KINDS.length);
    expect([...EDGE_KINDS].sort()).toEqual(Object.keys(EDGE_LABELS).sort());
    expect([...EDGE_KINDS].sort()).toEqual(Object.keys(EDGE_ENDPOINTS).sort());
  });

  it('labels every edge in both directions', () => {
    for (const kind of EDGE_KINDS) {
      expect(EDGE_LABELS[kind]?.forward, kind).toBeTruthy();
      expect(EDGE_LABELS[kind]?.inverse, kind).toBeTruthy();
    }
  });

  it('declares endpoints for every edge', () => {
    for (const kind of EDGE_KINDS) {
      expect(EDGE_ENDPOINTS[kind]?.from.length, kind).toBeGreaterThan(0);
      expect(EDGE_ENDPOINTS[kind]?.to.length, kind).toBeGreaterThan(0);
    }
  });

  it('accepts a connection the schema allows', () => {
    expect(
      isValidEdge({
        from: 'song:aint_no_mountain_high_enough',
        kind: 'recorded_at',
        to: 'studio:hitsville-u-s-a',
      }),
    ).toBe(true);
  });

  it('dates a thing by its year, and reaches decades and eras only through one', () => {
    const ok = (from: EntityId, kind: EdgeKind, to: EntityId) =>
      isValidEdge({ from, kind, to });
    const dated: EntityId[] = [
      'song:africa',
      'release:toto-toto-iv',
      'event:evt-woodstock',
      'label:motown',
      'studio:hitsville-u-s-a',
    ];
    for (const from of dated) {
      expect(ok(from, 'from_year', 'year:1969'), from).toBe(true);
    }
    expect(ok('artist:toto', 'from_year', 'year:1977')).toBe(false);
    expect(ok('year:1982', 'in_decade', 'decade:1980s')).toBe(true);
    expect(ok('year:1982', 'from_era', 'era:electronic-hiphop')).toBe(true);
    expect(ok('song:africa', 'from_era', 'era:electronic-hiphop')).toBe(false);
    expect(ok('decade:1980s', 'from_era', 'era:electronic-hiphop')).toBe(false);
    expect(isWellFormed('year:1982')).toBe(true);
    expect(isWellFormed('decade:1980s')).toBe(true);
    expect(parseEntityId('decade:1980s')).toEqual({
      kind: 'decade',
      slug: '1980s',
    });
  });

  it('refuses a connection that makes no sense', () => {
    // A studio cannot have been recorded at a song.
    expect(
      isValidEdge({
        from: 'studio:hitsville-u-s-a',
        kind: 'recorded_at',
        to: 'song:aint_no_mountain_high_enough',
      }),
    ).toBe(false);
    // A song is not an instrument.
    expect(
      isValidEdge({
        from: 'artist:james-jamerson',
        kind: 'plays_instrument',
        to: 'song:africa',
      }),
    ).toBe(false);
  });
});
