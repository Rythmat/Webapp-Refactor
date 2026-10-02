import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { GENRES, getGenre } from '@/content/graph/genres';
import type { EntityId, EntityKind } from '@/content/graph/types';
import { getAllSongs } from '@/content/songStore';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { EntityEntry } from './rankEntities';

/**
 * The kinds a picker can point at, and where each one's records live.
 *
 * Artists, places and songs are in code today and in the content API as it
 * grows; studios, labels and records exist only in the API (there is no code
 * registry of them). Instruments, genres, subgenres and eras are vocabularies:
 * code only, read-only, never created from a picker.
 */

export type PickerKind = Extract<
  EntityKind,
  | 'artist'
  | 'place'
  | 'studio'
  | 'label'
  | 'release'
  | 'song'
  | 'instrument'
  | 'genre'
  | 'subgenre'
  | 'era'
>;

/** The content kind that stores a picker kind, when the API stores it. */
export const CONTENT_KIND_OF: Partial<Record<PickerKind, ContentKind>> = {
  artist: 'artist',
  place: 'globe_city',
  studio: 'studio',
  label: 'label',
  release: 'release',
  song: 'song',
};

/** Where a record's display name is in its body. */
export const NAME_FIELD: Partial<Record<PickerKind, string>> = {
  artist: 'name',
  place: 'name',
  studio: 'name',
  label: 'name',
  release: 'title',
  song: 'title',
};

/**
 * Kinds with no code registry: the console knows only the records the
 * server lists. Creating one of these without the server's create-only save
 * (`features.create`) could overwrite a record the console never saw.
 */
export const API_ONLY_KINDS: ReadonlySet<PickerKind> = new Set<PickerKind>([
  'studio',
  'label',
  'release',
]);

/** Kinds a picker may create (vocabularies are code). */
export const isCreatable = (kind: PickerKind): boolean =>
  kind in CONTENT_KIND_OF && kind !== 'song';

const entry = (
  kind: PickerKind,
  slug: string,
  name: string,
  extra: Partial<EntityEntry> = {},
): EntityEntry => ({
  id: `${kind}:${slug}` as EntityId,
  kind,
  slug,
  name,
  source: 'repo',
  ...extra,
});

const humanize = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** What the repo itself holds of a kind; empty for API-only kinds. */
export function repoEntries(kind: PickerKind): EntityEntry[] {
  switch (kind) {
    case 'artist':
      return ARTIST_REGISTRY.map((a) =>
        entry('artist', a.slug, a.name, { aliases: a.aliases }),
      );
    case 'place':
      return CITIES.map((c) =>
        entry('place', c.id, c.name, {
          hint: [c.subdivision, c.country].filter(Boolean).join(', '),
        }),
      );
    case 'song':
      return getAllSongs().map((s) =>
        entry('song', s.id, s.title, { hint: s.artist }),
      );
    case 'instrument':
      return SESSION_INSTRUMENTS.map((i) => entry('instrument', i.id, i.name));
    case 'genre':
      return GENRES.map((g) => entry('genre', g.id, g.name));
    case 'subgenre':
      // Its genre by the genre's own name ("R&B", not "Rnb").
      return Object.entries(SUBGENRE_PARENT).map(([slug, parent]) =>
        entry('subgenre', slug, humanize(slug), {
          hint: getGenre(parent)?.name ?? humanize(parent),
        }),
      );
    case 'era':
      return MUSICAL_ERAS.map((e) => entry('era', e.id, e.label));
    default:
      return [];
  }
}
