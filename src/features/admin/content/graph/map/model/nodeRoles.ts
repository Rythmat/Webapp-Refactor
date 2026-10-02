import type { EntityKind } from '@/content/graph/types';

/**
 * What each kind of Atlas node is on the Mind Map, in Obsidian's terms.
 *
 * Obsidian's graph draws three sorts of dot. Notes are the things a vault is
 * made of, and are always drawn. Tags are labels many notes share, and are
 * hidden until the Filters panel's "Tags" switch is turned on. Attachments
 * are the files notes embed, behind a switch of their own. The Atlas maps
 * onto the same three:
 *
 * - Notes are the things the Atlas is about: songs, artists, globe events,
 *   cities, records, labels, studios and progressions.
 * - Tags are the shared labels: genres, times, keys and moods, instruments and
 *   regions. Each connects to hundreds or thousands of items, so drawing them
 *   pulls the whole layout into stars around them. That is why they start
 *   hidden, as Obsidian's tags do, and why they come in families the owner
 *   can switch on one at a time.
 * - Curriculum is the Teach days and globe pathways. They are owned by code
 *   rather than edited as Atlas items, and stand in for Obsidian's
 *   attachments, also hidden at first.
 *
 * The table below is a `Record` over every entity kind, so a kind added to
 * the graph's vocabulary fails to compile until someone decides its role.
 *
 * Places are the one kind whose role depends on the node rather than the
 * kind: a city is a note, but a globe region (`place:region-europe`) is a
 * tag, because every city in it links to it.
 */

/** The families tags come in, each with its own switch under "Tags". */
export type TagFamily =
  | 'genres'
  | 'time'
  | 'theory'
  | 'instruments'
  | 'regions';

/** A node's role: a note, a tag in one family, or curriculum. */
export type NodeRole =
  | { readonly role: 'note' }
  | { readonly role: 'tag'; readonly family: TagFamily }
  | { readonly role: 'curriculum' };

const NOTE: NodeRole = Object.freeze({ role: 'note' });
const CURRICULUM: NodeRole = Object.freeze({ role: 'curriculum' });
const tag = (family: TagFamily): NodeRole =>
  Object.freeze({ role: 'tag', family });

const GENRES = tag('genres');
const TIME = tag('time');
const THEORY = tag('theory');
const INSTRUMENTS = tag('instruments');
const REGIONS = tag('regions');

/** Every kind's role. A region's role is decided by its id (see `nodeRole`). */
export const KIND_ROLES: Readonly<Record<EntityKind, NodeRole>> = {
  song: NOTE,
  artist: NOTE,
  event: NOTE,
  place: NOTE,
  release: NOTE,
  label: NOTE,
  studio: NOTE,
  progression: NOTE,
  genre: GENRES,
  subgenre: GENRES,
  scene: GENRES,
  year: TIME,
  decade: TIME,
  era: TIME,
  key: THEORY,
  mode: THEORY,
  vibe: THEORY,
  instrument: INSTRUMENTS,
  teach_day: CURRICULUM,
  pathway: CURRICULUM,
};

/** The id prefix of a globe region's place node: `place:region-europe`. */
export const REGION_ID_PREFIX = 'place:region-';

/** Is this id a globe region rather than a city? */
export const isRegionId = (id: string): boolean =>
  id.startsWith(REGION_ID_PREFIX);

/** A node's role, from its kind, except that a region is a tag. */
export function nodeRole(node: {
  readonly id: string;
  readonly kind: EntityKind;
}): NodeRole {
  if (node.kind === 'place' && isRegionId(node.id)) return REGIONS;
  return KIND_ROLES[node.kind] ?? NOTE;
}

/** The tag families in the order the Filters panel lists them. */
export const TAG_FAMILIES: readonly TagFamily[] = [
  'genres',
  'time',
  'theory',
  'instruments',
  'regions',
];

/** What the Filters panel calls each family. */
export const TAG_FAMILY_LABEL: Readonly<Record<TagFamily, string>> = {
  genres: 'Genres',
  time: 'Time',
  theory: 'Theory',
  instruments: 'Instruments',
  regions: 'Regions',
};
