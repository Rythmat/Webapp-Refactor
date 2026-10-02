import { describe, expect, it } from 'vitest';
import {
  compact,
  metaChange,
  optionalText,
  optionalYear,
  patchBody,
  readCoordinates,
  readStrings,
  sameValue,
} from '../shared';

describe('patchBody', () => {
  const body = { slug: 'tamla', name: 'Tamla', foundedYear: 1959 };

  it('sets one key and leaves the rest alone', () => {
    expect(patchBody(body, { name: 'Tamla Records' })).toStrictEqual({
      slug: 'tamla',
      name: 'Tamla Records',
      foundedYear: 1959,
    });
  });

  it('removes a key patched to undefined', () => {
    expect(patchBody(body, { foundedYear: undefined })).toStrictEqual({
      slug: 'tamla',
      name: 'Tamla',
    });
  });

  it('hands the same body back when nothing changes', () => {
    expect(patchBody(body, { name: 'Tamla' })).toBe(body);
    expect(patchBody(body, { placeId: undefined })).toBe(body);
    expect(patchBody(body, {})).toBe(body);
  });

  it('treats a rebuilt list or object with the same contents as no change', () => {
    const stored = {
      slug: 'detroit',
      aliases: ['Motor City'],
      coordinates: [42.33, -83.0458],
      externalIds: { wikidata: 'Q12439' },
      members: [{ artistId: 'a', from: 1960 }],
    };
    expect(patchBody(stored, { aliases: ['Motor City'] })).toBe(stored);
    expect(patchBody(stored, { coordinates: [42.33, -83.0458] })).toBe(stored);
    expect(patchBody(stored, { externalIds: { wikidata: 'Q12439' } })).toBe(
      stored,
    );
    expect(
      patchBody(stored, { members: [{ from: 1960, artistId: 'a' }] }),
    ).toBe(stored);
    // Order is part of a list.
    expect(
      patchBody({ genres: ['a', 'b'] }, { genres: ['b', 'a'] }),
    ).toStrictEqual({ genres: ['b', 'a'] });
  });
});

describe('sameValue', () => {
  it('compares as the stored JSON would', () => {
    expect(sameValue([1, [2, { a: 3 }]], [1, [2, { a: 3 }]])).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(
      false,
    );
    expect(sameValue([1], { 0: 1 })).toBe(false);
    expect(sameValue('1', 1)).toBe(false);
  });
});

describe('metaChange', () => {
  it('writes only the flag or the source that moved', () => {
    // A stored `unverified: false` shows unticked; editing the source leaves it.
    expect(
      metaChange(
        { unverified: undefined, source: 'discogs' },
        { unverified: undefined, source: 'wikipedia' },
      ),
    ).toStrictEqual({ source: 'wikipedia' });
    // A blank source nobody touched is not tidied away by the checkbox.
    expect(
      metaChange({ source: '  ' }, { source: '  ', unverified: true }),
    ).toStrictEqual({ unverified: true });
    expect(
      metaChange({ unverified: true, source: 'x' }, { source: 'x' }),
    ).toStrictEqual({ unverified: undefined });
    expect(metaChange({ source: 'x' }, { source: undefined })).toStrictEqual({
      source: undefined,
    });
  });
});

describe('the value helpers', () => {
  it('treat blank text and years as absent', () => {
    expect(optionalText('  ')).toBeUndefined();
    expect(optionalText(' a ')).toBe(' a ');
    expect(optionalYear('')).toBeUndefined();
    expect(optionalYear('1971')).toBe(1971);
  });

  it('compact a nested object to nothing when it empties', () => {
    expect(compact({ mbid: undefined, discogs: '' })).toBeUndefined();
    expect(compact({ artistId: 'x', from: undefined })).toStrictEqual({
      artistId: 'x',
    });
  });

  it('read what a half-typed body holds without trusting it', () => {
    expect(readStrings(['a', 2, 'b'])).toStrictEqual(['a', 'b']);
    expect(readStrings('a')).toStrictEqual([]);
    expect(readCoordinates([1, 2])).toStrictEqual([1, 2]);
    expect(readCoordinates([1])).toBeUndefined();
    expect(readCoordinates(['1', 2])).toBeUndefined();
  });
});
