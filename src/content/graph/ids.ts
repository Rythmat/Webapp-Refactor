import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import { artistSlug, keySlug, toSlug } from './slugs';
import type { EntityId, EntityKind } from './types';

/**
 * The id grammar, one rule per kind.
 *
 * This is the single place that says what a well-formed slug looks like, so
 * the console's pickers, the graph's integrity checks and — through a generated
 * copy — the content API's validator all agree. Most kinds are kebab-case; the
 * exceptions are ids that already exist in stored data and are referenced
 * elsewhere, which re-slugging would silently break:
 *
 *  - song: snake_case (`aint_no_mountain_high_enough`) — globe event ids, set
 *    lists and content refs point at them.
 *  - event: the globe's own ids, `evt-…` for hand-authored events and
 *    `song-<songId>` for the ones derived from songs (so they carry the song's
 *    underscores).
 *  - progression: the library's numeric ids.
 *  - key: the tonic with its accidental spelled (`e-flat`), never folded.
 *  - teach_day: the canonical curriculum's day-stub slugs, `<unit>-day-<n>`
 *    (`aug-day-1`, `king-day-10`). Kebab too, but the `-day-<n>` tail is part
 *    of the grammar, so a unit slug can never pass for a day.
 *  - year: the year's number with no leading zero (`1982`, `590` — the
 *    globe's events go back that far), so each year has exactly one id.
 *  - decade: its first year and an `s` (`1980s`, `590s`); a year never
 *    passes for a decade, nor `1982s` for one.
 *
 * Pathways (`HISTORICAL_MODULES` ids, `blues-to-rock`) and releases are plain
 * kebab.
 *
 * A slug never contains ':' — that is what lets `song:africa:chart` (a Teach
 * activity ref, a different grammar) be rejected rather than read as a song
 * whose slug is `africa:chart`.
 */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SLUG_PATTERN: Record<EntityKind, RegExp> = {
  song: /^[a-z0-9_]+$/,
  event: /^(evt-[a-z0-9-]+|song-[a-z0-9_]+)$/,
  progression: /^\d+$/,
  key: /^[a-g](-(flat|sharp))?$/,
  artist: KEBAB,
  genre: KEBAB,
  vibe: KEBAB,
  instrument: KEBAB,
  label: KEBAB,
  studio: KEBAB,
  place: KEBAB,
  era: KEBAB,
  subgenre: KEBAB,
  scene: KEBAB,
  mode: KEBAB,
  release: KEBAB,
  teach_day: /^[a-z0-9]+(-[a-z0-9]+)*-day-[0-9]+$/,
  pathway: KEBAB,
  year: /^[1-9]\d{0,3}$/,
  decade: /^[1-9]\d{0,2}0s$/,
};

/** Kinds whose stored ids are used verbatim — normalising them would rewrite them. */
const VERBATIM: ReadonlySet<EntityKind> = new Set([
  'song',
  'event',
  'progression',
]);

/**
 * Text or an existing slug → the id the graph uses.
 *
 * Artists go through `artistSlug`, the registry's own normaliser (it folds
 * '&' to 'and'), because anything else would mint ids that look right and
 * match nothing. Keys keep their accidental. Every rule is idempotent, so
 * passing a slug that is already well formed returns it unchanged.
 */
export function toEntityId(kind: EntityKind, raw: string): EntityId {
  const text = raw.trim();
  if (VERBATIM.has(kind)) return `${kind}:${text}`;
  if (kind === 'artist') return `artist:${artistSlug(text)}`;
  if (kind === 'key') return `key:${keySlug(text) ?? toSlug(text)}`;
  return `${kind}:${toSlug(text)}`;
}

/** Does this slug follow its kind's convention? */
export const isWellFormedSlug = (kind: EntityKind, slug: string): boolean =>
  SLUG_PATTERN[kind].test(slug);

/**
 * One node per real thing.
 *
 * A song and the globe event derived from it (`song-<songId>`) are the same
 * recording seen from two segments. Left as two nodes, every connection would
 * be split between them and the mind map would show the song twice; folded,
 * the song's credits and the event's influence arcs meet on one node. A
 * second recording of a charted song with its own pin folds onto that song
 * too (`songEventAliases.ts`): `event:song-valerie_bbc_live_version` is
 * `song:valerie`.
 */
export function canonicalId(id: EntityId): EntityId {
  const song = id.startsWith('event:')
    ? songIdForEvent(id.slice('event:'.length))
    : null;
  return song === null ? id : `song:${song}`;
}
