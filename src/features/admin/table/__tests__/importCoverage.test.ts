import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROVENANCE_KEYS } from '@/content/suggestions/apply';
import { isExternalIdPath } from '@/content/suggestions/status';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { recordEditorFor } from '../../content/recordEditors';
import { TABLES } from '../model/categories';
import { columnForPath } from '../model/ghosts';
import type { ColumnDef, TableDef } from '../model/types';
import { TABLE_FOR_CONTENT_KIND } from '../tableIds';

/**
 * Everything the bulk import writes shows in the Table (owner, 30 Sep 2026:
 * "Update the table as well with all the import information"), as plain
 * data: every field it fills has a column, default or behind the Columns
 * menu, or a field in the row panel's Details. The import's writable paths
 * are pinned here, and checked against the importer's own artifacts and the
 * last run's report where those are on disk, so a field the import starts
 * writing fails here until the Table shows it.
 *
 * Outside ids are never written (the site names no outside catalogue), and
 * neither is where a value came from (`PROVENANCE_KEYS`): those are left
 * out of the paths.
 */

/**
 * What the import writes into items, by content kind, as a path with its
 * indices folded (`credits[]`). The importer's rows and the app's Stage-1
 * rows (event artists, songs and places; artists' birthplaces and cities;
 * song years; progression songs) fill fields of existing items; the records
 * it makes first (artists off the roster, records, labels, studios, places
 * without a pin) arrive whole, with these fields.
 */
const IMPORTED: Readonly<Partial<Record<ContentKind, readonly string[]>>> = {
  artist: [
    'name',
    'group',
    'born.date',
    'born.placeId',
    'basedInPlaceId',
    'activeFrom',
    'activeTo',
    'genreIds[]',
    'instrumentIds[]',
  ],
  song: ['credits[]', 'releases[]', 'session.studioId', 'year'],
  release: ['title', 'artistIds', 'format', 'year', 'catalogNumber', 'labelId'],
  label: ['name', 'foundedYear', 'defunctYear', 'placeId'],
  studio: ['name', 'placeId', 'openedYear', 'closedYear', 'coordinates'],
  globe_city: [
    'name',
    'country',
    'subdivision',
    'region',
    'coordinates',
    'genres',
    'description',
    'activeDecades',
    'pin',
  ],
  globe_event: ['artistIds', 'songIds', 'placeId'],
  chord_progression: ['songIds[]'],
};

/** Every role a credit can name: each has a column of its own. */
const CREDIT_ROLES: readonly CreditRole[] = [
  'songwriter',
  'producer',
  'performer',
  'vocals',
  'engineer',
  'arranger',
  'conductor',
];

/** A path with its indices folded, as `IMPORTED` spells it. */
const folded = (path: string) => path.replace(/\[\d+\]/g, '[]');
/** A path with no indices or `[]` at all, for comparing two spellings. */
const bare = (path: string) => path.replace(/\[\d*\]/g, '');

/** The identity field each kind's record is keyed by: not a value shown. */
const IDENTITY = new Set(['slug', 'id']);

const ROOT = process.cwd();
const ARTIFACTS = resolve(ROOT, 'src/scripts/enrichment/suggestions');
const REPORT = resolve(ROOT, 'src/scripts/enrichment/_repo-import-report.json');

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(file, 'utf8'));

/** The table a content kind's rows are in. */
function tableOf(kind: ContentKind): TableDef {
  const id = TABLE_FOR_CONTENT_KIND[kind];
  if (!id) throw new Error(`no table for ${kind}`);
  return TABLES[id];
}

/** Does this column edit the path, as the title or as any other column? */
const edits = (column: ColumnDef, path: string): boolean =>
  column.edit.by === 'row' &&
  [column.edit.path, ...(column.edit.also ?? [])].some(
    (edited) => bare(edited) === bare(path),
  );

/**
 * Where the Table shows an imported field: the column a suggestion for it
 * belongs in (a credit's by its role), the title for a record's name, or
 * the panel's Details, by the record editor's keys.
 */
function shownAt(
  kind: ContentKind,
  path: string,
  value?: unknown,
): { column: ColumnDef } | { panel: string } | null {
  const def = tableOf(kind);
  const column =
    columnForPath(def, path, value) ??
    (edits(def.columns[0], path) ? def.columns[0] : undefined);
  if (column) return { column };
  const key = bare(path).split('.')[0];
  return recordEditorFor(kind)?.keys.includes(key) ? { panel: key } : null;
}

describe('every imported field', () => {
  it('has a column, or a field in the row panel', () => {
    const lost: string[] = [];
    for (const [kind, paths] of Object.entries(IMPORTED)) {
      for (const path of paths ?? []) {
        if (!shownAt(kind as ContentKind, path)) lost.push(`${kind} ${path}`);
      }
    }
    expect(lost).toEqual([]);
  });

  it('shows the fields of existing items in columns, not only in the panel', () => {
    // A filled-in field is what the owner looks for across rows: the
    // importer's and the app's rows each land in a column.
    const FILLED: readonly [ContentKind, string][] = [
      ['artist', 'group'],
      ['artist', 'born.date'],
      ['artist', 'born.placeId'],
      ['artist', 'basedInPlaceId'],
      ['artist', 'activeFrom'],
      ['artist', 'activeTo'],
      ['artist', 'genreIds[]'],
      ['artist', 'instrumentIds[]'],
      ['song', 'credits[]'],
      ['song', 'releases[]'],
      ['song', 'session.studioId'],
      ['song', 'year'],
      ['release', 'labelId'],
      ['globe_event', 'artistIds'],
      ['globe_event', 'songIds'],
      ['globe_event', 'placeId'],
      ['chord_progression', 'songIds[]'],
    ];
    const at = FILLED.map(([kind, path]) => {
      const found = shownAt(kind, path);
      return `${kind} ${path} → ${found && 'column' in found ? found.column.label : 'none'}`;
    });
    expect(at).toEqual([
      'artist group → Group',
      'artist born.date → Born',
      'artist born.placeId → Born',
      'artist basedInPlaceId → City',
      'artist activeFrom → Years Active',
      'artist activeTo → Years Active',
      'artist genreIds[] → Genres',
      'artist instrumentIds[] → Instruments',
      'song credits[] → Credits',
      'song releases[] → Album',
      'song session.studioId → Studio',
      'song year → Year',
      'release labelId → Label',
      'globe_event artistIds → Artists',
      'globe_event songIds → Songs',
      'globe_event placeId → Place',
      'chord_progression songIds[] → Songs',
    ]);
  });

  it('shows a record the import makes with every field it holds', () => {
    const at = (kind: ContentKind) =>
      (IMPORTED[kind] ?? []).map((path) => {
        const found = shownAt(kind, path);
        return found && 'column' in found
          ? found.column.label
          : `panel:${found?.panel}`;
      });
    expect(at('release')).toEqual([
      'Record',
      'Artist',
      'Format',
      'Year',
      'Catalog #',
      'Label',
    ]);
    expect(at('label')).toEqual(['Label', 'Years', 'Years', 'City']);
    expect(at('studio')).toEqual([
      'Studio',
      'City',
      'Years',
      'Years',
      'Coordinates',
    ]);
    expect(at('globe_city')).toEqual([
      'Location',
      'Country',
      'State or province',
      'Region',
      'Coordinates',
      'Genre',
      // A new place's description is empty, and its `pin: false` is the
      // row's "No pin": both are the panel's.
      'panel:description',
      'Scene decades',
      'panel:pin',
    ]);
  });

  it('puts each credit in the column of its role', () => {
    const songs = TABLES.songs;
    const placed = CREDIT_ROLES.map((role) => {
      const column = columnForPath(songs, 'credits[]', { name: 'X', role });
      const roles = column?.edit.by === 'row' ? column.edit.roles : undefined;
      expect(roles, role).toContain(role);
      return `${role} → ${column?.label}`;
    });
    expect(placed).toEqual([
      'songwriter → Composers',
      'producer → Producer',
      'performer → Performers',
      'vocals → Vocals',
      'engineer → Engineer',
      'arranger → Arranger',
      'conductor → Conductor',
    ]);
    // And Credits, by default, lists every role's.
    const credits = songs.columns.find((c) => c.id === 'credits');
    expect(credits).toMatchObject({
      defaultVisible: true,
      source: { type: 'credits', path: 'credits' },
    });
    expect(credits?.source).not.toHaveProperty('roles');
  });

  it('adds only opt-in columns: the owner’s defaults are as he set them', () => {
    const added: readonly [string, string][] = [
      ['artists', 'group'],
      ['songs', 'performers'],
      ['songs', 'vocals'],
      ['songs', 'engineer'],
      ['songs', 'arranger'],
      ['songs', 'conductor'],
      ['locations', 'country'],
      ['locations', 'subdivision'],
      ['studios', 'coordinates'],
    ];
    for (const [table, id] of added) {
      const column = TABLES[table as keyof typeof TABLES].columns.find(
        (c) => c.id === id,
      );
      expect(column, `${table}.${id}`).toBeDefined();
      expect(column?.defaultVisible, `${table}.${id}`).toBe(false);
      expect(column?.owner, `${table}.${id}`).toBeUndefined();
    }
  });
});

/* ── The pinned paths, against what the import really writes ─────────── */

interface ArtifactRow {
  target: { kind: string };
  path: string;
  op: string;
  value?: unknown;
}

const SUGGESTION_FILES = ['artists.json', 'songs.json'];

/** The created records' artifacts, by the content kind they make. */
const CREATED_FILES: readonly [ContentKind, string, string][] = [
  ['artist', 'artists-created.json', 'artists'],
  ['release', 'releases.json', 'releases'],
  ['label', 'labels.json', 'labels'],
  ['studio', 'studios.json', 'studios'],
  ['globe_city', 'places.json', 'places'],
];

const hasArtifacts = SUGGESTION_FILES.every((file) =>
  existsSync(resolve(ARTIFACTS, file)),
);

describe.skipIf(!hasArtifacts)('the importer’s artifacts', () => {
  const pinned = (kind: string, path: string) =>
    (IMPORTED[kind as ContentKind] ?? []).includes(folded(path));

  it('write no field the paths above leave out', () => {
    const unpinned = new Set<string>();
    const roles = new Set<string>();
    for (const file of SUGGESTION_FILES) {
      const { suggestions } = readJson(resolve(ARTIFACTS, file)) as {
        suggestions: ArtifactRow[];
      };
      for (const row of suggestions) {
        if (isExternalIdPath(row.path)) continue;
        if (!pinned(row.target.kind, row.path))
          unpinned.add(`${row.target.kind} ${folded(row.path)}`);
        const value = row.value as { role?: unknown } | undefined;
        if (folded(row.path) === 'credits[]' && typeof value?.role === 'string')
          roles.add(value.role);
      }
    }
    expect([...unpinned]).toEqual([]);
    // Every role it credits has its column (CREDIT_ROLES, above).
    for (const role of roles) expect(CREDIT_ROLES).toContain(role);
  });

  it('make records with no field the paths above leave out', () => {
    const unpinned = new Set<string>();
    for (const [kind, file, list] of CREATED_FILES) {
      if (!existsSync(resolve(ARTIFACTS, file))) continue;
      const records = (
        readJson(resolve(ARTIFACTS, file)) as Record<
          string,
          { body: Record<string, unknown> }[]
        >
      )[list];
      for (const { body } of records) {
        for (const key of Object.keys(body)) {
          if (IDENTITY.has(key) || PROVENANCE_KEYS.includes(key)) continue;
          if (!pinned(kind, key)) unpinned.add(`${kind} ${key}`);
        }
      }
    }
    expect([...unpinned]).toEqual([]);
  });
});

describe.skipIf(!existsSync(REPORT))('the last import run’s report', () => {
  it('imported no field the paths above leave out', () => {
    const report = readJson(REPORT) as {
      imported?: { byField?: Record<string, number> };
    };
    const unpinned = Object.keys(report.imported?.byField ?? {})
      // "artist genreIds[] sure": kind, field, tier.
      .map((key) => key.split(' ').slice(0, 2) as [string, string])
      .filter(
        ([kind, path]) =>
          !isExternalIdPath(path) &&
          !(IMPORTED[kind as ContentKind] ?? []).includes(path),
      )
      .map(([kind, path]) => `${kind} ${path}`);
    expect([...new Set(unpinned)]).toEqual([]);
  });
});
