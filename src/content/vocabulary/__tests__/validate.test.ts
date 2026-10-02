import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLD_INSTRUMENTS } from '@/components/ClassroomLayout/globe/data/instruments';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import type { Edge, GraphEdge } from '@/content/graph/types';
import type { VocabularyRecords } from '../schemas';
import { parseRecords, parseTagLists } from '../serialize';
import {
  applyWrite,
  type CodeTable,
  type ReferenceEdge,
  references,
  validateDelete,
  validateVocabulary,
  type VocabularyContext,
  type VocabularyProblem,
  validateWrite,
} from '../validate';

/**
 * One case per rule, over a small vocabulary that breaks none of them, then
 * the repo's own files, which break none either.
 */

const vocabulary = (): VocabularyRecords => ({
  genres: [
    { id: 'rock', name: 'Rock', taught: true, tags: ['Rock'] },
    { id: 'funk', name: 'Funk', taught: true, tags: ['Funk'] },
    {
      id: 'classical',
      name: 'Classical',
      taught: false,
      note: 'Not taught yet.',
      tags: [],
    },
  ],
  subgenres: [
    { id: 'art-rock', name: 'Art Rock', parent: 'rock', tags: ['Art Rock'] },
    {
      id: 'rock-and-roll',
      name: 'Rock And Roll',
      parent: 'rock',
      tags: ['Rock and Roll'],
    },
    { id: 'gospel', name: 'Gospel', parent: 'funk', tags: ['Gospel'] },
    { id: 'baroque', name: 'Baroque', parent: 'classical', tags: [] },
  ],
  instruments: [
    {
      id: 'piano',
      name: 'Piano',
      section: 'keys',
      typicalIn: ['classical', 'gospel'],
    },
    {
      id: 'sitar',
      name: 'Sitar',
      section: 'guitar',
      worldInstrumentId: 'sitar',
      typicalIn: [],
    },
  ],
  tagLists: {
    instrumentTags: ['Marimba'],
    ignoredTags: ['World Music'],
    unplacedTags: ['Trip-Hop'],
  },
});

const context: VocabularyContext = {
  worldInstrumentIds: ['sitar', 'conga'],
  artists: [{ slug: 'chicago', name: 'Chicago' }],
  aliasTags: ['Rock and Roll', 'R&B'],
};

const codes = (problems: VocabularyProblem[]) =>
  problems.map((p) =>
    `${p.severity} ${p.code} ${p.kind}:${p.slug} ${p.path ?? ''}`.trim(),
  );

describe('the fixture', () => {
  it('breaks no rule', () => {
    expect(validateVocabulary(vocabulary(), context)).toEqual([]);
  });
});

describe('IMMUTABLE_ID', () => {
  it('refuses a changed id, and says nothing else about the record', () => {
    const before = vocabulary().subgenres[0];
    const problems = validateWrite(
      { kind: 'subgenre', before, after: { ...before, id: 'arty-rock' } },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual([
      'error IMMUTABLE_ID subgenre:art-rock id',
    ]);
  });

  it('refuses a change to taught, and a new genre that is taught', () => {
    const rock = vocabulary().genres[0];
    expect(
      codes(
        validateWrite(
          { kind: 'genre', before: rock, after: { ...rock, taught: false } },
          vocabulary(),
          context,
        ),
      ),
    ).toEqual(['error IMMUTABLE_ID genre:rock taught']);
    expect(
      codes(
        validateWrite(
          {
            kind: 'genre',
            after: { id: 'soul', name: 'Soul', taught: true, tags: [] },
          },
          vocabulary(),
          context,
        ),
      ),
    ).toEqual(['error IMMUTABLE_ID genre:soul taught']);
  });

  it('lets a rename through: the name is not the id', () => {
    const rock = vocabulary().genres[0];
    expect(
      validateWrite(
        { kind: 'genre', before: rock, after: { ...rock, name: 'Rock Music' } },
        vocabulary(),
        context,
      ),
    ).toEqual([]);
  });
});

describe('DUPLICATE_ID', () => {
  it('refuses a new record with a taken id', () => {
    const problems = validateWrite(
      {
        kind: 'instrument',
        after: { id: 'piano', name: 'Piano', section: 'keys', typicalIn: [] },
      },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual(['error DUPLICATE_ID instrument:piano id']);
  });

  it('refuses a subgenre with a genre’s id', () => {
    const problems = validateWrite(
      {
        kind: 'subgenre',
        after: { id: 'funk', name: 'Funk', parent: 'rock', tags: [] },
      },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual(['error DUPLICATE_ID subgenre:funk id']);
    expect(problems[0].target).toBe('genre:funk');
  });
});

describe('INVALID_REFERENCE', () => {
  it('refuses a parent that is not a genre', () => {
    const records = vocabulary();
    const problems = validateVocabulary(
      {
        ...records,
        subgenres: [
          ...records.subgenres,
          // A subgenre is not a genre, so it cannot be a parent.
          { id: 'glam', name: 'Glam', parent: 'art-rock', tags: [] },
        ],
      },
      context,
    );
    expect(codes(problems)).toEqual([
      'error INVALID_REFERENCE subgenre:glam parent',
    ]);
  });

  it('refuses a typicalIn naming neither level', () => {
    const records = vocabulary();
    const problems = validateVocabulary(
      {
        ...records,
        instruments: [
          { ...records.instruments[0], typicalIn: ['classical', 'nope'] },
        ],
      },
      context,
    );
    expect(codes(problems)).toEqual([
      'error INVALID_REFERENCE instrument:piano typicalIn[1]',
    ]);
  });
});

describe('DUPLICATE_TAG', () => {
  const withTags = (tags: string[]) => {
    const before = vocabulary().subgenres[1];
    return validateWrite(
      { kind: 'subgenre', before, after: { ...before, tags } },
      vocabulary(),
      context,
    );
  };

  it('refuses a tag another record has', () => {
    const problems = withTags(['Rock and Roll', 'Art Rock']);
    expect(codes(problems)).toEqual([
      'error DUPLICATE_TAG subgenre:rock-and-roll tags[1]',
    ]);
    expect(problems[0].target).toBe('subgenre:art-rock');
  });

  it('refuses a tag listed twice on one record', () => {
    expect(codes(withTags(['Rock and Roll', 'Rock and Roll']))).toEqual([
      'error DUPLICATE_TAG subgenre:rock-and-roll tags[1]',
    ]);
  });

  it('refuses a tag on the ignored or instrument lists', () => {
    expect(
      codes(withTags(['Rock and Roll', 'World Music', 'Marimba'])),
    ).toEqual([
      'error DUPLICATE_TAG subgenre:rock-and-roll tags[1]',
      'error DUPLICATE_TAG subgenre:rock-and-roll tags[2]',
    ]);
  });

  it('lets an unplaced tag through: adding it is placing it', () => {
    expect(withTags(['Rock and Roll', 'Trip-Hop'])).toEqual([]);
  });
});

describe('UNKNOWN_CODE_ID', () => {
  it('refuses a world instrument the globe does not have', () => {
    const sitar = vocabulary().instruments[1];
    const problems = validateWrite(
      {
        kind: 'instrument',
        before: sitar,
        after: { ...sitar, worldInstrumentId: 'sitaar' },
      },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual([
      'error UNKNOWN_CODE_ID instrument:sitar worldInstrumentId',
    ]);
  });
});

describe('NAME_COLLISION', () => {
  it('warns when a name, id or tag reads as a registered artist, once per artist', () => {
    const problems = validateWrite(
      {
        kind: 'subgenre',
        after: {
          id: 'chicago',
          name: 'Chicago',
          parent: 'rock',
          tags: ['Chicago'],
        },
      },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual([
      'warning NAME_COLLISION subgenre:chicago id',
    ]);
    expect(problems[0].target).toBe('artist:chicago');
  });
});

describe('TAG_FOLDS_TOGETHER', () => {
  it('warns when two records’ tags read as one name to the importer', () => {
    const problems = validateWrite(
      {
        kind: 'subgenre',
        after: {
          id: 'rock-roll',
          name: 'Rock Roll',
          parent: 'rock',
          tags: ['Rock & Roll'],
        },
      },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual([
      'warning TAG_FOLDS_TOGETHER subgenre:rock-roll tags[0]',
    ]);
    expect(problems[0].target).toBe('subgenre:rock-and-roll');
  });

  it('says nothing of two spellings on one record', () => {
    const rock = vocabulary().genres[0];
    expect(
      validateWrite(
        {
          kind: 'genre',
          before: rock,
          after: { ...rock, tags: ['Rock', 'Rock Music'] },
        },
        vocabulary(),
        context,
      ),
    ).toEqual([]);
  });
});

describe('ALIAS_TAG_REMOVED', () => {
  it('warns when a tag the importer’s aliases lead to is taken off', () => {
    const before = vocabulary().subgenres[1];
    const problems = validateWrite(
      { kind: 'subgenre', before, after: { ...before, tags: [] } },
      vocabulary(),
      context,
    );
    expect(codes(problems)).toEqual([
      'warning ALIAS_TAG_REMOVED subgenre:rock-and-roll tags',
    ]);
  });
});

describe('validateWrite', () => {
  it('never blames a save for a problem the files already had', () => {
    const records = vocabulary();
    const broken: VocabularyRecords = {
      ...records,
      // Already wrong before this save: a tag on two records.
      subgenres: [
        ...records.subgenres,
        { id: 'glam', name: 'Glam', parent: 'rock', tags: ['Art Rock'] },
      ],
    };
    expect(codes(validateVocabulary(broken, context))).toEqual([
      'error DUPLICATE_TAG subgenre:glam tags[0]',
    ]);
    const funk = records.genres[1];
    expect(
      validateWrite(
        {
          kind: 'genre',
          before: funk,
          after: { ...funk, name: 'Funk & Soul' },
        },
        broken,
        context,
      ),
    ).toEqual([]);
  });
});

describe('applyWrite', () => {
  it('replaces an updated record where it stands and appends a new one', () => {
    const records = vocabulary();
    const rock = records.genres[0];
    const updated = applyWrite(records, {
      kind: 'genre',
      before: rock,
      after: { ...rock, name: 'Rock Music' },
    });
    expect(updated.genres.map((g) => g.name)).toEqual([
      'Rock Music',
      'Funk',
      'Classical',
    ]);
    const created = applyWrite(records, {
      kind: 'genre',
      after: { id: 'soul', name: 'Soul', taught: false, tags: [] },
    });
    expect(created.genres.map((g) => g.id)).toEqual([
      'rock',
      'funk',
      'classical',
      'soul',
    ]);
    // The input is left alone.
    expect(records.genres).toHaveLength(3);
  });
});

describe('REFERENCED', () => {
  const codeTables: CodeTable[] = [
    {
      name: 'SONG_TAG_TO_GENRE',
      names: ['genre', 'subgenre'],
      table: { rock: 'rock', funk: 'funk' },
    },
    {
      name: 'PROGRESSION_STYLE_TO_GENRE',
      names: ['genre', 'subgenre'],
      table: { gospel: 'gospel', 'r&b': 'rnb' },
    },
    {
      name: 'instrumentMap ALIASES',
      names: ['instrument'],
      table: { 'grand piano': 'piano' },
    },
  ];
  // Typed as the graph types them, so both shapes are held to ReferenceEdge.
  const derived: Edge[] = [
    // A song filed under Gospel: one `via`.
    {
      from: 'song:oh-happy-day',
      kind: 'in_genre',
      to: 'subgenre:gospel',
      via: { item: 'song:oh-happy-day', path: 'subgenreIds[]' },
    },
    // What the vocabulary files state: read from the records instead.
    {
      from: 'instrument:piano',
      kind: 'typical_in',
      to: 'subgenre:gospel',
      via: { item: 'instrument:piano', path: 'typical_in' },
    },
    {
      from: 'subgenre:gospel',
      kind: 'in_genre',
      to: 'genre:funk',
      via: { item: 'subgenre:gospel', path: 'parent' },
    },
  ];
  // A merged edge from the built graph: `via` is a list.
  const merged: GraphEdge[] = [
    {
      from: 'artist:ravi-shankar',
      kind: 'plays_instrument',
      to: 'instrument:sitar',
      via: [
        { item: 'song:norwegian-wood', path: 'credits[].instrument' },
        { item: 'artist:ravi-shankar', path: 'instrumentIds[]' },
      ],
    },
  ];
  const edges: ReferenceEdge[] = [...derived, ...merged];
  const sources = () => ({ records: vocabulary(), edges, codeTables });

  it('lists a genre’s subgenres, tags and code tables', () => {
    expect(references('genre', 'funk', sources())).toEqual([
      { by: 'genre:funk', path: 'tags[0]' },
      { by: 'subgenre:gospel', path: 'parent' },
      { by: 'SONG_TAG_TO_GENRE', path: 'funk' },
    ]);
  });

  it('lists a subgenre’s typicalIn, code tables and graph edges', () => {
    expect(references('subgenre', 'gospel', sources())).toEqual([
      { by: 'subgenre:gospel', path: 'tags[0]' },
      { by: 'instrument:piano', path: 'typicalIn[1]' },
      { by: 'PROGRESSION_STYLE_TO_GENRE', path: 'gospel' },
      { by: 'song:oh-happy-day', path: 'subgenreIds[]' },
    ]);
  });

  it('lists an instrument’s credits, instrumentIds and importer aliases', () => {
    expect(references('instrument', 'sitar', sources())).toEqual([
      { by: 'song:norwegian-wood', path: 'credits[].instrument' },
      { by: 'artist:ravi-shankar', path: 'instrumentIds[]' },
    ]);
    expect(references('instrument', 'piano', sources())).toEqual([
      { by: 'instrumentMap ALIASES', path: 'grand piano' },
    ]);
  });

  it('refuses a delete while anything names the record', () => {
    const problems = validateDelete('genre', 'classical', sources());
    expect(codes(problems)).toEqual(['error REFERENCED genre:classical']);
    expect(problems[0].detail).toContain('subgenre:baroque (parent)');
    expect(problems[0].detail).toContain('instrument:piano (typicalIn[0])');
  });

  it('lets a delete through when nothing does', () => {
    expect(validateDelete('subgenre', 'baroque', sources())).toEqual([]);
  });
});

describe('the repo’s own files', () => {
  const read = (name: string) =>
    readFileSync(`src/content/vocabulary/${name}`, 'utf8');
  const records: VocabularyRecords = {
    genres: parseRecords('genre', read('genres.json')),
    subgenres: parseRecords('subgenre', read('subgenres.json')),
    instruments: parseRecords('instrument', read('instruments.json')),
    tagLists: parseTagLists(read('genreTagLists.json')),
  };
  const problems = validateVocabulary(records, {
    worldInstrumentIds: WORLD_INSTRUMENTS.map((w) => w.id),
    artists: ARTIST_REGISTRY,
    aliasTags: [],
  });

  it('break no rule', () => {
    expect(codes(problems.filter((p) => p.severity === 'error'))).toEqual([]);
  });

  it('warn only of tags the importer reads as one, Rock and Roll among them', () => {
    expect(new Set(problems.map((p) => p.code))).toEqual(
      new Set(['TAG_FOLDS_TOGETHER']),
    );
    expect(
      problems.some(
        (p) => p.slug === 'rock-roll' && p.target === 'subgenre:rock-and-roll',
      ),
    ).toBe(true);
  });
});
