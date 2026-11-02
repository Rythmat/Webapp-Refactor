// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CortexWeb, WebLink, WebNode } from '../buildWeb';
import { cortexOrbit } from '../cortexOrbit';

const activity = (id: string, lastAt = 0, done = false): WebNode => ({
  id,
  role: 'activity',
  kind: 'song',
  label: id,
  done,
  hollow: false,
  lastAt,
  doneAt: 0,
});

const concept = (id: string, hollow = false): WebNode => ({
  id,
  role: 'concept',
  kind: 'genre',
  label: id,
  done: false,
  hollow,
  lastAt: 0,
  doneAt: 0,
});

const link = (source: string, target: string, hollow = false): WebLink => ({
  id: `${source}>${target}`,
  source,
  target,
  hollow,
});

const web = (nodes: WebNode[], links: WebLink[]): CortexWeb => ({
  nodes,
  links,
  activityCount: nodes.filter((n) => n.role === 'activity').length,
  connectionCount: links.filter((l) => !l.hollow).length,
});

const songs = (n: number) =>
  Array.from({ length: n }, (_, i) => activity(`song:${i}`, i));

const on = (orbit: ReturnType<typeof cortexOrbit>, ring: string) =>
  orbit.nodes.filter((n) => n.ring === ring).map((n) => n.id);

describe('cortexOrbit', () => {
  it('puts what connects most on the inner ring, promises last', () => {
    const w = web(
      [
        ...songs(3),
        concept('genre:small'),
        concept('genre:big'),
        concept('genre:new', true),
      ],
      [
        link('song:0', 'genre:big'),
        link('song:1', 'genre:big'),
        link('song:2', 'genre:big'),
        link('song:0', 'genre:small'),
        link('song:1', 'genre:small'),
        link('song:2', 'genre:new', true),
      ],
    );
    expect(on(cortexOrbit(w, null, { inner: 3, outer: 3 }), 'inner')).toEqual([
      'genre:big',
      'genre:small',
      'genre:new',
    ]);
  });

  it('puts the most recent on the outer ring and counts the rest', () => {
    const orbit = cortexOrbit(web(songs(10), []), null, {
      inner: 0,
      outer: 3,
    });
    expect(on(orbit, 'outer').sort()).toEqual(['song:7', 'song:8', 'song:9']);
    expect(orbit.overflow).toBe(7);
  });

  it('fills slots from nought without gaps', () => {
    const orbit = cortexOrbit(web(songs(2), []), null, { inner: 2, outer: 5 });
    expect(orbit.nodes.map((n) => n.slot).sort()).toEqual([0, 1]);
    expect(orbit.overflow).toBe(0);
  });

  it('marks finished as solid, unfinished as dim, promises as hollow', () => {
    const orbit = cortexOrbit(
      web(
        [activity('song:a', 1, true), activity('song:b'), concept('g', true)],
        [link('song:a', 'g', true)],
      ),
      null,
      { inner: 1, outer: 2 },
    );
    const emphasis = Object.fromEntries(
      orbit.nodes.map((n) => [n.id, n.emphasis]),
    );
    expect(emphasis).toEqual({
      'song:a': 'solid',
      'song:b': 'dim',
      g: 'hollow',
    });
  });

  it('brings a selection and its neighbours onto the rings', () => {
    const w = web(
      [...songs(10), concept('genre:funk')],
      [link('song:0', 'genre:funk'), link('song:1', 'genre:funk')],
    );
    const resting = cortexOrbit(w, null, { inner: 1, outer: 3 });
    expect(on(resting, 'outer')).not.toContain('song:0');
    const orbit = cortexOrbit(w, 'genre:funk', { inner: 1, outer: 3 });
    expect(on(orbit, 'outer')).toEqual(
      expect.arrayContaining(['song:0', 'song:1']),
    );
    expect(orbit.links.map((l) => l.id).sort()).toEqual([
      'song:0>genre:funk',
      'song:1>genre:funk',
    ]);
  });

  it('shows a selection that was off the rings', () => {
    const orbit = cortexOrbit(web(songs(10), []), 'song:0', {
      inner: 0,
      outer: 3,
    });
    expect(on(orbit, 'outer')).toContain('song:0');
    expect(on(orbit, 'outer')).toHaveLength(3);
  });

  it('caps neighbours at what a ring holds, keeping the selection', () => {
    const list = songs(20);
    const w = web(
      [...list, concept('genre:funk')],
      list.map((s) => link(s.id, 'genre:funk')),
    );
    const orbit = cortexOrbit(w, 'song:0', { inner: 1, outer: 4 });
    expect(on(orbit, 'outer')).toHaveLength(4);
    expect(on(orbit, 'outer')).toContain('song:0');
    expect(on(orbit, 'inner')).toEqual(['genre:funk']);
  });

  it('never shows a node twice, however the rings are squeezed', () => {
    const list = songs(6);
    const concepts = [concept('g:1'), concept('g:2'), concept('g:3')];
    const w = web(
      [...list, ...concepts],
      list.flatMap((s) => concepts.map((c) => link(s.id, c.id))),
    );
    for (const capacity of [
      { inner: 1, outer: 3 },
      { inner: 0, outer: 4 },
      { inner: 2, outer: 12 },
    ]) {
      for (const selected of [null, 'song:0', 'g:3']) {
        const ids = cortexOrbit(w, selected, capacity).nodes.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('mixes what connects into a single ring', () => {
    const orbit = cortexOrbit(
      web(
        [...songs(4), concept('genre:funk')],
        [link('song:0', 'genre:funk'), link('song:1', 'genre:funk')],
      ),
      null,
      { inner: 0, outer: 3 },
    );
    expect(on(orbit, 'outer')).toContain('genre:funk');
    expect(on(orbit, 'inner')).toEqual([]);
  });

  it('holds nothing when there is no room', () => {
    const orbit = cortexOrbit(web(songs(2), []), 'song:0', {
      inner: 0,
      outer: 0,
    });
    expect(orbit.nodes).toEqual([]);
    expect(orbit.overflow).toBe(2);
  });

  it('gives one picture for one web, whatever order it came in', () => {
    const list = songs(8);
    const forward = web(list, []);
    const backward = web([...list].reverse(), []);
    const capacity = { inner: 0, outer: 4 };
    expect(cortexOrbit(forward, null, capacity).nodes).toEqual(
      cortexOrbit(backward, null, capacity).nodes,
    );
  });

  it('moves nothing else when a selection arrives', () => {
    const w = web(
      [...songs(6), concept('g:1'), concept('g:2')],
      [
        link('song:5', 'g:1'),
        link('song:4', 'g:1'),
        link('song:3', 'g:2'),
        link('song:2', 'g:2'),
        link('song:0', 'g:2'),
      ],
    );
    const capacity = { inner: 2, outer: 4 };
    const before = cortexOrbit(w, null, capacity).nodes;
    const after = cortexOrbit(w, 'song:0', capacity).nodes;
    const place = (n: { ring: string; slot: number }) => `${n.ring}:${n.slot}`;
    const stayed = before.filter((n) => after.some((m) => m.id === n.id));
    for (const node of stayed) {
      expect(place(after.find((m) => m.id === node.id)!), node.id).toBe(
        place(node),
      );
    }
  });
});
