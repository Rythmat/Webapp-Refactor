import { describe, expect, it } from 'vitest';
import {
  EDGE_ENDPOINTS,
  EDGE_KINDS,
  EDGE_LABELS,
  entityId,
  isValidEdge,
  isWellFormed,
  parseEntityId,
  toSlug,
} from '../types';

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
});

describe('edges', () => {
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
