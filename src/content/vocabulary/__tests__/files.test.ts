import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FILE_SCHEMAS,
  genreTagListsFileSchema,
  RECORD_KEYS,
  RECORD_SCHEMAS,
  VOCABULARY_FILES,
  VOCABULARY_KINDS,
} from '../schemas';
import {
  listsJson,
  parseRecords,
  parseTagLists,
  rowsJson,
  serializeRecords,
  serializeTagLists,
} from '../serialize';

/**
 * The vocabulary files are what the console writes and git diffs, so their
 * bytes are part of the contract: each parses under its schema, and reading
 * one and writing it back gives the file unchanged.
 */

const read = (name: string) =>
  readFileSync(`src/content/vocabulary/${name}`, 'utf8');

describe('the vocabulary files', () => {
  it.each(VOCABULARY_KINDS)('%s file parses under its schema', (kind) => {
    const result = FILE_SCHEMAS[kind].safeParse(
      JSON.parse(read(VOCABULARY_FILES[kind])),
    );
    expect(result.success ? [] : result.error.issues.slice(0, 5)).toEqual([]);
  });

  it('tag lists file parses under its schema', () => {
    const result = genreTagListsFileSchema.safeParse(
      JSON.parse(read(VOCABULARY_FILES.tagLists)),
    );
    expect(result.success ? [] : result.error.issues.slice(0, 5)).toEqual([]);
  });

  it.each(VOCABULARY_KINDS)(
    '%s file reads and writes back byte for byte',
    (kind) => {
      const text = read(VOCABULARY_FILES[kind]);
      expect(serializeRecords(kind, parseRecords(kind, text))).toBe(text);
    },
  );

  it('tag lists file reads and writes back byte for byte', () => {
    const text = read(VOCABULARY_FILES.tagLists);
    expect(serializeTagLists(parseTagLists(text))).toBe(text);
  });

  it('writes one record per line', () => {
    for (const kind of VOCABULARY_KINDS) {
      const text = read(VOCABULARY_FILES[kind]);
      const records = parseRecords(kind, text);
      // The header and `"records": [` (4 lines), one line per record, then
      // the closing two.
      expect(text.split('\n').length - 1).toBe(records.length + 6);
    }
  });
});

describe('the writer', () => {
  it('has the importer artifacts’ shape: a header, then one row per line', () => {
    expect(rowsJson({ a: 1, b: 'x' }, 'rows', [{ x: 1 }, { y: [2] }])).toBe(
      '{\n  "a": 1,\n  "b": "x",\n  "rows": [\n    {"x":1},\n    {"y":[2]}\n  ]\n}\n',
    );
    expect(rowsJson({ a: 1 }, 'rows', [])).toBe(
      '{\n  "a": 1,\n  "rows": []\n}\n',
    );
  });

  it('writes several lists the same way', () => {
    expect(listsJson({ a: 1 }, { one: ['x', 'y'], two: [] })).toBe(
      '{\n  "a": 1,\n  "one": [\n    "x",\n    "y"\n  ],\n  "two": []\n}\n',
    );
    // One list is exactly rowsJson.
    expect(listsJson({ a: 1 }, { rows: [{ x: 1 }] })).toBe(
      rowsJson({ a: 1 }, 'rows', [{ x: 1 }]),
    );
  });

  it('writes keys in the schema’s order and leaves out absent fields', () => {
    const text = serializeRecords('genre', [
      // Keys out of order, and an undefined note, as a form might hand them in.
      {
        tags: ['Rock'],
        taught: true,
        note: undefined,
        name: 'Rock',
        id: 'rock',
      },
    ]);
    expect(text).toContain(
      '{"id":"rock","name":"Rock","taught":true,"tags":["Rock"]}',
    );
  });

  it('keys every kind in its schema’s field order', () => {
    for (const kind of VOCABULARY_KINDS) {
      expect(RECORD_KEYS[kind]).toEqual(
        Object.keys(RECORD_SCHEMAS[kind].shape),
      );
    }
    expect(RECORD_KEYS.instrument).toEqual([
      'id',
      'name',
      'section',
      'worldInstrumentId',
      'typicalIn',
    ]);
  });
});

describe('the schemas refuse', () => {
  const file = (records: unknown[], kind = 'genre') =>
    JSON.stringify({ vocabularyVersion: 1, kind, records });
  const genre = { id: 'rock', name: 'Rock', taught: true, tags: ['Rock'] };

  it('a field they do not know', () => {
    expect(() =>
      parseRecords('genre', file([{ ...genre, extra: 1 }])),
    ).toThrow();
  });

  it('an id that is not kebab-case', () => {
    expect(() =>
      parseRecords('genre', file([{ ...genre, id: 'Rock' }])),
    ).toThrow();
  });

  it('a blank or padded tag or name', () => {
    expect(() =>
      parseRecords('genre', file([{ ...genre, tags: [''] }])),
    ).toThrow();
    expect(() =>
      parseRecords('genre', file([{ ...genre, tags: [' Rock'] }])),
    ).toThrow();
    expect(() =>
      parseRecords('genre', file([{ ...genre, name: ' ' }])),
    ).toThrow();
  });

  it('a section the instrument sections do not have', () => {
    const piano = {
      id: 'piano',
      name: 'Piano',
      section: 'keyz',
      typicalIn: [],
    };
    expect(() =>
      parseRecords('instrument', file([piano], 'instrument')),
    ).toThrow();
  });

  it('a file of another kind', () => {
    expect(() => parseRecords('subgenre', file([genre]))).toThrow();
  });
});
