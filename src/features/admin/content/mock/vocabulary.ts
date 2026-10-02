import { WORLD_INSTRUMENTS } from '@/components/ClassroomLayout/globe/data/instruments';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import {
  PROGRESSION_STYLE_TO_GENRE,
  SONG_TAG_TO_GENRE,
} from '@/content/graph/genres';
import type { EntityId, EntityKind } from '@/content/graph/types';
import { REPO_VOCABULARY } from '@/content/vocabulary/repo';
import type {
  GenreRecord,
  GenreTagLists,
  InstrumentRecord,
  SubgenreRecord,
  VocabularyKind,
  VocabularyRecords,
} from '@/content/vocabulary/schemas';
import type {
  CodeTable,
  ReferenceEdge,
  VocabularyContext,
  VocabularyProblem,
  VocabularyReference,
} from '@/content/vocabulary/validate';
import type { ValidationProblem } from '@/hooks/data/admin/useAdminContent';
import { REF_PATHS } from '@/scripts/apiContract/refPaths';
import { isVocabularyKind, type Body, type MockKind } from './mockKinds';
import { valuesAt } from './validation';

/**
 * What the content server needs to hold the vocabulary kinds (genres,
 * subgenres, session instruments) to the vocabulary's rules
 * (src/content/vocabulary/validate.ts), which read more than one record:
 *
 *  - the records it serves, as the rules take them (`vocabularyRecords`);
 *  - what the rules check against beyond them (`MockVocabularySources`):
 *    the tag lists, which are not items; the globe's Instruments of the
 *    World; the artist registry; the importer's aliases; and the code
 *    tables that map other vocabularies onto these, which name records a
 *    delete must not take away. The importer's are the repo server's to
 *    pass in (`repoVocabularySources` in
 *    src/scripts/repoContent/sources/vocabulary.ts): app code never imports
 *    the importer (appBoundary.test.ts), so the defaults here hold none;
 *  - every other item's fields that name a record (`bodyReferences`), for
 *    the same delete check. The graph's edges would say the same, but the
 *    server has no graph: it reads the fields REF_PATHS lists as naming a
 *    genre, subgenre or instrument, straight from the bodies it holds.
 *
 * Only repo mode serves these kinds, so only it calls any of this.
 */

/** What the vocabulary's rules read besides the records the server holds. */
export interface MockVocabularySources {
  /** `genreTagLists.json`: globe tags that name an instrument, name no music, or wait to be placed. */
  tagLists: GenreTagLists;
  context: VocabularyContext;
  /** The code tables that map other vocabularies onto these. */
  codeTables: readonly CodeTable[];
}

/** The app's code tables a genre or subgenre can be named in. */
export const CODE_TABLES: readonly CodeTable[] = [
  {
    name: 'SONG_TAG_TO_GENRE',
    names: ['genre', 'subgenre'],
    table: SONG_TAG_TO_GENRE,
  },
  {
    name: 'PROGRESSION_STYLE_TO_GENRE',
    names: ['genre', 'subgenre'],
    table: PROGRESSION_STYLE_TO_GENRE,
  },
];

/**
 * The repo's, as the app's modules have them: the tag lists file, the
 * globe's instruments, the artist registry and the app's code tables. The
 * importer's aliases are not among them; `repoVocabularySources` adds them.
 */
export const REPO_VOCABULARY_SOURCES: MockVocabularySources = {
  tagLists: REPO_VOCABULARY.tagLists,
  context: {
    worldInstrumentIds: WORLD_INSTRUMENTS.map((entry) => entry.id),
    artists: ARTIST_REGISTRY,
    aliasTags: [],
  },
  codeTables: CODE_TABLES,
};

/** An item as the server holds it, as far as these helpers read it. */
export interface VocabularyItem {
  kind: MockKind;
  slug: string;
  body: Body | null;
  deleted: boolean;
}

/**
 * The vocabulary the server holds, in its order (the files' order, new
 * records last), as the rules take it. `usable` leaves out a record whose
 * body does not fit its schema: the rules read every field, and such a
 * record already answers INVALID_BODY on its own.
 */
export function vocabularyRecords(
  items: Iterable<VocabularyItem>,
  tagLists: GenreTagLists,
  usable: (item: VocabularyItem) => boolean,
): VocabularyRecords {
  const genres: GenreRecord[] = [];
  const subgenres: SubgenreRecord[] = [];
  const instruments: InstrumentRecord[] = [];
  for (const item of items) {
    if (item.deleted || item.body === null || !isVocabularyKind(item.kind))
      continue;
    if (!usable(item)) continue;
    if (item.kind === 'genre') genres.push(item.body as GenreRecord);
    else if (item.kind === 'subgenre')
      subgenres.push(item.body as SubgenreRecord);
    else instruments.push(item.body as InstrumentRecord);
  }
  return { genres, subgenres, instruments, tagLists };
}

/**
 * A vocabulary rule's problem as the content API words one. `REFERENCED` is
 * a delete's answer, not a save's, so it never comes through here.
 */
export const asValidationProblem = (
  problem: VocabularyProblem,
): ValidationProblem => ({
  code: problem.code as Exclude<VocabularyProblem['code'], 'REFERENCED'>,
  slug: problem.slug,
  detail: problem.detail,
  severity: problem.severity,
  ...(problem.path !== undefined ? { path: problem.path } : {}),
  ...(problem.target !== undefined ? { target: problem.target } : {}),
});

/** A content kind's items as graph nodes: `<entity kind>:<slug>`. */
const ENTITY_OF: Partial<Record<MockKind, EntityKind>> = {
  song: 'song',
  globe_event: 'event',
  globe_city: 'place',
  chord_progression: 'progression',
  artist: 'artist',
  release: 'release',
  studio: 'studio',
  label: 'label',
};

/**
 * Fields whose values are another vocabulary's spelling, read through the
 * code table that maps it, as the graph reads them (deriveEdges.ts): a
 * song's genre tags and lesson links, a progression's styles.
 */
const READ_THROUGH: Readonly<Record<string, Readonly<Record<string, string>>>> =
  {
    'song:genreTags[]': SONG_TAG_TO_GENRE,
    'song:contentRefs[].genre': SONG_TAG_TO_GENRE,
    'chord_progression:styles[]': PROGRESSION_STYLE_TO_GENRE,
  };

/**
 * The REF_PATHS fields that name a genre, subgenre or instrument by id or
 * through a code table. A field resolved through the globe's tags
 * (`resolvedBy`) is left out: a tag resolves to a record only while the
 * record holds it, and a record's own tags are counted as its references
 * already (`references`).
 */
const NAMING_PATHS = REF_PATHS.flatMap((entry) => {
  const kinds = [entry.target, ...(entry.alsoTargets ?? [])].filter(
    (kind): kind is VocabularyKind => isVocabularyKind(kind),
  );
  return kinds.length && !entry.resolvedBy && !entry.legacy
    ? [{ kind: entry.kind as MockKind, path: entry.path, targets: kinds }]
    : [];
});

/**
 * Every field of the other items that names a vocabulary record, as the
 * graph's edges would: from the item (`song:superstition`) to the record,
 * `via` the field at its index (`credits[2].instrument`). A value names
 * every level its field allows; only the one being deleted is looked for.
 */
export function bodyReferences(
  items: Iterable<VocabularyItem & { pendingBody?: Body | null }>,
): ReferenceEdge[] {
  const edges: ReferenceEdge[] = [];
  for (const item of items) {
    const entity = ENTITY_OF[item.kind];
    if (item.deleted || !entity) continue;
    const from: EntityId = `${entity}:${item.slug}`;
    const bodies = [item.body, item.pendingBody].filter(
      (body): body is Body => !!body,
    );
    for (const entry of NAMING_PATHS) {
      if (entry.kind !== item.kind) continue;
      const through = READ_THROUGH[`${entry.kind}:${entry.path}`];
      for (const body of bodies) {
        for (const { path, value } of valuesAt(body, entry.path)) {
          if (typeof value !== 'string' || !value) continue;
          const id = through?.[value] ?? value;
          for (const target of entry.targets) {
            edges.push({
              from,
              kind: 'names',
              to: `${target}:${id}`,
              via: { item: from, path },
            });
          }
        }
      }
    }
  }
  return edges;
}

/** Graph node kinds back to the content kind that holds them. */
const CONTENT_OF: Readonly<Record<string, MockKind>> = {
  ...Object.fromEntries(
    Object.entries(ENTITY_OF).map(([kind, entity]) => [entity, kind]),
  ),
  genre: 'genre',
  subgenre: 'subgenre',
  instrument: 'instrument',
};

/** One row of a 409 `REFERENCED`'s `referrers`. */
export interface VocabularyReferrer {
  /** The content kind of the item that names the record; null for a code table. */
  kind: MockKind | null;
  /** That item's id; null for a code table. */
  id: string | null;
  /** Its slug, or the code table's export name. */
  slug: string;
  title: string;
  /** Where: the field with its index, or the code table's key. */
  path: string;
  /** Set on a code table: only a change to the code frees the record. */
  code?: true;
}

/**
 * `references`' answer as the content API's `referrers`: an item found by
 * its graph id, with its id and title, or a code table, marked `code`.
 */
export function referrersFrom(
  found: readonly VocabularyReference[],
  lookup: (
    kind: MockKind,
    slug: string,
  ) => { id: string; title: string } | undefined,
): VocabularyReferrer[] {
  return found.map((reference) => {
    const at = reference.by.indexOf(':');
    const kind = at > 0 ? CONTENT_OF[reference.by.slice(0, at)] : undefined;
    if (kind) {
      const slug = reference.by.slice(at + 1);
      const item = lookup(kind, slug);
      return {
        kind,
        id: item?.id ?? null,
        slug,
        title: item?.title ?? slug,
        path: reference.path,
      };
    }
    return {
      kind: null,
      id: null,
      slug: reference.by,
      title: `${reference.by} in code`,
      path: reference.path,
      code: true,
    };
  });
}
