import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildGraph,
  type GraphSnapshot,
  placeAndGenreNames,
} from '@/content/graph/deriveGraph';
import * as genreTags from '@/content/graph/genreTags';
import * as genres from '@/content/graph/genres';
import * as instrumentGenres from '@/content/graph/instrumentGenres';
import type { EntityId } from '@/content/graph/types';
import * as instruments from '@/curriculum/data/instruments';
import { AdminVocabularyPage } from '@/features/admin/content/AdminVocabularyPage';
import { repoEntries } from '@/features/admin/content/entities/entityKinds';
import { loadRepoSnapshot } from '@/features/admin/content/graph/repoSnapshot';
import { buildTableModel } from '@/features/admin/table/model/buildTableModel';
import { TABLES } from '@/features/admin/table/model/categories';
import type { TableModel } from '@/features/admin/table/model/types';
import {
  ALIASES as GENRE_ALIASES,
  mapGenre,
} from '@/scripts/enrichment/import/genreMap';
import {
  ALIASES as INSTRUMENT_ALIASES,
  mapInstrument,
} from '@/scripts/enrichment/import/instrumentMap';

/**
 * Everything the four vocabulary modules decide, as their readers see it: the
 * characterization the move from code to data is held to (design section 3,
 * "Proving equivalence"). It was captured from the code modules before they
 * read the JSON (30 Sep 2026), and `golden.test.ts` holds the modules to it.
 *
 * Each section is one reader's view:
 *
 *  - `exports`: every export of the four modules. Arrays in order; the maps
 *    in order too, except `TAG_TO_GENRE`, whose readers use it as a set or
 *    resolve every key (its keys now follow the genres' order); the lookup
 *    functions over every id they hold and a few they do not.
 *  - `mapGenre`, `mapInstrument`: the importer's two lookups over every tag,
 *    name and alias, as given, lowercased and with " music" after.
 *    `mapGenre` takes the first of two tags that fold together, so this
 *    compares what it answers, not the order of the maps behind it.
 *  - `resolveGenreTag`: every string a globe genre field or list holds, as
 *    given and padded, and blanks.
 *  - `placeAndGenreNames`: the names the event matcher refuses on a tag
 *    alone, as sets (sorted).
 *  - `pickers`: the instrument, genre and subgenre picker entries.
 *  - `vocabularyPage`: the Vocabulary page as it first renders.
 *  - `tables`: the Genres and Instruments tables' rows, on the repo graph.
 *  - `graph`: every genre, subgenre and instrument node of the repo graph,
 *    and every edge (and refused edge) touching one, in the graph's order.
 *
 * `tables` and `graph` read the repo's content, and `mapGenre`,
 * `resolveGenreTag` and `placeAndGenreNames` take the globe's event and city
 * strings as input, so those move when an artist's genres, an event's tags
 * or a city do. A failure only there, with `exports`, `pickers` and
 * `vocabularyPage` unchanged, is a content change, not a vocabulary one.
 */

export type VocabularyGolden = Record<string, unknown>;

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const sortedUnique = (values: Iterable<string>) =>
  [...new Set(values)].sort(byText);

const entries = (table: Readonly<Record<string, unknown>>) =>
  Object.entries(table);

const sortedEntries = (table: Readonly<Record<string, unknown>>) =>
  Object.entries(table).sort(([a], [b]) => byText(a, b));

const VOCABULARY_KINDS = new Set(['genre', 'subgenre', 'instrument']);
const isVocabulary = (id: EntityId | undefined) =>
  id !== undefined && VOCABULARY_KINDS.has(id.slice(0, id.indexOf(':')));

/** Every string a globe genre field or tag list holds, and the tables' tags. */
function everyTag(snapshot: GraphSnapshot): string[] {
  return sortedUnique([
    ...Object.keys(genreTags.TAG_TO_GENRE),
    ...Object.keys(genreTags.TAG_TO_SUBGENRE),
    ...genreTags.INSTRUMENT_TAGS,
    ...genreTags.IGNORED_GENRE_TAGS,
    ...genreTags.UNPLACED_GENRE_TAGS,
    ...(snapshot.events ?? []).flatMap((e) => e.genre ?? []),
    ...(snapshot.places ?? []).flatMap((c) => c.genres ?? []),
  ]);
}

function exportsSection() {
  const genreIds = [
    ...genres.GENRES.map((g) => g.id),
    ...Object.keys(genreTags.SUBGENRE_PARENT),
    'nope',
    'constructor',
  ];
  const instrumentIds = [
    ...instruments.INSTRUMENT_IDS,
    'guitar',
    'nope',
    'constructor',
  ];
  return {
    names: {
      genres: Object.keys(genres).sort(byText),
      genreTags: Object.keys(genreTags).sort(byText),
      instrumentGenres: Object.keys(instrumentGenres).sort(byText),
      instruments: Object.keys(instruments).sort(byText),
    },
    GENRES: genres.GENRES,
    TAUGHT_GENRES: genres.TAUGHT_GENRES,
    getGenre: genreIds.map((id) => [id, genres.getGenre(id) ?? null]),
    SONG_TAG_TO_GENRE: entries(genres.SONG_TAG_TO_GENRE),
    PROGRESSION_STYLE_TO_GENRE: entries(genres.PROGRESSION_STYLE_TO_GENRE),
    SUBGENRE_PARENT: entries(genreTags.SUBGENRE_PARENT),
    TAG_TO_SUBGENRE: entries(genreTags.TAG_TO_SUBGENRE),
    TAG_TO_GENRE: sortedEntries(genreTags.TAG_TO_GENRE),
    INSTRUMENT_TAGS: genreTags.INSTRUMENT_TAGS,
    IGNORED_GENRE_TAGS: genreTags.IGNORED_GENRE_TAGS,
    UNPLACED_GENRE_TAGS: genreTags.UNPLACED_GENRE_TAGS,
    INSTRUMENT_GENRES: entries(instrumentGenres.INSTRUMENT_GENRES),
    TYPICAL_IN_PATH: instrumentGenres.TYPICAL_IN_PATH,
    INSTRUMENT_SECTIONS: instruments.INSTRUMENT_SECTIONS,
    SESSION_INSTRUMENTS: instruments.SESSION_INSTRUMENTS,
    INSTRUMENT_IDS: instruments.INSTRUMENT_IDS,
    getInstrument: instrumentIds.map((id) => [
      id,
      instruments.getInstrument(id) ?? null,
    ]),
  };
}

/** Each input as given, lowercased, and with " music" after. */
const spellings = (values: Iterable<string>) =>
  sortedUnique([...values].flatMap((v) => [v, v.toLowerCase(), `${v} music`]));

function mapGenreSection(tags: readonly string[]) {
  const humanize = (slug: string) =>
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  const inputs = spellings([
    ...tags,
    ...genres.GENRES.flatMap((g) => [g.id, g.name]),
    ...Object.keys(genreTags.SUBGENRE_PARENT).flatMap((id) => [
      id,
      humanize(id),
    ]),
    ...Object.entries(GENRE_ALIASES).flat(),
    'doo-wop',
    'world music',
  ]);
  return inputs.map((name) => [name, mapGenre(name)]);
}

function mapInstrumentSection() {
  const inputs = spellings([
    ...instruments.SESSION_INSTRUMENTS.flatMap((i) => [i.id, i.name]),
    ...Object.entries(INSTRUMENT_ALIASES).flat(),
    'guitar',
    'saxophone',
    'keyboard',
  ]);
  return inputs.map((name) => [name, mapInstrument(name)]);
}

function resolveSection(tags: readonly string[]) {
  const inputs = [...tags, ...tags.map((t) => ` ${t} `), '', '  '];
  return inputs.map((tag) => [tag, genreTags.resolveGenreTag(tag)]);
}

function tableSection(model: TableModel) {
  return {
    rows: model.rows.map((row) => ({
      key: row.key,
      node: row.node,
      kind: row.kind,
      label: row.label,
      sublabel: row.sublabel,
      status: row.status,
      editState: row.editState,
      unverified: row.unverified,
      body: row.body,
      itemId: row.itemId,
      cells: row.cells,
      flags: [...row.flags],
      haystack: row.haystack,
      suggestions: row.suggestions,
      degree: row.degree,
    })),
    byKey: [...model.byKey],
    coverage: model.coverage,
  };
}

/** Captures every section from the modules as they are loaded now. */
export async function captureVocabularyGolden(): Promise<VocabularyGolden> {
  const snapshot = await loadRepoSnapshot();
  const graph = buildGraph(snapshot);
  const tags = everyTag(snapshot);
  const names = placeAndGenreNames(snapshot);
  const input = { graph, snapshot };
  const touches = (e: { from: EntityId; to: EntityId; on?: EntityId }) =>
    isVocabulary(e.from) || isVocabulary(e.to) || isVocabulary(e.on);

  return {
    exports: exportsSection(),
    mapGenre: mapGenreSection(tags),
    mapInstrument: mapInstrumentSection(),
    resolveGenreTag: resolveSection(tags),
    placeAndGenreNames: {
      placeNames: sortedUnique(names.placeNames),
      genreNames: sortedUnique(names.genreNames),
    },
    pickers: {
      instrument: repoEntries('instrument'),
      genre: repoEntries('genre'),
      subgenre: repoEntries('subgenre'),
    },
    vocabularyPage: renderToStaticMarkup(createElement(AdminVocabularyPage)),
    tables: {
      genres: tableSection(buildTableModel(input, TABLES.genres)),
      instruments: tableSection(buildTableModel(input, TABLES.instruments)),
    },
    graph: {
      nodes: [...graph.nodes.values()]
        .filter((n) => isVocabulary(n.id))
        .sort((a, b) => byText(a.id, b.id)),
      edges: graph.edges.filter(touches),
      violations: graph.violations.filter((v) => touches(v.edge)),
    },
  };
}

/** JSON for the golden: Maps as their entries, Sets as their members. */
export function goldenJson(value: unknown, indent?: number): string {
  return JSON.stringify(
    value,
    (_key, v: unknown) =>
      v instanceof Map ? [...v] : v instanceof Set ? [...v] : v,
    indent,
  );
}

/** One sha256 per section. */
export function goldenDigests(golden: VocabularyGolden) {
  return Object.fromEntries(
    Object.entries(golden).map(([section, value]) => [
      section,
      createHash('sha256').update(goldenJson(value)).digest('hex'),
    ]),
  );
}
