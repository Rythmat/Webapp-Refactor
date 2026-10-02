import { type GlobeEventInput, placeAndGenreNames } from '../graph/deriveGraph';
import type { EventMatchPath } from '../graph/eventMatches';
import { normalizeArtistName as normalize } from '../graph/slugs';
import {
  appSource,
  createCollector,
  eventMatchesOf,
  firstOfEach,
  isHandAuthored,
  listed,
  makeSuggestion,
} from './plan';
import {
  CONFIDENCE,
  type LinkingArtist,
  type LinkingInput,
  type Plan,
  type PlanOptions,
} from './types';

/**
 * Event artists: who each hand-authored event is about, from its title and
 * tags (`eventMatches.ts`), offered as the event's stored `artistIds`.
 *
 * One suggestion per event, and it is the whole list. Stored ids win over
 * the guesses (decision 5), so accepting one artist onto an event that
 * stores none would make it about that artist alone and drop every other
 * guess from the graph — which is why `apply.ts` refuses to add one element
 * to a list not stored yet. The owner accepts the set, or edits it first.
 *
 * `sure` only when no name in it is in doubt. A name is in doubt when:
 *  - it is one word, or "The" and one word ("Common", "Eve", "The Roots",
 *    "The Internet"): a tag can mean something else by it;
 *  - it is also a place's or a genre's name ("Portland, Maine", "Manila
 *    Sound"): the registry holds a few such entries until the owner decides
 *    them (artistRegistry.test.ts), and the event is about the city or the
 *    scene as likely as the act;
 *  - the registry writes it ending in ':', ',' or an apostrophe ("Congo
 *    Square:", "Phil Collins'"): a name carved out of a sentence, which may
 *    be no act at all.
 * An event naming one is `likely`: a person looks before it is stored. The
 * match itself already needs a tag that is the artist's name — a title
 * alone never names an artist — so a list with no doubtful name, confirmed
 * by the event's own tags, is as sure as the app's data gets.
 *
 * Song events are skipped: a song's event is the song (C16).
 */

export interface EventArtistsReport {
  /** Hand-authored events read. */
  events: number;
  /** Events the matcher found at least one artist for. */
  matched: number;
  /** Event–artist pairs across them. */
  pairs: number;
  sure: { events: number; pairs: number };
  likely: { events: number; pairs: number };
  /** The one-word names that made an event `likely`, by slug. */
  oneWordArtists: string[];
  /**
   * The other names that made one `likely`, by slug: those that are also a
   * place's or a genre's, and those the registry writes like the end of a
   * sentence.
   */
  doubtfulArtists: { slug: string; why: 'place' | 'genre' | 'spelling' }[];
  /** Events whose own tags name no artist: left for a person to fill. */
  unmatched: number;
  /** Suggestions that could not be written where they point. */
  unreachable: { id: string; reason: string }[];
}

/**
 * A name that is one word, which a tag can mean something else by — "The"
 * and one word too ("The Roots", "The Internet").
 */
export const isOneWordName = (name: string): boolean =>
  name
    .trim()
    .replace(/^the\s+(?=\S)/i, '')
    .split(/\s+/).length === 1;

/**
 * A registry name that ends as a sentence would: 'Congo Square:', 'Phil
 * Collins''. An apostrophe that closes a name with another in it is the
 * name's own ("Keb' Mo'").
 */
const endsLikeASentence = (name: string): boolean => {
  const text = name.trim();
  if (/[:,]$/.test(text)) return true;
  return /['’]$/.test(text) && (text.match(/['’]/g) ?? []).length === 1;
};

/** The tag on the event that names this artist, as written. */
const tagNaming = (
  event: GlobeEventInput,
  artist: LinkingArtist | undefined,
): string | undefined => {
  if (!artist || !Array.isArray(event.tags)) return undefined;
  const names = new Set(
    [artist.name, ...(artist.aliases ?? [])].map((n) => normalize(n)),
  );
  return event.tags.find(
    (tag) => typeof tag === 'string' && names.has(normalize(tag)),
  );
};

export function planEventArtists(
  input: LinkingInput,
  options: PlanOptions = {},
): Plan<EventArtistsReport> {
  const matches = eventMatchesOf(input);
  const artists = new Map(
    (input.artists ?? []).map((artist) => [artist.slug, artist]),
  );
  const out = createCollector();
  const report: EventArtistsReport = {
    events: 0,
    matched: 0,
    pairs: 0,
    sure: { events: 0, pairs: 0 },
    likely: { events: 0, pairs: 0 },
    oneWordArtists: [],
    doubtfulArtists: [],
    unmatched: 0,
    unreachable: out.unreachable,
  };
  const oneWord = new Set<string>();
  const doubtful = new Map<string, 'place' | 'genre' | 'spelling'>();
  const collisions = placeAndGenreNames(input);
  const placeNames = new Set([...collisions.placeNames].map(normalize));
  const genreNames = new Set([...collisions.genreNames].map(normalize));
  /** Why a name that is not one word is still in doubt, if it is. */
  const doubtOf = (name: string): 'place' | 'genre' | 'spelling' | null => {
    const folded = normalize(name);
    if (placeNames.has(folded)) return 'place';
    if (genreNames.has(folded)) return 'genre';
    return endsLikeASentence(name) ? 'spelling' : null;
  };

  for (const event of firstOfEach(input.events, (e) => e?.id)) {
    if (!isHandAuthored(event.id)) continue;
    report.events++;
    const found = matches.get(event.id)?.artists ?? [];
    // Each artist once, in the matcher's order (tags first, as the globe's
    // chips are), with every part of the event that named them.
    const paths = new Map<string, EventMatchPath[]>();
    for (const m of found)
      paths.set(m.artistId, [...(paths.get(m.artistId) ?? []), m.path]);
    if (paths.size === 0) {
      report.unmatched++;
      continue;
    }
    const ids = [...paths.keys()];
    const nameOf = (id: string) => artists.get(id)?.name ?? id;
    const single = ids.filter((id) => isOneWordName(nameOf(id)));
    single.forEach((id) => oneWord.add(id));
    const doubts = ids.flatMap((id) => {
      const why = single.includes(id) ? null : doubtOf(nameOf(id));
      if (why) doubtful.set(id, why);
      return why ? [{ id, why }] : [];
    });
    const tier = single.length || doubts.length ? 'likely' : 'sure';

    const evidence = ids.map((id) => {
      const name = nameOf(id);
      const tag = tagNaming(event, artists.get(id));
      const byTag = tag ? `the tag "${tag}"` : 'a tag';
      return paths.get(id)!.includes('title')
        ? `the title opens on ${name}, and ${byTag} confirms it`
        : `${byTag} names ${name}`;
    });
    if (single.length)
      evidence.push(
        `${listed(single.map((id) => `"${nameOf(id)}"`))} ${
          single.length === 1 ? 'is a one-word name' : 'are one-word names'
        }, which a tag can mean something else by: a person checks`,
      );
    for (const { id, why } of doubts)
      evidence.push(
        why === 'spelling'
          ? `the registry writes "${nameOf(id)}" as the end of a sentence would, so it may be no act at all: a person checks`
          : `"${nameOf(id)}" is also the name of a ${why}, which the event may be about instead: a person checks`,
      );
    const read = [...new Set([...paths.values()].flat())]
      .map((path) => (path === 'tags[]' ? 'tags' : 'title'))
      .sort()
      .join(', ');

    out.add(
      makeSuggestion(
        {
          target: { kind: 'globe_event', slug: event.id },
          path: 'artistIds',
          op: 'set',
          value: ids,
          display: `About ${listed(ids.map(nameOf))}`,
          sources: [appSource(`${event.id} ${read}`)],
          evidence,
          confidence: tier === 'sure' ? CONFIDENCE.sure : CONFIDENCE.likely,
          tier,
        },
        options,
      ),
      event,
    );
    report.matched++;
    report.pairs += ids.length;
    report[tier].events++;
    report[tier].pairs += ids.length;
  }
  report.oneWordArtists = [...oneWord].sort();
  report.doubtfulArtists = [...doubtful]
    .map(([slug, why]) => ({ slug, why }))
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { planned: out.planned, report };
}
