import type {
  Suggestion,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import {
  artistSuggestions,
  type FieldReport,
  WD_ITEM,
  type WikidataView,
} from './artistFields';
import {
  createPlaceBook,
  type PlaceBook,
  type PlaceToCreate,
} from './placeMap';
import {
  type ArtistEvidence,
  flagSharedPicks,
  type IdentityResult,
  type IdentityTier,
  scoreIdentity,
} from './scoreIdentity';

/**
 * From scored artists to the suggestion rows the Table reviews, and the
 * places those rows need created first.
 *
 * An artist whose search is not in the cache yet (a fetch still running) is
 * held back whole: scoring it on half its candidates could call it sure.
 */

export interface ScoredArtist {
  evidence: ArtistEvidence;
  identity: IdentityResult;
}

export function scoreArtists(evidence: readonly ArtistEvidence[]): {
  scored: ScoredArtist[];
  shared: string[];
} {
  const scored = evidence.map((e) => ({
    evidence: e,
    identity: scoreIdentity(e),
  }));
  const shared = flagSharedPicks(
    scored.filter((s) => !s.evidence.pending).map((s) => s.identity),
  );
  return { scored, shared };
}

/** A place to create, and which suggestions need it. */
export interface PlaceArtifact {
  slug: string;
  body: PlaceToCreate['body'];
  sources: SuggestionSource[];
  neededBy: string[];
}

export type TierCounts = Record<SuggestionTier, number>;

export interface SuggestionCounts {
  suggestions: number;
  byTier: TierCounts;
  /** Per path: 'externalIds.mbid', 'born.date', 'genreIds[]', …. */
  byField: Record<string, TierCounts>;
  /** Our artists by how sure their identity is (pending: not all fetched yet). */
  identity: Record<IdentityTier | 'pending', number>;
  /** Artists with at least one field suggestion beyond their identity. */
  artistsWithFields: number;
  placesToCreate: number;
  /** Suggestions whose place is one of ours already. */
  placesMapped: number;
}

export interface Unmapped {
  genres: [string, number][];
  instruments: [string, number][];
  places: [string, number][];
  /** Residences (P551) no other source named, so no City was offered. */
  residences: [string, number][];
}

export interface BuiltSuggestions {
  suggestions: Suggestion[];
  places: PlaceArtifact[];
  counts: SuggestionCounts;
  unmapped: Unmapped;
  /** MusicBrainz ids picked for more than one of our artists. */
  shared: string[];
  /**
   * The run's places, for the song half to look in (`find` only: it must
   * never add to them, or the artist rows' place slugs would move).
   */
  placeBook: PlaceBook;
}

const emptyTiers = (): TierCounts => ({ sure: 0, likely: 0, ambiguous: 0 });

const tally = (names: readonly string[]): [string, number][] => {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

/** Suggestions in a stable order: by artist, then path, then id. */
export const bySuggestionOrder = (a: Suggestion, b: Suggestion): number =>
  a.target.slug.localeCompare(b.target.slug) ||
  a.path.localeCompare(b.path) ||
  a.id.localeCompare(b.id);

export function buildSuggestions(
  scored: readonly ScoredArtist[],
  shared: readonly string[],
  wd: WikidataView,
  batch: string,
): BuiltSuggestions {
  const places = createPlaceBook();
  const ready = scored.filter((s) => !s.evidence.pending);
  const fields = () =>
    ready.map(({ evidence, identity: result }) => {
      const facts = evidence.candidates;
      const pick = result.pick
        ? (facts.find((f) => f.mbid === result.pick!.mbid) ?? null)
        : null;
      return artistSuggestions({
        artist: evidence,
        identity: result,
        pick,
        candidates: facts,
        wd,
        places,
        batch,
      });
    });
  // Twice: the first pass asks for every place, so the second hands out the
  // slugs the whole set gives them — the same whatever order the artists
  // come in (`placeMap.ts` assignSlugs).
  fields();
  const outs = fields();

  const suggestions: Suggestion[] = [];
  const report: FieldReport = {
    genres: [],
    instruments: [],
    places: [],
    residences: [],
  };
  const identity: SuggestionCounts['identity'] = {
    sure: 0,
    likely: 0,
    ambiguous: 0,
    weak: 0,
    none: 0,
    pending: scored.length - ready.length,
  };
  for (const { identity: result } of ready) identity[result.tier]++;
  let artistsWithFields = 0;
  for (const out of outs) {
    suggestions.push(...out.suggestions);
    if (out.suggestions.some((s) => !s.path.startsWith('externalIds.')))
      artistsWithFields++;
    report.genres.push(...out.report.genres);
    report.instruments.push(...out.report.instruments);
    report.places.push(...out.report.places);
    report.residences.push(...out.report.residences);
  }
  suggestions.sort(bySuggestionOrder);

  const counts: SuggestionCounts = {
    suggestions: suggestions.length,
    byTier: emptyTiers(),
    byField: {},
    identity,
    artistsWithFields,
    placesToCreate: places.created().length,
    placesMapped: suggestions.filter(
      (s) =>
        (s.path === 'basedInPlaceId' || s.path === 'born.placeId') &&
        !s.requires?.length,
    ).length,
  };
  for (const s of suggestions) {
    counts.byTier[s.tier]++;
    counts.byField[s.path] ??= emptyTiers();
    counts.byField[s.path][s.tier]++;
  }

  const neededBy = new Map<string, string[]>();
  for (const s of suggestions)
    for (const r of s.requires ?? [])
      neededBy.set(r.slug, [...(neededBy.get(r.slug) ?? []), s.id]);
  const placeArtifacts: PlaceArtifact[] = places
    .created()
    .filter((p) => neededBy.has(p.slug))
    .map((p) => ({
      slug: p.slug,
      body: p.body,
      sources: [
        ...(p.wikidata
          ? [
              {
                provider: 'wikidata' as const,
                url: `${WD_ITEM}${p.wikidata}`,
                label: 'P625',
                externalId: p.wikidata,
              },
            ]
          : []),
        ...(p.mbArea
          ? [
              {
                provider: 'musicbrainz' as const,
                url: `https://musicbrainz.org/area/${p.mbArea}`,
                label: 'area',
                externalId: p.mbArea,
              },
            ]
          : []),
      ],
      neededBy: [...new Set(neededBy.get(p.slug))].sort(),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  counts.placesToCreate = placeArtifacts.length;

  return {
    suggestions,
    places: placeArtifacts,
    counts,
    unmapped: {
      genres: tally(report.genres),
      instruments: tally(report.instruments),
      places: tally(report.places),
      residences: tally(report.residences),
    },
    shared: [...shared],
    placeBook: places,
  };
}
