import { describe, expect, it } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type { Edge } from '@/content/graph/types';
import {
  EDGES,
  fixtureGraph,
  fixtureInput,
} from '../../__tests__/tableFixtures';
import { buildTableModel, getTableModel } from '../../model/buildTableModel';
import { tableDef } from '../../model/categories';
import { queryRows } from '../../model/query';
import type { TableModel } from '../../model/types';
import { coverageEntries } from '../coverage';

/**
 * The coverage strip: how many listed rows state each stored column, and of
 * the rest how many show something that could become the value.
 */

const all = (model: TableModel) =>
  queryRows(model, {
    q: '',
    sort: model.def.defaultSort,
    filters: [],
    status: 'all',
    view: 'credited',
  });

const everyRow = (model: TableModel) =>
  Int32Array.from(model.rows.keys()).filter(
    (i) => model.rows[i].status !== 'archived',
  );

const OWNER = new Set(['title', 'born', 'city', 'genres', 'years']);

describe('coverageEntries', () => {
  it('counts stated values over the rows listed, in column order', () => {
    const model = getTableModel(fixtureInput(), 'artists');
    const entries = coverageEntries(model, everyRow(model), OWNER);
    expect(entries.map((e) => [e.label, e.filled, e.total])).toEqual([
      ['Born', 2, 5],
      ['City', 1, 5],
      ['Genres', 1, 5],
      ['Years Active', 2, 5],
    ]);
    // Clicking one lists the rows missing it.
    expect(entries.map((e) => e.filter)).toEqual([
      'missing-born',
      'missing-city',
      'missing-genres',
      'missing-years',
    ]);
    // A found-nowhere row (Lenny Castro, only named on a credit) is not
    // counted: there is no record to fill.
    expect(model.rows.some((r) => r.status === 'missing')).toBe(true);
  });

  it('follows the query: only the rows it lists', () => {
    const model = getTableModel(fixtureInput(), 'artists');
    const credited = all(model);
    const [born] = coverageEntries(model, credited, new Set(['born']));
    // Jeff Porcaro and David Paich; Lenny Castro is missing.
    expect([born.filled, born.total]).toEqual([1, 2]);
  });

  it('counts, apart, what could stand in for a missing value', () => {
    const model = getTableModel(fixtureInput(), 'artists');
    const [genres] = coverageEntries(
      model,
      everyRow(model),
      new Set(['genres']),
    );
    // Porcaro and Paich state no genres, but their songs are rock.
    expect(genres.standIns).toEqual([{ label: 'from songs', count: 2 }]);
    expect(genres.filled).toBe(1);
  });

  it('shows song pins beside a City nobody has stated', () => {
    // Where Jeff Porcaro's songs are pinned, as the song-pin deriver states it.
    const pin: Edge = {
      from: 'artist:jeff-porcaro',
      kind: 'based_in',
      to: 'place:hartford',
      via: { item: 'artist:jeff-porcaro', path: 'city' },
      inferred: true,
    };
    const graph = assembleGraph(fixtureGraph().nodes.values(), [...EDGES, pin]);
    const model = buildTableModel(
      { ...fixtureInput(), graph },
      tableDef('artists'),
    );
    const [city] = coverageEntries(model, everyRow(model), new Set(['city']));
    expect(city).toMatchObject({
      label: 'City',
      filled: 1,
      total: 5,
      standIns: [{ label: 'song pins', count: 1 }],
    });
  });

  it('has nothing to show for a table no row states', () => {
    const model = getTableModel(fixtureInput(), 'genres');
    expect(
      coverageEntries(model, everyRow(model), new Set(['artists'])),
    ).toEqual([]);
  });
});
