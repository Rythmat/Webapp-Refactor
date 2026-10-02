import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { assembleGraph } from '@/content/graph/deriveGraph';
import * as genreTags from '@/content/graph/genreTags';
import * as genres from '@/content/graph/genres';
import * as instrumentGenres from '@/content/graph/instrumentGenres';
import { normalizeArtistName } from '@/content/graph/slugs';
import type { Edge, EntityId } from '@/content/graph/types';
import * as instruments from '@/curriculum/data/instruments';
import { VOCABULARY_FILES, type VocabularyRecords } from '../schemas';
import { parseRecords, parseTagLists } from '../serialize';
import { buildVocabularyTables, genreTagTables } from '../tables';

/**
 * The tables built from the JSON files are the tables the four modules
 * export. Arrays compare in order; lookup maps compare by their sorted
 * entries (and in order too, where the files keep it); the functions compare
 * over every input they meet.
 *
 * Written as the proof the files were complete before any module read them.
 * Now three of the modules re-export these very tables (`repo.ts`), and it
 * holds the fourth, `curriculum/data/instruments.ts`, which maps the
 * instrument file itself so the student app loads none of this. The proof
 * against the modules as they were in code is golden.test.ts.
 */

const read = (name: string) =>
  readFileSync(`src/content/vocabulary/${name}`, 'utf8');

const records: VocabularyRecords = {
  genres: parseRecords('genre', read(VOCABULARY_FILES.genre)),
  subgenres: parseRecords('subgenre', read(VOCABULARY_FILES.subgenre)),
  instruments: parseRecords('instrument', read(VOCABULARY_FILES.instrument)),
  tagLists: parseTagLists(read(VOCABULARY_FILES.tagLists)),
};
const tables = buildVocabularyTables(records);

const sorted = (table: Readonly<Record<string, unknown>>) =>
  Object.entries(table).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** Every string a globe genre field holds, and the tables' own tags. */
const everyTag = [
  ...new Set([
    ...Object.keys(genreTags.TAG_TO_GENRE),
    ...Object.keys(genreTags.TAG_TO_SUBGENRE),
    ...genreTags.INSTRUMENT_TAGS,
    ...genreTags.IGNORED_GENRE_TAGS,
    ...genreTags.UNPLACED_GENRE_TAGS,
    ...BUNDLED_MUSIC_HISTORY.flatMap((e) => e.genre ?? []),
    ...CITIES.flatMap((c) => c.genres ?? []),
  ]),
];

describe('genres.ts from the files', () => {
  it('GENRES, in order, key for key', () => {
    expect(tables.GENRES).toStrictEqual(genres.GENRES);
    expect(JSON.stringify(tables.GENRES)).toBe(JSON.stringify(genres.GENRES));
  });

  it('TAUGHT_GENRES, in order', () => {
    expect(tables.TAUGHT_GENRES).toStrictEqual(genres.TAUGHT_GENRES);
  });

  it('getGenre for every id and an unknown one', () => {
    for (const id of [...genres.GENRES.map((g) => g.id), 'nope', 'art-rock']) {
      expect(tables.getGenre(id)).toStrictEqual(genres.getGenre(id));
    }
  });
});

describe('genreTags.ts from the files', () => {
  it('SUBGENRE_PARENT, in order', () => {
    expect(sorted(tables.SUBGENRE_PARENT)).toEqual(
      sorted(genreTags.SUBGENRE_PARENT),
    );
    expect(Object.keys(tables.SUBGENRE_PARENT)).toEqual(
      Object.keys(genreTags.SUBGENRE_PARENT),
    );
  });

  it('TAG_TO_SUBGENRE, in order', () => {
    expect(sorted(tables.TAG_TO_SUBGENRE)).toEqual(
      sorted(genreTags.TAG_TO_SUBGENRE),
    );
    expect(Object.keys(tables.TAG_TO_SUBGENRE)).toEqual(
      Object.keys(genreTags.TAG_TO_SUBGENRE),
    );
  });

  it('TAG_TO_GENRE', () => {
    // Its keys now follow the genres' order, not the code's hand order; its
    // readers use it as a set or resolve every key (genreMap.ts, below).
    expect(sorted(tables.TAG_TO_GENRE)).toEqual(sorted(genreTags.TAG_TO_GENRE));
  });

  it('the three tag lists, in order', () => {
    expect(tables.INSTRUMENT_TAGS).toEqual(genreTags.INSTRUMENT_TAGS);
    expect(tables.IGNORED_GENRE_TAGS).toEqual(genreTags.IGNORED_GENRE_TAGS);
    expect(tables.UNPLACED_GENRE_TAGS).toEqual(genreTags.UNPLACED_GENRE_TAGS);
  });

  it(`resolveGenreTag over every tag the Atlas holds (${everyTag.length})`, () => {
    expect(everyTag.length).toBeGreaterThan(900);
    const inputs = [...everyTag, ...everyTag.map((t) => ` ${t} `), '', '  '];
    const differ = inputs.filter(
      (tag) =>
        JSON.stringify(tables.resolveGenreTag(tag)) !==
        JSON.stringify(genreTags.resolveGenreTag(tag)),
    );
    expect(differ).toEqual([]);
  });

  it('the importer’s genre index (genreMap.ts), which takes the first of two tags that fold together', () => {
    const index = (t: {
      TAG_TO_GENRE: Record<string, string>;
      TAG_TO_SUBGENRE: Record<string, string>;
      resolveGenreTag: typeof genreTags.resolveGenreTag;
    }) => {
      const out = new Map<string, unknown>();
      for (const tag of [
        ...Object.keys(t.TAG_TO_GENRE),
        ...Object.keys(t.TAG_TO_SUBGENRE),
      ]) {
        const key = normalizeArtistName(tag)
          .replace(/ music$/, '')
          .trim();
        const resolved = t.resolveGenreTag(tag);
        if (resolved && !out.has(key)) out.set(key, resolved);
      }
      return [...out].sort(([a], [b]) => (a < b ? -1 : 1));
    };
    expect(index(tables)).toEqual(index(genreTags));
  });
});

describe('instrumentGenres.ts from the files', () => {
  it('INSTRUMENT_GENRES, in order: 48 instruments, 105 rows', () => {
    expect(tables.INSTRUMENT_GENRES).toStrictEqual(
      instrumentGenres.INSTRUMENT_GENRES,
    );
    expect(Object.keys(tables.INSTRUMENT_GENRES)).toEqual(
      Object.keys(instrumentGenres.INSTRUMENT_GENRES),
    );
    expect(Object.keys(tables.INSTRUMENT_GENRES)).toHaveLength(48);
    expect(Object.values(tables.INSTRUMENT_GENRES).flat()).toHaveLength(105);
  });
});

describe('curriculum/data/instruments.ts from the files', () => {
  it('SESSION_INSTRUMENTS, in order, key for key', () => {
    expect(tables.SESSION_INSTRUMENTS).toStrictEqual(
      instruments.SESSION_INSTRUMENTS,
    );
    expect(JSON.stringify(tables.SESSION_INSTRUMENTS)).toBe(
      JSON.stringify(instruments.SESSION_INSTRUMENTS),
    );
  });

  it('INSTRUMENT_IDS, and getInstrument for every id and an unknown one', () => {
    expect(tables.INSTRUMENT_IDS).toEqual(instruments.INSTRUMENT_IDS);
    for (const id of [...instruments.INSTRUMENT_IDS, 'nope', 'guitar']) {
      expect(tables.getInstrument(id)).toStrictEqual(
        instruments.getInstrument(id),
      );
    }
  });
});

describe('labels', () => {
  it('names each node as the graph does today', () => {
    // One edge to every vocabulary node, so the graph labels each.
    const someone: EntityId = 'artist:someone';
    const edge = (kind: Edge['kind'], from: EntityId, to: EntityId): Edge => ({
      from,
      kind,
      to,
      via: { item: from, path: 'test' },
    });
    const edges: Edge[] = [
      ...records.genres.map((g) => edge('in_genre', someone, `genre:${g.id}`)),
      ...records.subgenres.map((s) =>
        edge('in_genre', `subgenre:${s.id}`, `genre:${s.parent}`),
      ),
      ...records.instruments.map((i) =>
        edge('plays_instrument', someone, `instrument:${i.id}`),
      ),
    ];
    const graph = assembleGraph([], edges);
    const label = (id: EntityId) => graph.nodes.get(id)?.label;
    const wrong = [
      ...records.genres.map((g) => [`genre:${g.id}`, g.name] as const),
      ...records.subgenres.map((s) => [`subgenre:${s.id}`, s.name] as const),
      ...records.instruments.map(
        (i) => [`instrument:${i.id}`, i.name] as const,
      ),
    ]
      .filter(([id, name]) => label(id as EntityId) !== name)
      .map(([id, name]) => `${id}: '${name}' vs '${label(id as EntityId)}'`);
    expect(wrong).toEqual([]);
  });
});

describe('placing a tag', () => {
  it('takes it off the unplaced list and resolves it, with only the record changed', () => {
    const placed = genreTagTables(
      records.genres,
      records.subgenres.map((s) =>
        s.id === 'art-rock' ? { ...s, tags: [...s.tags, 'Trip-Hop'] } : s,
      ),
      records.tagLists,
    );
    expect(records.tagLists.unplacedTags).toContain('Trip-Hop');
    expect(placed.UNPLACED_GENRE_TAGS).not.toContain('Trip-Hop');
    expect(placed.resolveGenreTag('Trip-Hop')).toEqual({
      genre: 'rock',
      subgenre: 'art-rock',
    });
  });
});
