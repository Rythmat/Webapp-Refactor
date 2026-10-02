import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { HistoricalEvent } from '@/components/atlas/types';
import type { Genre } from '@/content/graph/genres';
import {
  EDGE_ENDPOINTS,
  EDGE_KINDS,
  type EdgeKind,
  type EntityKind,
} from '@/content/graph/types';
import type { ChordProgressionEntry } from '@/curriculum/data/chordProgressionLibrary';
import type { SessionInstrument } from '@/curriculum/data/instruments';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { recordBodySchemas } from '@/scripts/apiContract/recordBodySchemas';
import { songBodySchema } from '@/scripts/apiContract/songBodySchema';
import {
  COMMON_FILTERS,
  defaultColumns,
  ownerColumns,
  storedColumns,
  TABLES,
} from '../model/categories';
import type {
  ColumnDef,
  ConnectionPart,
  FilterRule,
  Hop,
  TableDef,
} from '../model/types';
import {
  TABLE_FOR_CONTENT_KIND,
  TABLE_FOR_NODE_KIND,
  TABLE_IDS,
} from '../tableIds';

/**
 * The Table's registry: every table's columns, walks, fields and filters.
 *
 * The owner's columns are his words in his order (29 Sep 2026) — a rename or
 * a reorder is his call, so it fails here first. The rest is held to the
 * graph and the contract: every walk follows edges that can join the kinds
 * it names, every field it reads or edits is one the body schema has, every
 * filter names a column of its table.
 */

const DEFS = Object.values(TABLES);

/* ── The owner's columns ─────────────────────────────────────────────── */

/**
 * His five lists as he wrote them, with his "Lable" spelt Label. Artist Name
 * is the Artist table's title column; the other tables' titles are the row
 * itself and not on his lists.
 */
const OWNER_COLUMNS: Partial<Record<keyof typeof TABLES, readonly string[]>> = {
  artists: [
    'Artist Name',
    'Born',
    'City',
    'Genres',
    'Years Active',
    'Songs',
    'Events',
    'Instruments',
  ],
  songs: [
    'Composers',
    'Year',
    'Album',
    'Label',
    'Studio',
    'Credits',
    'Producer',
    'Genre',
    'Key',
    'Chord Progression',
    'Events',
  ],
  genres: ['Artists', 'Songs', 'Year', 'Location', 'Instruments'],
  locations: ['Artists', 'Songs', 'Genre', 'Instruments'],
  events: ['Artists', 'Songs', 'Genre'],
};

/**
 * The categories he left as "Etc.": the columns he has seen proposed, as the
 * approved plan (§3.2) amends them — Key gains Modes, a progression's Key is
 * opt-in, a decade adds Active.
 */
const PROPOSED_COLUMNS: Partial<
  Record<keyof typeof TABLES, readonly string[]>
> = {
  instruments: ['Artists', 'Songs', 'Genre', 'Location', 'Year'],
  records: ['Artist', 'Year', 'Label', 'Studio', 'Songs'],
  studios: ['City', 'Artists', 'Songs'],
  labels: ['City', 'Artists', 'Records'],
  keys: ['Modes', 'Songs', 'Artists', 'Genre', 'Chord Progression', 'Year'],
  progressions: ['Songs', 'Artists', 'Genre', 'Year'],
  years: ['Songs', 'Artists', 'Events', 'Genre', 'Location', 'Records'],
  decades: [
    'Songs',
    'Artists',
    'Events',
    'Genre',
    'Location',
    'Records',
    'Active',
  ],
};

/**
 * The opt-in columns that show what the bulk import writes beyond the
 * defaults above (owner, 30 Sep 2026: "Update the table as well with all
 * the import information"): an artist's group, a song's credits by role, a
 * place's country and state, and the records the import makes, field by
 * field. importCoverage.test.ts holds every imported field to a column or
 * the row panel; these are the ones that needed a column of their own.
 */
const IMPORT_COLUMNS: Partial<Record<keyof typeof TABLES, readonly string[]>> =
  {
    artists: ['Group', 'Members', 'Labels', 'Records'],
    songs: ['Performers', 'Vocals', 'Engineer', 'Arranger', 'Conductor'],
    locations: ['Country', 'State or province', 'Region', 'Coordinates'],
    events: ['Place'],
    records: ['Format', 'Catalog #'],
    studios: ['Years', 'Coordinates'],
    labels: ['Years'],
  };

const labels = (columns: readonly ColumnDef[]) => columns.map((c) => c.label);

describe('the registry', () => {
  it('declares every table, each under its own id', () => {
    expect(Object.keys(TABLES).sort()).toEqual([...TABLE_IDS].sort());
    for (const [id, def] of Object.entries(TABLES)) expect(def.id).toBe(id);
  });

  it('opens each table with its one title column', () => {
    for (const def of DEFS) {
      const titles = def.columns.filter((c) => c.source.type === 'title');
      expect(titles, def.id).toHaveLength(1);
      expect(def.columns[0], def.id).toBe(titles[0]);
      expect(def.columns[0].id, def.id).toBe('title');
      expect(def.columns[0].defaultVisible, def.id).toBe(true);
    }
  });

  it('keeps column ids unique within a table', () => {
    for (const def of DEFS) {
      const ids = def.columns.map((c) => c.id);
      expect(new Set(ids).size, def.id).toBe(ids.length);
    }
  });
});

describe('the owner’s columns', () => {
  it.each(Object.entries(OWNER_COLUMNS))(
    'are his, verbatim and in order, on %s',
    (id, columns) => {
      const def = TABLES[id as keyof typeof TABLES];
      expect(labels(ownerColumns(def))).toEqual(columns);
      // Shown by default, and nothing else is but the title.
      const shown = labels(defaultColumns(def));
      const title = def.columns[0];
      expect(shown).toEqual(title.owner ? columns : [title.label, ...columns]);
    },
  );

  it('spell his “Lable” as Label', () => {
    expect(labels(TABLES.songs.columns)).toContain('Label');
    for (const def of DEFS) {
      expect(labels(def.columns), def.id).not.toContain('Lable');
    }
  });

  it.each(Object.entries(PROPOSED_COLUMNS))(
    'are proposed, as he has seen them, on %s',
    (id, columns) => {
      const def = TABLES[id as keyof typeof TABLES];
      // He listed none of these himself.
      expect(ownerColumns(def)).toEqual([]);
      expect(labels(defaultColumns(def))).toEqual([
        def.columns[0].label,
        ...columns,
      ]);
    },
  );

  it.each(Object.entries(IMPORT_COLUMNS))(
    'show what the import writes on %s, behind the Columns menu',
    (id, columns) => {
      const def = TABLES[id as keyof typeof TABLES];
      const optIn = def.columns.filter((c) => !c.defaultVisible);
      expect(labels(optIn)).toEqual(expect.arrayContaining([...columns]));
    },
  );

  it('give each credit role a column of its own, Credits all of them', () => {
    const roles = TABLES.songs.columns.flatMap((column) =>
      column.edit.by === 'row' && column.edit.path === 'credits[]'
        ? [[column.label, column.edit.roles?.join(' ') ?? 'every role']]
        : [],
    );
    expect(roles).toEqual([
      ['Composers', 'songwriter'],
      ['Credits', 'every role'],
      ['Producer', 'producer'],
      ['Performers', 'performer'],
      ['Vocals', 'vocals'],
      ['Engineer', 'engineer'],
      ['Arranger', 'arranger'],
      ['Conductor', 'conductor'],
    ]);
  });

  it('cover every table one way or the other', () => {
    const covered = [
      ...Object.keys(OWNER_COLUMNS),
      ...Object.keys(PROPOSED_COLUMNS),
    ];
    expect(covered.sort()).toEqual([...TABLE_IDS].sort());
  });

  it('say where every empty cell’s data will come from', () => {
    for (const def of DEFS) {
      for (const column of def.columns.slice(1)) {
        expect(
          column.empty.trim().length,
          `${def.id}.${column.id}`,
        ).toBeGreaterThan(5);
        expect(column.empty, `${def.id}.${column.id}`).toMatch(/\.$/);
      }
    }
  });
});

/* ── Walks ───────────────────────────────────────────────────────────── */

/** The kinds an edge's `on` names: the song a credit was on. */
const ON_KINDS: readonly EntityKind[] = ['song'];

/** The ends of `edge` a step stands on and lands on. */
function endsOf(hop: Hop, edge: EdgeKind) {
  const { from, to } = EDGE_ENDPOINTS[edge];
  if (hop.through === 'on') {
    return hop.dir === 'out'
      ? { near: ON_KINDS, far: to }
      : { near: to, far: ON_KINDS };
  }
  if (hop.dir === 'out') return { near: from, far: to };
  if (hop.dir === 'in') return { near: to, far: from };
  return { near: [...from, ...to], far: [...from, ...to] };
}

/** Every part a column walks, its hint's included. */
function partsOf(column: ColumnDef): readonly ConnectionPart[] {
  const { source } = column;
  if (source.type === 'connections' || source.type === 'years') {
    return source.parts;
  }
  if (source.type === 'field') return source.hint?.parts ?? [];
  return [];
}

/** The node kinds a column's walk starts from. */
function startsOf(def: TableDef, column: ColumnDef): EntityKind[] {
  const kinds: EntityKind[] = [def.rows.kind];
  if (def.rows.more) kinds.push(def.rows.more.kind);
  const noExpand =
    (column.source.type === 'connections' || column.source.type === 'years') &&
    column.source.noExpand;
  if (!noExpand && def.rows.expand === 'subgenres') kinds.push('subgenre');
  if (!noExpand && def.rows.expand === 'decadeYears') kinds.push('year');
  return kinds;
}

/** Each step can be taken from where the walk stands and lands where it says. */
function expectWalkable(
  hops: readonly Hop[],
  start: readonly EntityKind[],
  where: string,
) {
  let standing = start;
  hops.forEach((hop, i) => {
    const at = `${where} step ${i + 1}`;
    expect(hop.edges.length, at).toBeGreaterThan(0);
    expect(hop.to.length, at).toBeGreaterThan(0);
    for (const edge of hop.edges) {
      expect(EDGE_KINDS, at).toContain(edge);
      const { near, far } = endsOf(hop, edge);
      expect(
        standing.some((kind) => near.includes(kind)),
        `${at}: ${edge} cannot start from ${standing.join('|')}`,
      ).toBe(true);
      expect(
        hop.to.some((kind) => far.includes(kind)),
        `${at}: ${edge} cannot reach ${hop.to.join('|')}`,
      ).toBe(true);
    }
    for (const kind of hop.to) {
      expect(
        hop.edges.some((edge) => endsOf(hop, edge).far.includes(kind)),
        `${at}: no edge reaches ${kind}`,
      ).toBe(true);
    }
    if (hop.through === 'on') {
      // Only a credit's instrument edge carries the song it was played on.
      expect(hop.edges, at).toEqual(['plays_instrument']);
      expect(hop.dir, at).not.toBe('both');
    }
    standing = hop.to;
  });
}

describe('the walks', () => {
  it('follow edges that can join the kinds they name', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        for (const part of partsOf(column)) {
          expectWalkable(
            part.hops,
            startsOf(def, column),
            `${def.id}.${column.id}.${part.id}`,
          );
        }
      }
    }
  });

  it('take one step for a fact, two for a rollup', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        const at = `${def.id}.${column.id}`;
        const parts = partsOf(column);
        const ids = parts.map((p) => p.id);
        expect(new Set(ids).size, at).toBe(ids.length);
        for (const part of parts) {
          if (part.role === 'rollup') expect(part.hops, at).toHaveLength(2);
          if (part.role === 'stated' || part.role === 'fact') {
            expect(part.hops, at).toHaveLength(1);
          }
          expect(part.label.trim(), at).not.toBe('');
        }
      }
    }
  });

  it('count years by walking to year nodes', () => {
    for (const def of DEFS) {
      for (const column of def.columns) {
        const { source } = column;
        const yearParts =
          source.type === 'years'
            ? source.parts
            : source.type === 'field'
              ? (source.hint?.parts ?? [])
              : [];
        for (const part of yearParts) {
          expect(part.hops.at(-1)!.to, `${def.id}.${column.id}`).toEqual([
            'year',
          ]);
        }
      }
    }
  });

  it('let only the row’s own fields state a value', () => {
    // A `stated` part is what the row's panel edits and what the coverage
    // strip counts, so it belongs to a column the row edits — and a column
    // the row edits has one, or its coverage would always read empty.
    for (const def of DEFS) {
      for (const column of def.columns) {
        const at = `${def.id}.${column.id}`;
        const stated = partsOf(column).some((p) => p.role === 'stated');
        if (stated) expect(column.edit.by, at).toBe('row');
        if (column.edit.by === 'row' && column.source.type === 'connections') {
          expect(stated, at).toBe(true);
        }
      }
    }
  });

  it('narrow a table only by what its rows reach', () => {
    for (const def of DEFS) {
      if (!def.narrow) continue;
      const reached = def.columns.flatMap((column) =>
        partsOf(column).map((part) => part.hops[0].to),
      );
      expectWalkable([def.narrow.hop], reached.flat(), `${def.id}.narrow`);
    }
  });
});

/* ── Fields ──────────────────────────────────────────────────────────── */

/** A body shape the test can walk: a leaf, an object, or an array of one. */
type Shape = true | { readonly [key: string]: Shape } | readonly [Shape];

/*
 * The bodies with no generated schema. Typed against their interfaces, so a
 * renamed field fails to compile here.
 */
const EVENT_BODY = {
  id: true,
  year: true,
  location: { lat: true, lng: true, city: true, country: true },
  genre: [true],
  title: true,
  description: true,
  tags: [true],
  videoId: true,
} as const satisfies Record<keyof HistoricalEvent, Shape>;

const PROGRESSION_BODY = {
  id: true,
  progression: true,
  chords: [true],
  chordCount: true,
  startingChord: true,
  startingDegree: true,
  complexity: true,
  vibes: [true],
  styles: [true],
  artist: true,
  song: true,
  songIds: [true],
} as const satisfies Record<keyof ChordProgressionEntry, Shape>;

// A code table's rows read their vocabulary entry.
const INSTRUMENT_ENTRY = {
  id: true,
  name: true,
  section: true,
  worldInstrumentId: true,
} as const satisfies Record<keyof SessionInstrument, Shape>;

const GENRE_ENTRY = {
  id: true,
  name: true,
  taught: true,
  note: true,
} as const satisfies Record<keyof Genre, Shape>;

type Segment = { name: string; each: boolean };

const segments = (path: string): Segment[] =>
  path
    .split('.')
    .map((part) =>
      part.endsWith('[]')
        ? { name: part.slice(0, -2), each: true }
        : { name: part, each: false },
    );

/** Optional, nullable, defaulted: the value inside. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrap(schema._def.innerType);
  }
  return schema;
}

function inSchema(schema: z.ZodTypeAny, path: string): boolean {
  let at = schema;
  for (const { name, each } of segments(path)) {
    const object = unwrap(at);
    if (!(object instanceof z.ZodObject)) return false;
    const next: z.ZodTypeAny | undefined = object.shape[name];
    if (!next) return false;
    at = next;
    if (each) {
      const array = unwrap(at);
      if (!(array instanceof z.ZodArray)) return false;
      at = array.element;
    }
  }
  return true;
}

function inShape(shape: Shape, path: string): boolean {
  let at: Shape | undefined = shape;
  for (const { name, each } of segments(path)) {
    if (at === true || at === undefined || Array.isArray(at)) return false;
    at = (at as Record<string, Shape>)[name];
    if (at === undefined) return false;
    if (each) {
      if (!Array.isArray(at)) return false;
      at = (at as readonly [Shape])[0];
    }
  }
  return true;
}

const SCHEMAS: Partial<Record<ContentKind, z.ZodTypeAny>> = {
  ...recordBodySchemas,
  song: songBodySchema,
};

const SHAPES: Partial<Record<ContentKind, Shape>> = {
  globe_event: EVENT_BODY,
  chord_progression: PROGRESSION_BODY,
};

/** Does a content kind's body have this field? */
function kindHas(kind: ContentKind, path: string): boolean {
  const schema = SCHEMAS[kind];
  if (schema) return inSchema(schema, path);
  const shape = SHAPES[kind];
  if (shape) return inShape(shape, path);
  throw new Error(`no body schema for ${kind}`);
}

/** Does a table's row body — its item's, or its vocabulary entry — have it? */
function rowHas(def: TableDef, path: string): boolean {
  if (def.contentKind) return kindHas(def.contentKind, path);
  if (def.rows.vocabulary === 'instruments') {
    return inShape(INSTRUMENT_ENTRY, path);
  }
  if (def.rows.vocabulary === 'genres') return inShape(GENRE_ENTRY, path);
  return false;
}

/** Every field path a filter rule reads, and every column it names. */
function ruleRefs(rule: FilterRule): { columns: string[]; paths: string[] } {
  switch (rule.type) {
    case 'missing':
    case 'empty':
    case 'guessed':
      return { columns: [rule.column], paths: [] };
    case 'field':
      return { columns: [], paths: [rule.path] };
    case 'flag':
      return { columns: [], paths: [] };
    case 'not':
      return ruleRefs(rule.rule);
    case 'all': {
      const refs = rule.rules.map(ruleRefs);
      return {
        columns: refs.flatMap((r) => r.columns),
        paths: refs.flatMap((r) => r.paths),
      };
    }
  }
}

describe('the fields', () => {
  it('read and edit only what the body schemas have', () => {
    const problems: string[] = [];
    const check = (ok: boolean, what: string) => {
      if (!ok) problems.push(what);
    };
    for (const def of DEFS) {
      for (const column of def.columns) {
        const at = `${def.id}.${column.id}`;
        const { source, edit } = column;
        // A field the contract takes only from C2 on is not there yet.
        const pending = (path: string) =>
          edit.by === 'row' && edit.since !== undefined && edit.path === path;
        if (source.type === 'field') {
          for (const path of [source.path, source.to]) {
            if (path && !pending(path))
              check(rowHas(def, path), `${at} reads ${path}`);
          }
        }
        if (source.type === 'connections' && source.unlinkedText) {
          check(
            rowHas(def, source.unlinkedText),
            `${at} shows ${source.unlinkedText}`,
          );
        }
        if (source.type === 'credits') {
          check(rowHas(def, source.path), `${at} reads ${source.path}`);
        }
        if (edit.by === 'row') {
          expect(def.contentKind, `${at} is edited, so stored`).toBeDefined();
          if (!edit.since)
            check(rowHas(def, edit.path), `${at} edits ${edit.path}`);
          for (const path of edit.also ?? []) {
            check(rowHas(def, path), `${at} also edits ${path}`);
          }
        }
        if (edit.by === 'owner' && !edit.since) {
          check(
            kindHas(edit.kind, edit.path),
            `${at} links through ${edit.kind}.${edit.path}`,
          );
        }
        if (edit.by === 'code') {
          check(
            existsSync(resolve(process.cwd(), edit.file)),
            `${at} names ${edit.file}`,
          );
        }
      }
      for (const key of def.search) {
        if (key.from === 'field') {
          check(rowHas(def, key.path), `${def.id} searches ${key.path}`);
        }
      }
      for (const filter of def.filters) {
        for (const path of ruleRefs(filter.rule).paths) {
          check(
            rowHas(def, path),
            `${def.id} filter ${filter.id} reads ${path}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('would notice a field the body does not have', () => {
    // The checks above are only as good as the lookups they rest on.
    expect(kindHas('artist', 'members[].artistId')).toBe(true);
    expect(kindHas('song', 'session.studio')).toBe(true);
    expect(kindHas('song', 'credits[].artistGlobeId')).toBe(true);
    expect(kindHas('globe_city', 'aliases[]')).toBe(true);
    expect(kindHas('globe_event', 'location.city')).toBe(true);
    expect(kindHas('chord_progression', 'songIds[]')).toBe(true);
    expect(kindHas('song', 'title.name')).toBe(false);
    expect(kindHas('song', 'credits[].nickname')).toBe(false);
    expect(kindHas('song', 'session[]')).toBe(false);
    expect(kindHas('artist', 'nickname')).toBe(false);
    expect(kindHas('globe_event', 'location.town')).toBe(false);
    expect(kindHas('globe_event', 'title[]')).toBe(false);
  });

  it('name code files that exist', () => {
    for (const def of DEFS) {
      for (const file of def.code?.files ?? []) {
        expect(
          existsSync(resolve(process.cwd(), file)),
          `${def.id}: ${file}`,
        ).toBe(true);
      }
    }
  });
});

/* ── Filters, sort and search ────────────────────────────────────────── */

describe('the filters', () => {
  it('have unique ids and name only their table’s columns', () => {
    for (const def of DEFS) {
      const ids = def.filters.map((f) => f.id);
      expect(new Set(ids).size, def.id).toBe(ids.length);
      const columns = new Set(def.columns.map((c) => c.id));
      for (const filter of def.filters) {
        for (const column of ruleRefs(filter.rule).columns) {
          expect(
            columns.has(column),
            `${def.id} ${filter.id} → ${column}`,
          ).toBe(true);
        }
      }
      for (const view of def.views ?? []) {
        for (const column of ruleRefs(view.rule).columns) {
          expect(columns.has(column), `${def.id} view ${view.id}`).toBe(true);
        }
      }
    }
  });

  it('offer the common ones on every table', () => {
    for (const def of DEFS) {
      const ids = def.filters.map((f) => f.id);
      for (const common of COMMON_FILTERS) {
        expect(ids, def.id).toContain(common.id);
      }
    }
    expect(COMMON_FILTERS.map((f) => f.id)).toEqual([
      'has-suggestions',
      'bulk-unreviewed',
      'unconfirmed',
      'guesses',
      'orphan',
      'missing',
    ]);
  });

  it('let the coverage strip toggle every stored column’s gap', () => {
    for (const def of DEFS) {
      for (const column of storedColumns(def)) {
        expect(
          def.filters.some(
            (f) => f.rule.type === 'missing' && f.rule.column === column.id,
          ),
          `${def.id}.${column.id}`,
        ).toBe(true);
      }
    }
  });

  it.each([
    [
      'artists',
      [
        'missing-born',
        'missing-city',
        'missing-genres',
        'missing-years',
        'groups',
        'people',
        'no-songs',
      ],
    ],
    [
      'songs',
      [
        'missing-year',
        'no-album',
        'no-credits',
        'unlinked-lead-act',
        'no-progression',
      ],
    ],
    ['locations', ['cities', 'regions', 'hometowns', 'no-artists']],
    ['events', ['unresolved-place', 'no-artists', 'no-genre']],
    ['progressions', ['names-song-unlinked', 'orphan']],
    ['genres', ['taught']],
  ] as const)('include the plan’s own on %s', (id, expected) => {
    const ids = TABLES[id].filters.map((f) => f.id);
    for (const filter of expected) expect(ids).toContain(filter);
  });

  it('open the Artist table on its acts, with credited people beside', () => {
    expect(TABLES.artists.views?.map((v) => [v.id, v.label])).toEqual([
      ['acts', 'Acts'],
      ['credited', 'Credited people'],
    ]);
  });

  it('list the 29 genres first, the subgenres behind a toggle', () => {
    expect(TABLES.genres.rows).toMatchObject({
      kind: 'genre',
      vocabulary: 'genres',
      more: { kind: 'subgenre', label: 'Show subgenres' },
      expand: 'subgenres',
    });
  });
});

describe('sort and search', () => {
  it('sort by a column of the table', () => {
    for (const def of DEFS) {
      expect(
        def.columns.map((c) => c.id),
        def.id,
      ).toContain(def.defaultSort.column);
    }
    expect(TABLES.artists.defaultSort).toEqual({ column: 'title', dir: 'asc' });
    expect(TABLES.genres.defaultSort).toEqual({ column: 'songs', dir: 'desc' });
    expect(TABLES.events.defaultSort).toEqual({ column: 'year', dir: 'asc' });
  });

  it('search the title and only the table’s own columns', () => {
    for (const def of DEFS) {
      expect(def.search[0], def.id).toEqual({ from: 'label' });
      const columns = new Set(def.columns.map((c) => c.id));
      for (const key of def.search) {
        if (key.from === 'column') {
          expect(columns.has(key.column), `${def.id} → ${key.column}`).toBe(
            true,
          );
        }
      }
    }
  });
});

/* ── Tables, kinds and nodes ─────────────────────────────────────────── */

describe('rows and kinds', () => {
  it('store each table’s rows in the kind that maps back to it', () => {
    for (const def of DEFS) {
      if (def.contentKind) {
        expect(TABLE_FOR_CONTENT_KIND[def.contentKind], def.id).toBe(def.id);
        expect(def.code, def.id).toBeUndefined();
      } else {
        // A code table says where its rows come from, and makes none.
        expect(def.code?.note, def.id).toBeTruthy();
        expect(def.create, def.id).toBeUndefined();
        expect(def.panel, def.id).toBe('code');
      }
    }
    for (const [kind, table] of Object.entries(TABLE_FOR_CONTENT_KIND)) {
      expect(TABLES[table].contentKind, kind).toBe(kind);
    }
  });

  it('give every node kind with a table its rows there', () => {
    for (const [kind, table] of Object.entries(TABLE_FOR_NODE_KIND)) {
      const { rows } = TABLES[table];
      expect([rows.kind, rows.more?.kind], kind).toContain(kind);
    }
    for (const def of DEFS) {
      expect(TABLE_FOR_NODE_KIND[def.rows.kind], def.id).toBe(def.id);
    }
  });
});
