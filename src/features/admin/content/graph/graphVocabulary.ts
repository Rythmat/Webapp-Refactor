import type { EntityId, EntityKind } from '@/content/graph/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { PANEL_EDIT_KINDS } from '../../table/fullEditor';
import { tableHrefForNode } from '../../table/tablePaths';
import { toConsolePath } from '../mirror/mirrorPaths';
import { DEFAULT_NODE_COLOR, PRESET_GROUPS } from './map/model/colorGroups';
import type { NodeFacets } from './map/model/facets';
import { compileQueryText } from './map/model/graphQuery';
import { nodeRole } from './map/model/nodeRoles';

/**
 * What Cortex calls things, what colour it gives each kind, and where it
 * links them.
 *
 * The colours are not kept here. Cortex colours its dots with its colour
 * groups (`map/model/colorGroups.ts`), which start as one preset per kind,
 * so `kindColor` asks those presets: a kind takes the colour of the first
 * preset that a node of that kind would match, and the neutral grey a node
 * no group claims gets otherwise. Find, the List view and the preview card
 * fall back on it where the page has no live groups to ask, and the two
 * always agree with the graph's own presets.
 */

export const KIND_LABEL: Record<EntityKind, string> = {
  song: 'Song',
  artist: 'Artist',
  progression: 'Progression',
  genre: 'Genre',
  subgenre: 'Subgenre',
  vibe: 'Vibe',
  instrument: 'Instrument',
  label: 'Label',
  studio: 'Studio',
  place: 'Place',
  era: 'Era',
  scene: 'Scene',
  event: 'Globe event',
  key: 'Key',
  mode: 'Mode',
  release: 'Record',
  teach_day: 'Teach day',
  pathway: 'Pathway',
  year: 'Year',
  decade: 'Decade',
};

const NO_KEYS: ReadonlySet<string> = new Set<string>();
const NO_DECADES: ReadonlySet<number> = new Set<number>();

/**
 * What the presets can ask of a node when only its kind is known: its kind,
 * whether it is a tag or curriculum, and nothing else (no name, genre, place
 * or year). Every preset asks only that, so this is all it needs.
 */
const kindFacets = (kind: EntityKind): NodeFacets => {
  const id = `${kind}:` as EntityId;
  const role = nodeRole({ id, kind }).role;
  return {
    id,
    idKey: id,
    slugKey: '',
    kind,
    name: '',
    status: 'code',
    genres: NO_KEYS,
    places: NO_KEYS,
    years: [],
    firstYear: null,
    decades: NO_DECADES,
    eras: NO_KEYS,
    tag: role === 'tag',
    curriculum: role === 'curriculum',
  };
};

/** Each kind's preset colour, worked out the first time one is asked for. */
let presetColors: ReadonlyMap<string, string> | null = null;

const kindPresetColors = (): ReadonlyMap<string, string> => {
  if (presetColors) return presetColors;
  const presets = PRESET_GROUPS.map((group) => ({
    match: compileQueryText(group.query).match,
    color: group.color,
  }));
  const colors = new Map<string, string>();
  for (const kind of Object.keys(KIND_LABEL) as EntityKind[]) {
    const facets = kindFacets(kind);
    const hit = presets.find((p) => p.match?.(facets, false));
    colors.set(kind, hit?.color ?? DEFAULT_NODE_COLOR);
  }
  presetColors = colors;
  return colors;
};

/**
 * A kind's dot colour as the preset colour groups give it; the default grey
 * for a kind no preset claims, or for something that is not a kind.
 */
export const kindColor = (kind: string): string =>
  kindPresetColors().get(kind) ?? DEFAULT_NODE_COLOR;

export const kindLabel = (kind: string): string =>
  KIND_LABEL[kind as EntityKind] ?? kind;

const slugOf = (id: string) => id.slice(id.indexOf(':') + 1);

/**
 * Where a node shows in the console's copy of the app, if it has a page
 * there. Artists open on the globe by name, which is how the app addresses
 * them; places only when they are cities (regions have no stop). Years and
 * decades, like the other vocabularies, have no page of their own.
 */
export function appPageFor(node: {
  id: string;
  kind: string;
  label: string;
}): string | null {
  const slug = slugOf(node.id);
  switch (node.kind) {
    case 'song':
      return toConsolePath(`/songs/${slug}`);
    case 'event':
      return toConsolePath(`/atlas/globe?event=${encodeURIComponent(slug)}`);
    case 'artist':
      return toConsolePath(
        `/atlas/globe?artist=${encodeURIComponent(node.label)}`,
      );
    case 'place':
      return slug.startsWith('region-')
        ? null
        : toConsolePath(
            `/atlas/globe?place=${encodeURIComponent(`city:${slug}`)}`,
          );
    case 'pathway':
      return toConsolePath(`/atlas/globe?pathway=${encodeURIComponent(slug)}`);
    case 'teach_day': {
      const unit = slug.replace(/-day-\d+$/, '');
      return toConsolePath(
        `/office?unit=${encodeURIComponent(unit)}&day=${encodeURIComponent(slug)}`,
      );
    }
    default:
      return null;
  }
}

/**
 * The node kinds a content item defines — the ones whose items state
 * connections the console edits — with the content kind that stores them.
 * The rest are vocabularies, calendars and Teach stubs that code owns, and
 * have no item to open.
 */
const ITEM_KINDS: Readonly<Partial<Record<EntityKind, ContentKind>>> = {
  song: 'song',
  event: 'globe_event',
  artist: 'artist',
  release: 'release',
  studio: 'studio',
  label: 'label',
  place: 'globe_city',
  progression: 'chord_progression',
};

const itemKindOf = (itemId: string): ContentKind | undefined => {
  const kind = itemId.slice(0, itemId.indexOf(':'));
  return Object.prototype.hasOwnProperty.call(ITEM_KINDS, kind)
    ? ITEM_KINDS[kind as EntityKind]
    : undefined;
};

/**
 * Where the item that states a connection is: its row in the Table
 * (`artist:toto` → `/console/table/artists/toto`). A song's own globe event
 * is the song's row. Null for what code states (the influence arcs, the
 * Teach year, a vocabulary), which the connections table says instead of
 * linking.
 *
 * The row's panel edits the item there (`isEditedHere`): a record's fields,
 * a song's connections and year, an event's card and who it is about.
 */
export function editorFor(itemId: string): string | null {
  return itemKindOf(itemId) ? tableHrefForNode(itemId) : null;
}

/**
 * Can the console edit this item today, in its row's panel? True for every
 * kind a content item stores (`PANEL_EDIT_KINDS`, by node); false for what
 * code states.
 */
export function isEditedHere(itemId: string): boolean {
  const kind = itemKindOf(itemId);
  return kind !== undefined && PANEL_EDIT_KINDS.has(kind);
}
