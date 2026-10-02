import { describe, expect, it } from 'vitest';
import { fixtureInput } from '../../__tests__/tableFixtures';
import { getTableModel } from '../../model/buildTableModel';
import { tableDef } from '../../model/categories';
import type { ColumnDef } from '../../model/types';
import type { TableId } from '../../tableIds';
import {
  bodyWith,
  clearedValues,
  clearRefusal,
  displayOf,
  isBlank,
  isScalarEditor,
  opsFor,
  overlaidCell,
  pathsOf,
  type ScalarEditor,
  summaryOf,
  valuesOf,
} from '../cellValues';
import { editorFor } from '../editorFor';
import { draftOf, readDraft } from '../editors/parse';

/**
 * A scalar cell's values: what it holds (the overlay over the row's body),
 * what a commit writes (a `set` per field changed, resting on what was
 * seen), what Delete may clear, and how an overlay shows — as the next
 * model will format it.
 */

const columnOf = (table: TableId, id: string): ColumnDef => {
  const found = tableDef(table).columns.find((c) => c.id === id);
  if (!found) throw new Error(`no column ${table}.${id}`);
  return found;
};

const scalar = (table: TableId, id: string): ScalarEditor => {
  const editor = editorFor(tableDef(table), columnOf(table, id));
  if (!isScalarEditor(editor)) throw new Error(`${table}.${id} is not scalar`);
  return editor;
};

describe('what a cell holds', () => {
  it('reads each field it edits: the overlay first, then the body', () => {
    const years = scalar('artists', 'years');
    expect(pathsOf(years)).toEqual(['activeFrom', 'activeTo']);
    const body = { activeFrom: 1961, activeTo: 1984 };
    expect(valuesOf(years, body)).toEqual({ activeFrom: 1961, activeTo: 1984 });
    // An edit on its way: what it wrote, a field it took away included.
    expect(valuesOf(years, body, { activeTo: undefined })).toEqual({
      activeFrom: 1961,
      activeTo: undefined,
    });
    expect(valuesOf(years, undefined)).toEqual({
      activeFrom: undefined,
      activeTo: undefined,
    });
    expect(isBlank(valuesOf(years, {}))).toBe(true);
    expect(isBlank({ title: 'Africa' })).toBe(false);
  });
});

describe('what a commit writes', () => {
  it('sets each field that changed, resting on what the author saw', () => {
    expect(
      opsFor(
        { activeFrom: 1961, activeTo: 1984 },
        { activeFrom: 1961, activeTo: 1990 },
      ),
    ).toEqual([{ op: 'set', path: 'activeTo', value: 1990, seen: 1984 }]);
    // Nothing changed: nothing to write.
    expect(opsFor({ year: 1982 }, { year: 1982 })).toEqual([]);
    expect(opsFor({ coordinates: [1, 2] }, { coordinates: [1, 2] })).toEqual(
      [],
    );
    expect(opsFor({ year: 1982 }, { year: undefined })).toEqual([
      { op: 'set', path: 'year', value: undefined, seen: 1982 },
    ]);
  });

  it('clears every field, where Delete may', () => {
    const years = scalar('artists', 'years');
    expect(clearedValues(years)).toEqual({
      activeFrom: undefined,
      activeTo: undefined,
    });
    expect(clearRefusal(years, 'Years Active')).toBeNull();
    expect(clearRefusal(scalar('songs', 'year'), 'Year')).toBeNull();
    expect(
      clearRefusal(scalar('songs', 'popularity'), 'Popularity'),
    ).toBeNull();
    // A name or title, one of a required list, a place's pin: never.
    expect(clearRefusal(scalar('songs', 'title'), 'Title')).toBe(
      'Title cannot be empty.',
    );
    expect(clearRefusal(scalar('records', 'format'), 'Format')).toMatch(
      /^Format cannot be empty/,
    );
    expect(
      clearRefusal(scalar('locations', 'coordinates'), 'Coordinates'),
    ).toMatch(/a place needs its pin/);
    // An optional text is cleared like any field.
    expect(clearRefusal(scalar('records', 'catalog'), 'Catalog #')).toBeNull();
  });

  it('sums the edit up in a line', () => {
    const year = columnOf('songs', 'year');
    expect(summaryOf(year, 'Africa', '1982', '1983')).toBe(
      'Year of Africa: 1982 → 1983',
    );
    expect(summaryOf(year, 'Africa', '1982', undefined)).toBe(
      'Year of Africa: 1982 → —',
    );
    expect(
      summaryOf(columnOf('songs', 'title'), 'Africa', 'Africa', 'África'),
    ).toBe('Title: Africa → África');
  });
});

describe('what an overlay shows', () => {
  it('formats a field as the next model will', () => {
    const years = columnOf('artists', 'years');
    const editor = scalar('artists', 'years');
    const values = { activeFrom: 1961, activeTo: undefined };
    expect(
      displayOf(years, editor, values, { activeTo: 1984 }, undefined),
    ).toBe('1961–');
    expect(
      bodyWith({ a: 1, session: { city: 'x' } }, { 'session.city': 'y' }),
    ).toEqual({
      a: 1,
      session: { city: 'y' },
    });
    const coords = columnOf('locations', 'coordinates');
    expect(
      displayOf(
        coords,
        scalar('locations', 'coordinates'),
        { coordinates: [42.3314, -83.0458] },
        {},
        undefined,
      ),
    ).toBe('42.33, -83.05');
  });

  it('names a choice by its label, and a title by what it now reads', () => {
    const region = columnOf('locations', 'region');
    const editor = scalar('locations', 'region');
    expect(
      displayOf(region, editor, { region: 'west-africa' }, {}, undefined),
    ).toBe('West Africa');
    const model = getTableModel(fixtureInput(), 'artists');
    const toto = model.rows[model.byKey.get('toto')!];
    expect(
      overlaidCell(
        toto.cells.title,
        columnOf('artists', 'title'),
        scalar('artists', 'title'),
        { name: 'TOTO' },
        toto.body,
        undefined,
      ),
    ).toEqual({ label: 'TOTO' });
    // Any other cell becomes a plain field with its hint, filled or not.
    const over = overlaidCell(
      toto.cells.years,
      columnOf('artists', 'years'),
      scalar('artists', 'years'),
      { activeFrom: undefined, activeTo: undefined },
      toto.body,
      undefined,
    );
    expect(over).toMatchObject({
      cell: { type: 'field', filled: false, sort: null },
    });
    expect('cell' in over && over.cell).not.toHaveProperty('text');
  });
});

describe('a draft, read', () => {
  it('writes each type’s values as the text it starts from, and back', () => {
    const cases: [ScalarEditor, Record<string, unknown>][] = [
      [scalar('songs', 'year'), { year: 1982 }],
      [scalar('songs', 'popularity'), { popularity: 71 }],
      [scalar('songs', 'title'), { title: 'Africa' }],
      [scalar('artists', 'years'), { activeFrom: 1961, activeTo: 1984 }],
      [scalar('artists', 'years'), { activeFrom: 1970, activeTo: undefined }],
      [scalar('locations', 'coordinates'), { coordinates: [42.33, -83.05] }],
      [scalar('events', 'video'), { videoId: 'dQw4w9WgXcQ' }],
    ];
    for (const [editor, values] of cases) {
      if (editor.type === 'choice' || editor.type === 'chords') continue;
      const text = draftOf(editor, values);
      expect(readDraft(editor, text, 'X'), text).toEqual({
        type: 'commit',
        values,
      });
    }
  });
});
