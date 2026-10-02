import { nameKey } from './cacheStage';

/**
 * Label and studio records the backend already has, so the song half links
 * to them instead of making a second "Columbia" (or taking its slug for
 * another Columbia).
 *
 * These are the four pilot songs' studios and labels
 * (docs/console-content-api-contract.md, priority 5), exactly as the repo
 * holds them in `src/content/data/studios.json` and `labels.json`, which
 * the mock seeds and repo mode serves (a test keeps the two the same), with
 * the country of the city each is in: a label's place is where it was
 * based, which is not always where the song was recorded (Columbia was in
 * New York).
 *
 * Neither kind has `externalIds`, and C33 matches only artists and places,
 * so the importer does the matching: the same name — "Abbey Road Studios"
 * is MusicBrainz's "Abbey Road Studios", "Apple" its "Apple Records" — and
 * the same town, or, where MusicBrainz places it in no town we know, the
 * same country. A MusicBrainz label of that name elsewhere (the UK's
 * Columbia) is another label, and gets a slug of its own.
 */

export type ExistingKind = 'label' | 'studio';

export interface ExistingRecord {
  kind: ExistingKind;
  slug: string;
  name: string;
  /** The globe city it is in. */
  placeId: string;
  /** That city's country (ISO 3166-1). */
  country: string;
}

export const EXISTING_RECORDS: readonly ExistingRecord[] = [
  {
    kind: 'studio',
    slug: 'hitsville-u-s-a',
    name: 'Hitsville U.S.A.',
    placeId: 'detroit',
    country: 'US',
  },
  {
    kind: 'studio',
    slug: 'sunset-sound',
    name: 'Sunset Sound',
    placeId: 'los-angeles',
    country: 'US',
  },
  {
    kind: 'studio',
    slug: 'britannia-row',
    name: 'Britannia Row',
    placeId: 'london',
    country: 'GB',
  },
  {
    kind: 'studio',
    slug: 'abbey-road-studios',
    name: 'Abbey Road Studios',
    placeId: 'london',
    country: 'GB',
  },
  {
    kind: 'label',
    slug: 'tamla',
    name: 'Tamla',
    placeId: 'detroit',
    country: 'US',
  },
  {
    kind: 'label',
    slug: 'columbia',
    name: 'Columbia',
    placeId: 'new-york',
    country: 'US',
  },
  {
    kind: 'label',
    slug: 'chrysalis',
    name: 'Chrysalis',
    placeId: 'london',
    country: 'GB',
  },
  {
    kind: 'label',
    slug: 'apple',
    name: 'Apple',
    placeId: 'london',
    country: 'GB',
  },
];

/** What a studio or a label is called, less the word saying what it is. */
export const recordNameKey = (name: string): string =>
  nameKey(name)
    .replace(
      /\s+(recording studios?|studios?|records|recordings|record company|music)$/,
      '',
    )
    .trim();

/** What MusicBrainz says of a label or a studio, for the match. */
export interface RecordFacts {
  name: string;
  /** The globe city its area resolves to, when it does. */
  placeId?: string;
  /** Its country, when known (ISO 3166-1). */
  country?: string | null;
}

/**
 * The record the backend has that this is: the same name, and the same town
 * — or, for one MusicBrainz places in no town of ours (a label based in "the
 * United States"), the same country. Null when there is none, or when two
 * would fit.
 */
export function existingRecordFor(
  kind: ExistingKind,
  facts: RecordFacts,
  records: readonly ExistingRecord[] = EXISTING_RECORDS,
): ExistingRecord | null {
  const key = recordNameKey(facts.name);
  if (!key) return null;
  const named = records.filter(
    (r) => r.kind === kind && recordNameKey(r.name) === key,
  );
  const fits = named.filter((r) =>
    facts.placeId
      ? facts.placeId === r.placeId
      : !!facts.country && facts.country.toUpperCase() === r.country,
  );
  return fits.length === 1 ? fits[0] : null;
}

/** Slugs the backend's records already have: never handed to a new one. */
export const existingSlugs = (
  kind: ExistingKind,
  records: readonly ExistingRecord[] = EXISTING_RECORDS,
): Set<string> =>
  new Set(records.filter((r) => r.kind === kind).map((r) => r.slug));
