import { describe, expect, it, vi } from 'vitest';
import { assembleGraph, type Graph } from '@/content/graph/deriveGraph';
import type {
  Edge,
  EntityId,
  EntityKind,
  GraphNode,
} from '@/content/graph/types';
import { walkContext } from '../model/aggregate';
import { getTableModel } from '../model/buildTableModel';
import { TABLES } from '../model/categories';
import {
  columnInFull,
  edgeGroupsOf,
  startsFor,
} from '../panel/fullConnections';
import { TABLE_IDS } from '../tableIds';
import { expectFullListsMatchCells } from './fullListsMatch';
import { fixtureInput } from './tableFixtures';

/**
 * The row panel's full lists (panel/fullConnections.ts): a column in full is
 * the grid's cell with nothing cut — the same nodes, each with the style,
 * part, weight and word its chip has — and every edge of the row is listed
 * once, grouped as the mind map reads it.
 *
 * Also pure, like model/*: the panel's walk may not bring React, the router
 * or the store with it.
 */

const { forbid } = vi.hoisted(() => ({
  forbid: (what: string) => () => {
    throw new Error(`the panel's walk loaded ${what}`);
  },
}));
vi.mock('react', forbid('React'));
vi.mock('react/jsx-runtime', forbid('React'));
vi.mock('react-router', forbid('the router'));
vi.mock('react-router-dom', forbid('the router'));
vi.mock('@/constants/routes', forbid('the route constants'));
vi.mock('@/content/contentStore', forbid('the content store'));
vi.mock('@/components/atlas/data/artists', forbid('the globe artist index'));
vi.mock('@/features/admin/content/kinds', forbid('the kind specs'));

describe('a column in full', () => {
  const input = fixtureInput();

  it.each(TABLE_IDS)('is the %s grid cells with nothing cut', (table) => {
    expectFullListsMatchCells(input, getTableModel(input, table));
  });

  it('files each node under the part that reached it most strongly', () => {
    const def = TABLES.artists;
    const column = def.columns.find((c) => c.id === 'events')!;
    if (column.source.type !== 'connections') throw new Error('events');
    const full = columnInFull(
      walkContext(input.graph),
      ['artist:toto'],
      column.source.parts,
    );
    // The Grammys state Toto by id; Live Aid only guesses it from a tag.
    expect(full.total).toBe(2);
    expect(full.parts).toHaveLength(1);
    expect(
      full.parts[0].entries.map((e) => [e.label, e.style, e.title]),
    ).toEqual([
      ['Toto sweeps the Grammys', 'solid', 'artistIds[]'],
      ['Live Aid', 'dotted', 'tags[]'],
    ]);
  });

  it('keeps a hint that nothing else reached, muted and last', () => {
    const def = TABLES.artists;
    const column = def.columns.find((c) => c.id === 'genres')!;
    if (column.source.type !== 'connections') throw new Error('genres');
    const full = columnInFull(
      walkContext(input.graph),
      ['artist:toto'],
      column.source.parts,
    );
    const byPart = Object.fromEntries(
      full.parts.map((p) => [p.id, p.entries.map((e) => [e.label, e.muted])]),
    );
    // Rock is stated (and its songs say so too); Pop only comes from songs
    // and events, so it is offered, not stated.
    expect(byPart.stated).toContainEqual(['Rock', false]);
    expect(Object.values(byPart).flat()).toContainEqual(['Pop', true]);
    expect(
      full.parts.every(
        (p) => p.role === 'hint' || p.entries.every((e) => !e.muted),
      ),
    ).toBe(true);
  });

  it('stands a genre on its subgenres, unless the column keeps to itself', () => {
    const graph = assembleGraph(
      [
        seed('genre:rock', 'Rock'),
        seed('subgenre:acid-rock', 'Acid Rock'),
        seed('song:x', 'X'),
      ],
      [
        link('subgenre:acid-rock', 'in_genre', 'genre:rock'),
        link('song:x', 'in_genre', 'subgenre:acid-rock'),
      ],
    );
    const def = TABLES.genres;
    const songs = def.columns.find((c) => c.id === 'songs')!.source;
    const parent = def.columns.find((c) => c.id === 'subgenres')!.source;
    expect(startsFor(graph, def, 'genre:rock', songs)).toEqual([
      'genre:rock',
      'subgenre:acid-rock',
    ]);
    expect(startsFor(graph, def, 'genre:rock', parent)).toEqual(['genre:rock']);
    // Only a genre row expands: a subgenre, or another table's row, does not.
    expect(startsFor(graph, def, 'subgenre:acid-rock', songs)).toEqual([
      'subgenre:acid-rock',
    ]);
    expect(startsFor(graph, TABLES.songs, 'song:x', songs)).toEqual(['song:x']);
  });
});

describe('every edge of a row', () => {
  it('groups them as the mind map reads them, strongest first', () => {
    const { graph } = fixtureInput();
    const groups = edgeGroupsOf(graph, 'artist:toto');
    const featured = groups.find((g) => g.label === 'featured in')!;
    expect(featured.forward).toBe(false);
    expect(featured.edges.map((e) => [e.label, e.style])).toEqual([
      ['Toto sweeps the Grammys', 'solid'],
      ['Live Aid', 'dotted'],
    ]);
    const based = groups.find((g) => g.label === 'based in')!;
    expect(based.forward).toBe(true);
    expect(based.edges.map((e) => e.other)).toEqual(['place:los-angeles']);
    // Every edge once, and in the map's arc order.
    expect(groups.reduce((n, g) => n + g.edges.length, 0)).toBe(
      (graph.adjacency.get('artist:toto') ?? []).length,
    );
    expect(groups.indexOf(based)).toBeLessThan(groups.indexOf(featured));
  });

  it('draws what is found nowhere hollow, whatever the edge', () => {
    const graph = assembleGraph(
      [seed('song:x', 'X'), seed('artist:ghost', 'ghost', 'missing')],
      [link('song:x', 'performed_by', 'artist:ghost')],
    );
    expect(
      edgeGroupsOf(graph, 'song:x').map((g) => [
        g.label,
        g.edges.map((e) => e.style),
      ]),
    ).toEqual([['performed by', ['hollow']]]);
  });

  it('has nothing for a node the graph does not hold', () => {
    const graph: Graph = fixtureInput().graph;
    expect(edgeGroupsOf(graph, 'artist:nobody')).toEqual([]);
  });
});

function seed(
  id: EntityId,
  label: string,
  status: GraphNode['status'] = 'code',
): GraphNode {
  return {
    id,
    kind: id.slice(0, id.indexOf(':')) as EntityKind,
    label,
    status,
    origin: 'code',
  };
}

function link(from: EntityId, kind: Edge['kind'], to: EntityId): Edge {
  return { from, kind, to, via: { item: from, path: 'test' } };
}
