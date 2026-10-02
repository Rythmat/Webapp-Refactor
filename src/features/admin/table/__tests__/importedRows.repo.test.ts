import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildGraph } from '@/content/graph/deriveGraph';
import type { ExportRow } from '@/hooks/data/admin/useContentExport';
import { loadRepoSnapshot } from '../../content/graph/repoSnapshot';
import { mergeSnapshot } from '../../content/graph/workingSnapshot';
import { getTableModel, type TableInput } from '../model/buildTableModel';
import type { CellValue, TableModel, TableRow } from '../model/types';
import type { TableId } from '../tableIds';

/**
 * The records the bulk import makes show as rows of their tables, with
 * every field it gave them, as plain data: an artist off the globe roster,
 * a record, a label, a studio and a place the globe draws no pin for. They
 * live in `src/content/data/*.json`, which the repo snapshot reads (the
 * Table's "Repo snapshot" mode and the base of the working graph); here
 * those files hold one of each, as the import writes them. The working
 * graph (repo mode's, over the dev repo server's export) shows a record
 * only the export holds too.
 */

const PLACE = {
  id: 'zz-testville',
  name: 'Testville',
  country: 'Niger',
  subdivision: 'Tahoua',
  region: 'west-africa',
  coordinates: [15.46, 6.28],
  genres: [],
  description: '',
  activeDecades: [],
  pin: false,
};
const LABEL = {
  slug: 'zz-test-label',
  name: 'Test Label',
  foundedYear: 1970,
  defunctYear: 1990,
  placeId: 'zz-testville',
};
const STUDIO = {
  slug: 'zz-test-studio',
  name: 'Test Studio',
  placeId: 'zz-testville',
  openedYear: 1960,
  closedYear: 2000,
  coordinates: [34.1, -118.3],
};
const RELEASE = {
  slug: 'zz-test-record',
  title: 'Test Record',
  artistIds: ['zz-test-band'],
  format: 'album',
  year: 1982,
  catalogNumber: 'TR-1',
  labelId: 'zz-test-label',
};
const ARTIST = {
  slug: 'zz-test-band',
  name: 'The Test Band',
  group: true,
  born: { date: '1977', placeId: 'zz-testville' },
  basedInPlaceId: 'zz-testville',
  activeFrom: 1977,
  activeTo: 1990,
  genreIds: ['rock'],
  instrumentIds: ['electric-guitar'],
};

vi.mock('@/content/data/artists.json', () => ({ default: [ARTIST] }));
vi.mock('@/content/data/places.json', () => ({ default: [PLACE] }));
vi.mock('@/content/data/releases.json', () => ({ default: [RELEASE] }));
vi.mock('@/content/data/studios.json', () => ({ default: [STUDIO] }));
vi.mock('@/content/data/labels.json', () => ({ default: [LABEL] }));
// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list (as in buildTableModel.repo.test.ts).
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

let input: TableInput;

beforeAll(async () => {
  const snapshot = await loadRepoSnapshot();
  input = { graph: buildGraph(snapshot), snapshot };
}, 30_000);

const rowOf = (model: TableModel, key: string): TableRow => {
  const at = model.byKey.get(key);
  if (at === undefined) throw new Error(`${model.def.id} has no row ${key}`);
  return model.rows[at];
};

/** A cell as a line: a field's text, a connection's chip labels. */
function shown(cell: CellValue | undefined): string | undefined {
  switch (cell?.type) {
    case 'field':
      return cell.text;
    case 'connections':
    case 'credits':
      return cell.chips.map((chip) => chip.label).join(', ');
    case 'title':
      return [cell.label, cell.sublabel].filter(Boolean).join(' · ');
    default:
      return undefined;
  }
}

/** Each named column of a row, as shown. */
const cells = (
  input: TableInput,
  table: TableId,
  key: string,
  ids: string[],
) => {
  const row = rowOf(getTableModel(input, table), key);
  return Object.fromEntries(ids.map((id) => [id, shown(row.cells[id])]));
};

describe('the records the import makes, in the repo snapshot', () => {
  it('lists an artist off the roster with every field', () => {
    const row = rowOf(getTableModel(input, 'artists'), 'zz-test-band');
    expect(row.status).not.toBe('missing');
    expect(row.unverified).toBe(false);
    expect(
      cells(input, 'artists', 'zz-test-band', [
        'born',
        'city',
        'genres',
        'years',
        'instruments',
        'group',
        'records',
      ]),
    ).toEqual({
      born: 'Formed 1977 · Testville',
      city: 'Testville',
      genres: 'Rock',
      years: '1977–1990',
      instruments: 'Electric Guitar',
      group: 'Yes',
      records: 'Test Record',
    });
  });

  it('lists a record with its artist, year, label and format', () => {
    expect(
      cells(input, 'records', 'zz-test-record', [
        'title',
        'artist',
        'year',
        'label',
        'format',
        'catalog',
      ]),
    ).toEqual({
      // The sublabel names the format as the record editor does.
      title: 'Test Record · Album',
      artist: 'The Test Band',
      year: '1982',
      label: 'Test Label',
      format: 'album',
      catalog: 'TR-1',
    });
  });

  it('lists a label and a studio with their city and years', () => {
    expect(
      cells(input, 'labels', 'zz-test-label', ['city', 'years', 'records']),
    ).toEqual({
      city: 'Testville',
      years: '1970–1990',
      records: 'Test Record',
    });
    expect(
      cells(input, 'studios', 'zz-test-studio', [
        'city',
        'years',
        'coordinates',
      ]),
    ).toEqual({
      city: 'Testville',
      years: '1960–2000',
      coordinates: '34.10, -118.30',
    });
  });

  it('lists a place with no pin, with its country and state', () => {
    const values = cells(input, 'locations', 'zz-testville', [
      'title',
      'country',
      'subdivision',
      'coordinates',
    ]);
    expect(values.title).toMatch(/^Testville · .*No pin/);
    expect(values).toMatchObject({
      country: 'Niger',
      subdivision: 'Tahoua',
      coordinates: '15.46, 6.28',
    });
    // Where it is the artists' city and birthplace, and the label's and
    // studio's home.
    expect(
      cells(input, 'locations', 'zz-testville', [
        'artists',
        'studios',
        'labels',
      ]),
    ).toEqual({
      artists: 'The Test Band',
      studios: 'Test Studio',
      labels: 'Test Label',
    });
  });
});

describe('the records the import makes, in the working graph', () => {
  it('lists a record only the export holds', () => {
    const made = {
      ...RELEASE,
      slug: 'zz-exported-record',
      title: 'Exported Record',
    };
    const row: ExportRow = {
      id: 'db-exported',
      slug: made.slug,
      status: 'published',
      editState: null,
      updatedAt: new Date(0),
      body: made,
      revision: 1,
    };
    const { snapshot, items } = mergeSnapshot(
      input.snapshot!,
      new Map([['release', [row]]]),
      { isAuthoritative: () => false },
    );
    const working: TableInput = {
      graph: buildGraph(snapshot),
      snapshot,
      items,
    };
    expect(
      cells(working, 'records', 'zz-exported-record', [
        'artist',
        'year',
        'label',
      ]),
    ).toEqual({ artist: 'The Test Band', year: '1982', label: 'Test Label' });
    // The repo's own is still there beside it.
    expect(
      rowOf(getTableModel(working, 'records'), 'zz-test-record'),
    ).toBeDefined();
  });
});
