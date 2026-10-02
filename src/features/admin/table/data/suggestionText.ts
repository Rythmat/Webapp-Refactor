import type {
  RequiredRecord,
  Suggestion,
  SuggestionProvider,
  SuggestionTier,
} from '@/content/suggestions/types';

/**
 * How a suggestion reads to the owner, in the grid's tooltips, the row
 * panel and the bulk accept: who offers it, how sure it is. Pure.
 *
 * The site never names the outside catalogues the importer reads (owner
 * decision of 30 September 2026): every one of them is "an outside
 * source", and the app's own planners are "the app".
 */

const OUTSIDE = 'an outside source';

export const PROVIDER_NAME: Record<SuggestionProvider, string> = {
  app: 'the app',
  musicbrainz: OUTSIDE,
  wikidata: OUTSIDE,
};

export const TIER_NAME: Record<SuggestionTier, string> = {
  sure: 'Sure',
  likely: 'Likely',
  ambiguous: 'Ambiguous',
};

/** 'the app and an outside source': each name once, in the order they come. */
export function providersOf(suggestion: Pick<Suggestion, 'sources'>): string {
  const names = [
    ...new Set(suggestion.sources.map((s) => PROVIDER_NAME[s.provider])),
  ];
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** 'Sure · 90%'. */
export const tierLine = (
  suggestion: Pick<Suggestion, 'tier' | 'confidence'>,
): string =>
  `${TIER_NAME[suggestion.tier]} · ${Math.round(suggestion.confidence * 100)}%`;

/** A ghost chip's tooltip: "Took place in Detroit — suggested by the app · Sure · 90%". */
export const suggestionTitle = (
  suggestion: Pick<Suggestion, 'display' | 'sources' | 'tier' | 'confidence'>,
): string =>
  `${suggestion.display} — suggested by ${providersOf(suggestion)} · ${tierLine(suggestion)}`;

/** What a record a value needs is called, in a sentence. */
const RECORD_WORD: Readonly<Record<string, string>> = {
  globe_city: 'place',
  artist: 'artist',
  release: 'record',
  studio: 'studio',
  label: 'label',
};

/** "Creates the place “Gary, US” first": a record a suggestion makes before it is written. */
export function requiresLine(record: RequiredRecord): string {
  const body = (record.body ?? {}) as { name?: unknown; country?: unknown };
  const name = typeof body.name === 'string' ? body.name : record.slug;
  const country =
    typeof body.country === 'string' && body.country ? `, ${body.country}` : '';
  const word = RECORD_WORD[record.kind] ?? record.kind.replace(/_/g, ' ');
  return `Creates the ${word} “${name}${country}” first`;
}
