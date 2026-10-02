import { SLUG_PATTERN } from '@/content/graph/ids';

/**
 * Each content kind's identity field and slug pattern, as data the API copies.
 *
 * `SLUG_PATTERN` (src/content/graph/ids.ts) is keyed by graph entity kind and
 * imports other modules, so it cannot be copied into the API as it stands.
 * This re-keys it by content kind, adds which body field is the identity, and
 * is written to `slugPatterns.generated.json` — pattern sources as strings, so
 * any language can compile them. `slugPatterns.test.ts` regenerates the file
 * and checks every seed id against its pattern.
 */

type Identity = 'id' | 'slug';

/** Content kind → [identity field, graph entity kind whose pattern applies]. */
const KINDS: Record<string, [Identity, keyof typeof SLUG_PATTERN | null]> = {
  song: ['id', 'song'],
  globe_event: ['id', 'event'],
  globe_city: ['id', 'place'],
  chord_progression: ['id', 'progression'],
  artist: ['slug', 'artist'],
  // `release` joins the graph's entity kinds with its deriver (checkpoint 1d);
  // its slugs follow the same kebab rule as every other new kind.
  release: ['slug', 'label'],
  studio: ['slug', 'studio'],
  label: ['slug', 'label'],
  // No pattern: flows keep today's rule (`<genre>-l<n>`), and artist_location
  // ids are lowercase artist names on a kind being retired.
  activity_flow: ['id', null],
  fundamentals_flow: ['id', null],
  artist_location: ['id', null],
};

export function buildSlugPatterns() {
  return Object.fromEntries(
    Object.entries(KINDS).map(([kind, [identity, entity]]) => [
      kind,
      { identity, pattern: entity ? SLUG_PATTERN[entity].source : null },
    ]),
  );
}
