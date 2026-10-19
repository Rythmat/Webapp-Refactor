import { describe, expect, it } from 'vitest';
import type { Fill, GapArtist } from '../shared';
import { checkFill } from '../validateFills';

const person: GapArtist = {
  slug: 'someone',
  name: 'Someone',
  group: false,
  current: {},
  empty: [
    'born.date',
    'born.placeId',
    'basedInPlaceId',
    'activeFrom',
    'activeTo',
    'genreIds',
    'instrumentIds',
    'group',
  ],
};
const band: GapArtist = { ...person, slug: 'a-band', group: true };
const src = [{ url: 'https://en.wikipedia.org/wiki/X', field: 'infobox' }];
const fill = (
  path: Fill['path'],
  value: unknown,
  extra: Partial<Fill> = {},
): Fill => ({
  slug: 'someone',
  path,
  value,
  sources: src,
  via: 'research',
  ...extra,
});
const none = new Set<string>();

describe('checkFill', () => {
  it('passes good values', () => {
    expect(
      checkFill(fill('born.date', '1981-09-04'), person, none, false),
    ).toBeNull();
    expect(
      checkFill(fill('born.placeId', 'london'), person, none, false),
    ).toBeNull();
    expect(
      checkFill(fill('genreIds', ['rock', 'pop']), person, none, false),
    ).toBeNull();
    expect(
      checkFill(fill('instrumentIds', ['lead-vocals']), person, none, false),
    ).toBeNull();
    expect(checkFill(fill('activeFrom', 1999), person, none, false)).toBeNull();
  });

  it('refuses a birthplace on a group', () => {
    expect(checkFill(fill('born.placeId', 'london'), band, none, true)).toMatch(
      /group/,
    );
  });

  it('refuses unknown vocabulary and places', () => {
    expect(
      checkFill(fill('genreIds', ['not-a-genre']), person, none, false),
    ).toMatch(/genre/);
    expect(
      checkFill(fill('instrumentIds', ['guitar']), person, none, false),
    ).toMatch(/instrument/);
    expect(
      checkFill(fill('basedInPlaceId', 'atlantis'), person, none, false),
    ).toMatch(/place/);
    expect(
      checkFill(
        fill('basedInPlaceId', 'atlantis'),
        person,
        new Set(['atlantis']),
        false,
      ),
    ).toBeNull();
  });

  it('refuses bad dates and years', () => {
    expect(
      checkFill(fill('born.date', '1990-02-30'), person, none, false),
    ).toMatch(/day/);
    expect(
      checkFill(fill('born.date', 'May 1990'), person, none, false),
    ).toMatch(/date/);
    expect(checkFill(fill('activeFrom', 3000), person, none, false)).toMatch(
      /year/,
    );
  });

  it('refuses outside catalogues, missing sources and filled cells', () => {
    expect(
      checkFill(
        fill('basedInPlaceId', 'https://musicbrainz.org/x'),
        person,
        none,
        false,
      ),
    ).toMatch(/outside/);
    expect(
      checkFill(fill('activeFrom', 1999, { sources: [] }), person, none, false),
    ).toMatch(/source/);
    expect(
      checkFill(
        fill('activeFrom', 1999),
        { ...person, empty: ['genreIds'] },
        none,
        false,
      ),
    ).toMatch(/not empty/);
  });
});
