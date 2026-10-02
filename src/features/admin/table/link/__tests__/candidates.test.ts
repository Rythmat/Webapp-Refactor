import { describe, expect, it } from 'vitest';
import { fixtureGraph } from '../../__tests__/tableFixtures';
import { candidatesOf } from '../candidates';

/**
 * The items a Link… can write, as picker entries: built once per graph and
 * kind, since a picker over every song would otherwise walk them all again
 * on each open.
 */

describe('candidatesOf', () => {
  it('lists the kind’s nodes, found somewhere, with a second line', () => {
    const graph = fixtureGraph();
    const artists = candidatesOf(graph, 'artist').map((e) => e.slug);
    expect(artists).toContain('toto');
    // Named by a credit, found nowhere: nothing to write.
    expect(graph.nodes.get('artist:lenny-castro')?.status).toBe('missing');
    expect(artists).not.toContain('lenny-castro');

    const rosanna = candidatesOf(graph, 'song').find(
      (e) => e.slug === 'rosanna',
    );
    expect(rosanna).toMatchObject({
      id: 'song:rosanna',
      kind: 'song',
      name: 'Rosanna',
      source: 'repo',
      hint: 'Toto',
    });
    const liveAid = candidatesOf(graph, 'event').find(
      (e) => e.slug === 'evt-live-aid',
    );
    expect(liveAid?.hint).toBe('1985');
  });

  it('is built once per graph and kind', () => {
    const graph = fixtureGraph();
    expect(candidatesOf(graph, 'artist')).toBe(candidatesOf(graph, 'artist'));
    expect(candidatesOf(graph, 'song')).not.toBe(candidatesOf(graph, 'artist'));
    // A rebuilt graph is a new object: its own entries.
    expect(candidatesOf(fixtureGraph(), 'artist')).not.toBe(
      candidatesOf(graph, 'artist'),
    );
  });
});
