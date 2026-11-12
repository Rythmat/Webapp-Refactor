import { describe, expect, it } from 'vitest';
import {
  engineModeName,
  KEY_CENTRE_RAINBOW,
  keyColourOf,
} from '@/daw/prism-engine/data/keyColour';
import type { Graph } from '../deriveGraph';
import {
  graphKeyColour,
  keyColourOfSlugs,
  tonicPitchClass,
} from '../keyColour';
import type { EntityId } from '../types';

const RED = '#d2404a'; // C
const INDIGO = '#7885cb'; // A♭

/** Just the adjacency `graphKeyColour` reads. */
const graphOf = (
  edges: { from: string; kind: string; to: string }[],
): Graph => {
  const adjacency = new Map<string, typeof edges>();
  for (const edge of edges) {
    for (const end of [edge.from, edge.to]) {
      adjacency.set(end, [...(adjacency.get(end) ?? []), edge]);
    }
  }
  return { adjacency } as unknown as Graph;
};

describe('a key’s colour', () => {
  it('is the key centre’s: C red, F minor A♭’s indigo', () => {
    expect(keyColourOf(0, 'ionian')).toBe(RED);
    expect(keyColourOf(5, 'aeolian')).toBe(INDIGO);
    expect(keyColourOfSlugs('c')).toBe(RED);
    expect(keyColourOfSlugs('f', 'minor')).toBe(INDIGO);
  });

  it('reads the ways the app writes a mode and a tonic', () => {
    expect(engineModeName('major')).toBe('ionian');
    expect(engineModeName('Minor')).toBe('aeolian');
    expect(engineModeName('harmonic-minor')).toBe('harmonicMinor');
    expect(engineModeName('not a mode')).toBeNull();
    expect(tonicPitchClass('d-flat')).toBe(1);
    expect(tonicPitchClass('b-sharp')).toBe(0);
    expect(tonicPitchClass('h')).toBeNull();
    expect(keyColourOfSlugs('nonsense')).toBeNull();
  });

  it('gives the twelve centres round the circle of fifths, C first', () => {
    expect(KEY_CENTRE_RAINBOW).toHaveLength(12);
    expect(KEY_CENTRE_RAINBOW[0]).toBe(RED);
    expect(KEY_CENTRE_RAINBOW[8]).toBe(INDIGO);
  });
});

describe('which graph dots wear one', () => {
  const graph = graphOf([
    { from: 'song:24k-magic', kind: 'in_key', to: 'key:f' },
    { from: 'song:24k-magic', kind: 'in_mode', to: 'mode:minor' },
    { from: 'song:24k-magic', kind: 'by', to: 'artist:bruno-mars' },
  ]);
  const colour = (id: string) => graphKeyColour(graph, id as EntityId);

  it('a key, in its own colour, and a song, in its key centre’s', () => {
    expect(colour('key:c')).toBe(RED);
    expect(colour('song:24k-magic')).toBe(INDIGO);
  });

  it('nothing without a key, so it stays white', () => {
    expect(colour('artist:bruno-mars')).toBeNull();
    expect(colour('mode:minor')).toBeNull();
  });
});
