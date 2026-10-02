import type { SuggestionDependency } from './status';
import type { Suggestion, SuggestionSource } from './types';

/**
 * Suggestions as the console shows them: in the site's own words, never
 * naming the outside catalogues the importer reads (owner decision of 30
 * September 2026).
 *
 * The importer writes its evidence for the developer who runs it, so its
 * lines say which catalogue said what, and carry that catalogue's ids and
 * links. The console reads the same rows, so before a row reaches the
 * screen its words are made plain here: a catalogue becomes "the outside
 * source" (or "outside" before a noun), its ids and links are dropped, and
 * the provider id stays as it was, because the logic still reads it. The
 * rows that only hold another catalogue's id for an item (`externalIds`)
 * are left out of what the console shows at all: the site keeps no such
 * ids, so there is nothing for a person to accept.
 *
 * Pure. Values are left alone: they are what an accept writes, and how a
 * value is shown is `valueText`'s.
 */

/** A catalogue's name, as the importer writes it in a sentence. */
const NAME = /\b(?:musicbrainz|wikidata|metabrainz)\b/i;

/** A link to one of the catalogues' pages, with its brackets. */
const LINK =
  /\s*\(?https?:\/\/[^\s)]*(?:musicbrainz|wikidata|metabrainz)[^\s)]*\)?/gi;

/** A catalogue id written out: a UUID. */
const UUID =
  /\s*\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** An item or property id of the outside reference: "Q238263", "(P434)". */
const ITEM_ID = /\s*\(\s*[QP]\d+\s*\)|\s*\b[QP]\d+\b/g;

const RULES: readonly [RegExp, string][] = [
  // "MusicBrainz links Wikidata": the two catalogues agree on who it is.
  [
    /\b(?:musicbrainz|wikidata|metabrainz)\s+links\s+(?:musicbrainz|wikidata|metabrainz)\b/gi,
    'the two outside sources link to each other',
  ],
  // "MusicBrainz or Wikidata give": both, as one.
  [
    /\b(?:musicbrainz|wikidata|metabrainz)\s+(?:or|and)\s+(?:musicbrainz|wikidata|metabrainz)\b/gi,
    'the outside sources',
  ],
  // "MusicBrainz's 1984", "MusicBrainz’s guitar".
  [/\b(?:musicbrainz|wikidata|metabrainz)(['’])s\b/gi, 'the outside source$1s'],
  // "titled … on MusicBrainz".
  [
    /\b(on|in|from|by|to|at|with|for)\s+(?:musicbrainz|wikidata|metabrainz)\b/gi,
    '$1 the outside source',
  ],
  // "MusicBrainz: formed 1989".
  [/\b(?:musicbrainz|wikidata|metabrainz)(?=\s*:)/gi, 'outside source'],
  // "MusicBrainz has 633 recordings", "Wikidata names the same …".
  [
    /\b(?:musicbrainz|wikidata|metabrainz)(?=\s+(?:has|have|had|links|names|says|gives|give|lists|bills|credits|agrees|agree|knows|calls|puts|dates|shows|is|was)\b)/gi,
    'the outside source',
  ],
  // Anything else is a catalogue's name before a noun: "MusicBrainz genres".
  [/\b(?:musicbrainz|wikidata|metabrainz)\b/gi, 'outside'],
  // "MBID" alone.
  [/\bmbids?\b/gi, 'id'],
];

/** Commas, brackets and spaces left behind once an id is taken out. */
const TIDY: readonly [RegExp, string][] = [
  [/\(\s*,\s*/g, '('],
  [/\s+([,;)])/g, '$1'],
  [/\(\s*\)/g, ''],
  [/,\s*\)/g, ')'],
  [/\s{2,}/g, ' '],
  [/[\s:;,]+$/g, ''],
];

/**
 * A line of the importer's in the site's words. `ids` also drops the
 * outside reference's item ids ("Q238263"), which only an imported
 * suggestion's text carries; a line that names a catalogue drops them
 * whatever `ids` says.
 */
export function plainSourceText(text: string, ids = false): string {
  const named = NAME.test(text) || /mbid/i.test(text);
  if (!named && !ids && !/https?:\/\//i.test(text)) return text;
  let out = text.replace(LINK, '');
  if (named || ids) out = out.replace(UUID, '').replace(ITEM_ID, '');
  for (const [pattern, to] of RULES) out = out.replace(pattern, to);
  for (const [pattern, to] of TIDY) out = out.replace(pattern, to);
  out = out.trim();
  // A line that began with a capital still does.
  if (/^[A-Z]/.test(text) && out) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

/** Whether a source is one of the importer's rather than the app's own. */
const fromOutside = (source: SuggestionSource) => source.provider !== 'app';

/**
 * A suggestion's sources as the console shows them: the provider, and for
 * the importer's a label in plain words with no page link and no id. Two
 * that read the same once plain are shown once.
 */
function plainSources(sources: readonly SuggestionSource[]) {
  const seen = new Set<string>();
  const out: SuggestionSource[] = [];
  for (const source of sources) {
    let next: SuggestionSource = source;
    if (fromOutside(source)) {
      const label = source.label ? plainSourceText(source.label, true) : '';
      next = { provider: source.provider, ...(label ? { label } : {}) };
    }
    const key = `${next.provider}|${next.url ?? ''}|${next.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

/** A suggestion with its words made plain; everything the logic reads kept. */
export function plainSuggestion(suggestion: Suggestion): Suggestion {
  const outside = suggestion.sources.some(fromOutside);
  const evidence = suggestion.evidence
    .map((line) => plainSourceText(line, outside))
    .filter(Boolean);
  return {
    ...suggestion,
    display: plainSourceText(suggestion.display, outside),
    evidence,
    sources: plainSources(suggestion.sources),
  };
}

/** The suggestion another rests on, as the server describes it, made plain. */
export function plainDependency(
  dependency: SuggestionDependency,
): SuggestionDependency {
  return { ...dependency, display: plainSourceText(dependency.display) };
}
