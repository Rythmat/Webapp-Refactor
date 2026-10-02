import { describe, expect, it } from 'vitest';
import { REGIONS } from '@/components/atlas/data/regions';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { releaseFormatSchema } from '@/scripts/apiContract/recordBodySchemas';
import { linkFor } from '../../link/links';
import { TABLES, tableDef } from '../../model/categories';
import type { ColumnDef, TableDef, TableRow } from '../../model/types';
import type { TableId } from '../../tableIds';
import {
  adminProposalOf,
  type CellEditor,
  EDITOR_TYPES,
  editorFor,
  editsInCell,
  type EditorType,
  INLINE_EDIT_FOR_EDITORS,
  type LockContext,
  lockOf,
  SCALAR_EDITORS,
} from '../editorFor';

/**
 * Which editor each cell opens, and whether it can be written now. The
 * registry declares the columns; the editor follows from each (design §1,
 * "Editor types" and the per-view tables), so every column of every table
 * is held here to the one the design gives it.
 */

const DEFS = Object.values(TABLES);

const columnOf = (table: TableId, id: string): ColumnDef => {
  const found = tableDef(table).columns.find((c) => c.id === id);
  if (!found) throw new Error(`no column ${table}.${id}`);
  return found;
};

const editor = (table: TableId, id: string): CellEditor =>
  editorFor(tableDef(table), columnOf(table, id));

/**
 * The design's per-view tables (§1), as editor types. A column left out of
 * its table's list is not edited in a cell (`none`): computed, code, or
 * the page's.
 */
const EXPECTED: Record<TableId, Record<string, EditorType>> = {
  artists: {
    title: 'text',
    born: 'born',
    city: 'one',
    genres: 'many',
    years: 'range',
    songs: 'relation',
    events: 'relation',
    instruments: 'many',
    aliases: 'textChips',
    group: 'panel',
    members: 'refs',
    memberOf: 'relation',
    labels: 'many',
    influencedBy: 'refs',
    influenced: 'relation',
    records: 'relation',
    bio: 'panel',
  },
  songs: {
    title: 'text',
    composers: 'credits',
    year: 'year',
    album: 'refs',
    label: 'one',
    studio: 'one',
    credits: 'panel',
    producer: 'credits',
    genre: 'tags',
    progression: 'relation',
    events: 'relation',
    artist: 'one',
    performers: 'credits',
    vocals: 'credits',
    engineer: 'credits',
    arranger: 'credits',
    conductor: 'credits',
    recordedIn: 'one',
    covers: 'panel',
    popularity: 'number',
  },
  // Its own fields wait for the genre kinds; what artists and songs state
  // is written on them now.
  genres: { artists: 'relation', songs: 'relation' },
  locations: {
    title: 'text',
    artists: 'relation',
    songs: 'relation',
    genre: 'textChips',
    events: 'relation',
    studios: 'relation',
    labels: 'relation',
    sceneDecades: 'tags',
    region: 'choice',
    country: 'text',
    subdivision: 'text',
    coordinates: 'coords',
  },
  instruments: { artists: 'relation' },
  events: {
    title: 'text',
    artists: 'many',
    songs: 'many',
    genre: 'textChips',
    year: 'year',
    place: 'one',
    records: 'many',
    studios: 'many',
    labels: 'many',
    video: 'text',
  },
  records: {
    title: 'text',
    artist: 'many',
    year: 'year',
    label: 'one',
    songs: 'relation',
    format: 'choice',
    catalog: 'text',
  },
  studios: {
    title: 'text',
    city: 'one',
    songs: 'relation',
    years: 'range',
    coordinates: 'panel',
  },
  labels: {
    title: 'text',
    city: 'one',
    artists: 'relation',
    records: 'relation',
    parent: 'one',
    imprints: 'relation',
    years: 'range',
    songs: 'relation',
  },
  keys: {},
  progressions: {
    songs: 'many',
    genre: 'tags',
    vibes: 'tags',
    complexity: 'choice',
    chords: 'chords',
  },
  years: {},
  decades: {},
};

describe('every cell’s editor', () => {
  it('is the one the design gives its column, in every table', () => {
    const wrong: string[] = [];
    for (const def of DEFS) {
      const expected = EXPECTED[def.id];
      for (const column of def.columns) {
        const got = editorFor(def, column).type;
        const want = expected[column.id] ?? 'none';
        if (got !== want)
          wrong.push(`${def.id}.${column.id}: ${got}, not ${want}`);
      }
      for (const id of Object.keys(expected))
        if (!def.columns.some((c) => c.id === id))
          wrong.push(`${def.id}.${id}: no such column`);
    }
    expect(wrong).toEqual([]);
  });

  it('is an editor, or an explicit panel or none that says why', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        const at = `${def.id}.${column.id}`;
        const found = editorFor(def, column);
        expect(EDITOR_TYPES, at).toContain(found.type);
        expect(found.path, at).toBeTruthy();
        const { edit } = column;
        if (found.type === 'none' || found.type === 'panel')
          expect(found.why, at).toMatch(/\.$/);
        // Nothing the row states is left without a way to edit it, and
        // nothing another item or code states is edited as the row's own.
        if (found.type === 'none')
          expect(['code', 'page', 'none'], at).toContain(edit.by);
        if (edit.by === 'owner') expect(found.type, at).toBe('relation');
        if (edit.by === 'row') {
          expect(found.path, at).toBe(edit.path);
          expect(found.since, at).toBe(edit.since);
          // A panel is declared, or the value is one a cell cannot hold.
          if (found.type === 'panel')
            expect(
              edit.cell?.editor === 'panel' ||
                (column.source.type === 'field' &&
                  column.source.format === 'ids'),
              at,
            ).toBe(true);
        }
      }
    }
  });

  it('picks the kinds its column’s stated part reaches', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        const found = editorFor(def, column);
        if (
          found.type !== 'one' &&
          found.type !== 'many' &&
          found.type !== 'refs'
        )
          continue;
        const at = `${def.id}.${column.id}`;
        expect(found.kinds.length, at).toBeGreaterThan(0);
        const { source } = column;
        const stated =
          source.type === 'connections'
            ? source.parts.find((p) => p.role === 'stated')
            : undefined;
        expect(found.kinds, at).toEqual(stated?.hops[0].to);
      }
    }
    expect(editor('artists', 'genres')).toMatchObject({
      kinds: ['genre', 'subgenre'],
    });
    expect(editor('artists', 'members')).toMatchObject({
      kinds: ['artist'],
      key: 'artistId',
    });
    expect(editor('songs', 'album')).toMatchObject({
      kinds: ['release'],
      key: 'releaseId',
    });
  });

  it('writes a relation on the item that states it, through its link', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        const found = editorFor(def, column);
        if (found.type !== 'relation') continue;
        const at = `${def.id}.${column.id}`;
        const { edit, source } = column;
        expect(edit.by, at).toBe('owner');
        if (edit.by !== 'owner') continue;
        expect(found.owner, at).toBe(edit.kind);
        expect(found.link, at).toBe(linkFor(def.id, column.id)?.id);
        // Its part is the column's one-step part the owner states: the
        // chips of the others are read-only.
        const part =
          source.type === 'connections'
            ? source.parts.find((p) => p.id === found.part)
            : undefined;
        expect(part?.role, at).toMatch(/^(fact|stated)$/);
        expect(part?.hops, at).toHaveLength(1);
      }
    }
    expect(editor('genres', 'artists')).toMatchObject({
      owner: 'artist',
      path: 'genreIds[]',
      link: 'genre-artist',
      part: 'stated',
    });
    expect(editor('genres', 'songs')).toMatchObject({
      owner: 'song',
      path: 'genreTags[]',
      link: 'genre-song',
    });
    expect(editor('instruments', 'artists')).toMatchObject({
      owner: 'artist',
      path: 'instrumentIds[]',
      link: 'instrument-artist',
      part: 'stated',
    });
  });

  it('keeps the instruments an artist states apart from what they played', () => {
    const { source } = columnOf('instruments', 'artists');
    expect(source.type === 'connections' && source.parts).toEqual([
      expect.objectContaining({
        id: 'stated',
        role: 'fact',
        hops: [expect.objectContaining({ via: ['instrumentIds[]'] })],
      }),
      expect.objectContaining({
        id: 'played',
        role: 'fact',
        hops: [
          expect.objectContaining({
            via: ['credits[].instrument', 'members[].instrumentIds[]'],
          }),
        ],
      }),
    ]);
  });

  it('lets the display text follow a v2 id, as a link’s does', () => {
    expect(editor('songs', 'studio')).toMatchObject({
      type: 'one',
      kinds: ['studio'],
      text: 'session.studio',
      since: 'song-v2',
    });
    expect(editor('songs', 'recordedIn')).toMatchObject({
      text: 'session.city',
    });
    expect(editor('events', 'place')).toMatchObject({ text: 'location.city' });
    // The billing line is the song's own: a lead act does not rewrite it.
    expect(editor('songs', 'artist')).not.toHaveProperty('text');
  });

  it('sends a song’s Label to its record’s label when it is on one', () => {
    expect(editor('songs', 'label')).toEqual({
      type: 'one',
      path: 'session.labelId',
      since: 'song-v2',
      kinds: ['label'],
      text: 'session.label',
      onRecord: 'song-label',
    });
    expect(linkFor('songs', 'label')).toMatchObject({
      id: 'song-label',
      picks: 'label',
      owner: { kind: 'release' },
    });
  });

  it('edits one role’s credits in each credit column, and all of them in the panel', () => {
    expect(editor('songs', 'composers')).toMatchObject({
      type: 'credits',
      role: 'songwriter',
    });
    expect(editor('songs', 'producer')).toMatchObject({
      type: 'credits',
      role: 'producer',
    });
    expect(editor('songs', 'engineer')).toMatchObject({
      type: 'credits',
      role: 'engineer',
    });
    // Each role is its column's own (types.ts, `ColumnEdit.roles`).
    for (const id of [
      'composers',
      'producer',
      'performers',
      'vocals',
      'engineer',
      'arranger',
      'conductor',
    ]) {
      const { edit } = columnOf('songs', id);
      const found = editor('songs', id);
      expect(edit.by === 'row' && edit.roles).toEqual(
        found.type === 'credits' ? [found.role] : [],
      );
    }
    expect(editor('songs', 'credits').type).toBe('panel');
  });

  it('names the title’s other fields, and never lets it be emptied', () => {
    expect(editor('artists', 'title')).toEqual({
      type: 'text',
      path: 'name',
      required: true,
      also: ['aliases', 'group'],
    });
    expect(editor('songs', 'title')).toEqual({
      type: 'text',
      path: 'title',
      required: true,
    });
    expect(editor('events', 'video')).toMatchObject({ parse: 'youtube-id' });
    expect(editor('songs', 'popularity')).toMatchObject({ min: 0, max: 100 });
    expect(editor('artists', 'years')).toMatchObject({ to: 'activeTo' });
  });

  it('says where a cell that is not edited here is edited', () => {
    expect(editor('songs', 'key')).toMatchObject({
      type: 'none',
      why: 'Edited on its page.',
    });
    expect(editor('genres', 'title')).toMatchObject({
      type: 'none',
      why: 'In code: genres.json.',
    });
    expect(editor('keys', 'songs').type).toBe('none');
  });
});

describe('a choice’s options', () => {
  const optionsOf = (table: TableId, id: string) => {
    const found = editor(table, id);
    return found.type === 'choice' ? found.options.map((o) => o.value) : [];
  };

  it('are every value the field can hold', () => {
    expect(optionsOf('records', 'format')).toEqual(releaseFormatSchema.options);
    expect(optionsOf('locations', 'region')).toEqual(
      REGIONS.map((region) => region.id),
    );
    // Every progression the library has is at one of the levels offered.
    const levels = new Set(optionsOf('progressions', 'complexity'));
    const off = CHORD_PROGRESSION_LIBRARY.filter(
      (entry) => !levels.has(entry.complexity),
    ).map((entry) => entry.id);
    expect(off).toEqual([]);
  });

  it('each have a label', () => {
    for (const def of DEFS)
      for (const column of def.columns) {
        const found = editorFor(def, column);
        if (found.type !== 'choice') continue;
        for (const option of found.options)
          expect(option.label, `${def.id}.${column.id}`).toBeTruthy();
      }
  });
});

describe('the first release', () => {
  it('edits scalars and a progression’s chords in the cell, and opens the row for everything else', () => {
    expect([...SCALAR_EDITORS].sort()).toEqual(
      ['choice', 'chords', 'coords', 'number', 'range', 'text', 'year'].sort(),
    );
    expect(editsInCell(editor('progressions', 'chords'))).toBe(true);
    expect(editsInCell(editor('songs', 'year'))).toBe(true);
    expect(editsInCell(editor('records', 'format'))).toBe(true);
    expect(editsInCell(editor('artists', 'genres'))).toBe(false);
    expect(editsInCell(editor('artists', 'born'))).toBe(false);
    expect(editsInCell(editor('artists', 'songs'))).toBe(false);
  });

  it('lets editors edit in place, each edit a proposal', () => {
    expect(INLINE_EDIT_FOR_EDITORS).toBe(true);
  });
});

/* ── Locks ───────────────────────────────────────────────────────────── */

const rowOf = (
  kind: TableRow['kind'],
  body: Record<string, unknown> | undefined,
  extra: Partial<TableRow> = {},
): TableRow => ({
  key: 'x',
  node: `${kind}:x`,
  kind,
  label: 'X',
  status: 'published',
  editState: null,
  unverified: false,
  body,
  itemId: 'item-x',
  cells: {},
  flags: new Set(),
  haystack: 'x',
  suggestions: 0,
  degree: { solid: 0, guessed: 0 },
  ...extra,
});

const ctxFor = (
  def: TableDef,
  extra: Partial<LockContext> = {},
): LockContext => ({
  def,
  mode: 'working',
  known: true,
  isServed: () => true,
  schemaVersionOf: () => 2,
  isEditor: false,
  proposalOf: adminProposalOf,
  ...extra,
});

const lock = (
  table: TableId,
  id: string,
  row: TableRow,
  extra: Partial<LockContext> = {},
) => lockOf(row, columnOf(table, id), ctxFor(tableDef(table), extra));

describe('whether a cell can be written now', () => {
  const artist = rowOf('artist', { slug: 'x', name: 'X' });

  it('can, for a served kind in the working copy', () => {
    expect(lock('artists', 'title', artist)).toBeNull();
    expect(lock('artists', 'born', artist)).toBeNull();
    expect(lock('artists', 'songs', artist)).toBeNull();
  });

  it('cannot for a column not edited here, and says who edits it', () => {
    expect(lock('songs', 'key', rowOf('song', { id: 'x' }))).toEqual({
      reason: 'Edited on its page.',
    });
    expect(lock('genres', 'year', rowOf('genre', { id: 'x' }))).toEqual({
      reason: 'Counted from other rows: it changes when they do.',
    });
  });

  it('follows the row panel’s rule for the item', () => {
    expect(lock('artists', 'title', artist, { mode: 'repo' })?.reason).toMatch(
      /repo’s snapshot/,
    );
    expect(lock('artists', 'title', artist, { known: false })).toEqual({
      reason: '',
    });
    expect(
      lock('artists', 'title', artist, {
        isServed: (kind: ContentKind) => kind !== 'artist',
      })?.reason,
    ).toBe('Read-only: the content API does not serve artists yet.');
  });

  it('stops an admin at a proposal, and an editor at someone else’s', () => {
    const proposed = { ...artist, editState: 'pending' as const };
    expect(lock('artists', 'title', proposed)?.reason).toBe(
      'Review the pending proposal first: approve or reject it above.',
    );
    expect(
      lock('artists', 'title', proposed, {
        isEditor: true,
        proposalOf: () => 'mine',
      }),
    ).toBeNull();
    expect(
      lock('artists', 'title', proposed, {
        isEditor: true,
        proposalOf: () => 'other',
      })?.reason,
    ).toMatch(/another editor’s proposal is waiting/);
    expect(
      lock('artists', 'title', { ...proposed, editState: 'rejected' })?.reason,
    ).toMatch(/^Sent back to its editor/);
  });

  it('keeps editors to the panel when inline edits are switched off', () => {
    expect(
      lock('artists', 'title', artist, {
        isEditor: true,
        inlineForEditors: false,
      }),
    ).toEqual({ reason: 'Propose changes in the row panel.' });
  });

  it('holds a field until the server takes its schema step', () => {
    const older = { schemaVersionOf: () => 1 };
    expect(lock('artists', 'born', artist, older)).toEqual({
      reason: 'Not saveable yet: it comes with the artist’s Born field.',
      step: 'artist-born',
    });
    expect(lock('artists', 'city', artist, older)).toBeNull();
    // A relation waits for its owner's step.
    expect(lock('artists', 'events', artist, older)).toMatchObject({
      step: 'event-v2',
    });
  });

  it('holds a relation by its owner’s kind, never by the row’s proposal', () => {
    const proposed = { ...artist, editState: 'pending' as const };
    expect(lock('artists', 'songs', proposed)).toBeNull();
    expect(
      lock('artists', 'songs', artist, {
        isServed: (kind: ContentKind) => kind !== 'song',
      })?.reason,
    ).toMatch(/does not serve songs/);
    // A genre's artists are the artists' to state, though the genre is code.
    expect(
      lock('genres', 'artists', rowOf('genre', { id: 'rock' })),
    ).toBeNull();
  });

  it('has nothing to edit on a row found nowhere', () => {
    expect(
      lock(
        'artists',
        'title',
        rowOf('artist', undefined, { status: 'missing' }),
      )?.reason,
    ).toMatch(/^Found nowhere/);
  });
});
