import type { ResolvedArea } from '../areas';
import type { ArtistCandidate } from '../cacheStage';
import type { ArtistEvidence, CandidateFacts } from '../scoreIdentity';

/** Builders for scoring and field tests: a plain artist, a plain candidate. */

export const mbid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const area = (
  name: string,
  more: Partial<ResolvedArea> = {},
): ResolvedArea => ({
  id: `area-${name}`,
  name,
  type: 'City',
  isCountry: false,
  countryCode: 'US',
  countryName: null,
  wikidata: null,
  chain: [name],
  complete: true,
  ...more,
});

export const candidate = (
  n: number,
  more: Partial<CandidateFacts> = {},
): CandidateFacts => ({
  mbid: mbid(n),
  name: 'Marvin Gaye',
  aliases: [],
  type: 'Person',
  lookedUp: true,
  area: null,
  beginArea: null,
  lifeSpan: null,
  genres: [],
  releaseTitles: [],
  wikidata: [],
  memberOf: [],
  ...more,
});

export const songCandidate = (
  n: number,
  songIds: string[],
  releaseSongIds: string[] = songIds,
): ArtistCandidate => ({
  mbid: mbid(n),
  name: 'Marvin Gaye',
  recordings: songIds.length,
  songIds,
  releaseSongIds,
});

export const evidence = (
  more: Partial<ArtistEvidence> = {},
): ArtistEvidence => ({
  slug: 'marvin-gaye',
  name: 'Marvin Gaye',
  aliases: [],
  oneWord: false,
  songCandidates: [],
  songTitles: { lets_get_it_on: "Let's Get It On" },
  events: [],
  years: [],
  genres: new Set(),
  pin: null,
  candidates: [],
  pending: false,
  ...more,
});
