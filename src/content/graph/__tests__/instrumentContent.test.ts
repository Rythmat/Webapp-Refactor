import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  edgesForGroove,
  edgesForLesson,
  edgesForPart,
} from '../deriveGraph';
import { CODE_OWNERS, isValidEdge, isWellFormed } from '../types';

/**
 * Instrument content in the graph: drum grooves, parts, feels, synth patches
 * and drum kits are code-owned nodes whose links are read from their own
 * fields, the way Teach days and pathways are.
 */

const edgeList = (edges: ReturnType<typeof edgesForPart>) =>
  edges.map((e) => `${e.kind} ${e.to}`).sort();

describe('a groove', () => {
  it('links its genre, style, instrument and kit', () => {
    const edges = edgesForGroove({
      id: 'groove_funk_02',
      name: 'Funk 02',
      genre: 'funk',
      style: 'Trap',
      instrument: 'drum-machine',
      kit: '808',
    });
    expect(edges.every(isValidEdge)).toBe(true);
    expect(edgeList(edges)).toEqual(
      expect.arrayContaining([
        'in_genre genre:funk',
        'plays_instrument instrument:drum-machine',
        'played_on kit:808',
      ]),
    );
    expect(edges.every((e) => e.via?.code === CODE_OWNERS.grooves)).toBe(true);
  });

  it('keeps its stored id verbatim, underscores and all', () => {
    expect(isWellFormed('groove:groove_funk_02')).toBe(true);
    expect(isWellFormed('groove:groove-rock-2')).toBe(true);
    expect(isWellFormed('groove:Bad Id')).toBe(false);
  });
});

describe('a part', () => {
  const part = {
    id: 'funk-l2-b3-am9',
    name: 'Funk L2 · B3 Am9 voicing',
    instrument: 'piano',
    genre: 'funk',
    key: 'a',
    mode: 'dorian',
    feel: 'samba-bahia',
    patch: 'drift',
    songId: 'superstition',
    artistIds: ['Stevie Wonder'],
    progressionIds: ['12'],
    lessonId: 'funk-l2',
  };

  it('links what it states, each edge valid', () => {
    const edges = edgesForPart(part);
    expect(edges.every(isValidEdge)).toBe(true);
    expect(edgeList(edges)).toEqual(
      [
        'excerpt_of song:superstition',
        'plays_instrument instrument:piano',
        'has_feel feel:samba-bahia',
        'in_genre genre:funk',
        'in_key key:a',
        'in_mode mode:dorian',
        'in_style_of artist:stevie-wonder',
        'played_on patch:drift',
        'taken_from lesson:funk-l2',
        'uses_progression progression:12',
      ].sort(),
    );
  });

  it('marks a chord match as a guess', () => {
    const match = edgesForPart(part).find((e) => e.kind === 'uses_progression');
    expect(match?.inferred).toBe(true);
  });

  it('becomes a node with its links in the built graph', () => {
    const graph = buildGraph({
      parts: [part],
      feels: [{ id: 'samba-bahia', name: 'Samba — Bahia' }],
      patches: [{ id: 'drift', name: 'DRIFT' }],
    });
    expect(graph.nodes.get('part:funk-l2-b3-am9')?.label).toBe(part.name);
    expect(graph.nodes.get('feel:samba-bahia')?.status).not.toBe('missing');
    expect(graph.nodes.get('patch:drift')?.label).toBe('DRIFT');
    expect(
      graph.adjacency
        .get('part:funk-l2-b3-am9')
        ?.some((e) => e.kind === 'has_feel'),
    ).toBe(true);
  });
});

describe('a lesson level', () => {
  it('plays over each of its grooves once', () => {
    const edges = edgesForLesson({
      id: 'funk-l2',
      name: 'Funk · L2',
      grooveIds: ['groove_funk_05', 'groove_funk_03', 'groove_funk_05', ''],
    });
    expect(edges.every(isValidEdge)).toBe(true);
    expect(edgeList(edges)).toEqual([
      'uses_groove groove:groove_funk_03',
      'uses_groove groove:groove_funk_05',
    ]);
    expect(isWellFormed('lesson:hiphop-l1')).toBe(true);
    expect(isWellFormed('lesson:hip-hop-l1')).toBe(false);
  });
});
