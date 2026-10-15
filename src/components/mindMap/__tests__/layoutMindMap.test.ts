import { describe, expect, it } from 'vitest';
import type { MindMapBoard, MindMapNode } from '@/content/graph/mindMapBoard';
import type { EntityId } from '@/content/graph/types';
import { edgeLabelSpots, layoutMindMap } from '../MindMapView';

const node = (
  id: string,
  kind: 'artist' | 'place' | 'song',
  label: string,
): MindMapNode => ({
  id: id as EntityId,
  kind,
  label,
  stop: { artist: label },
});

const BOARD: MindMapBoard = {
  focus: 'artist:ana-lux' as EntityId,
  goal: 5,
  nodes: [
    node('artist:ana-lux', 'artist', 'Ana Lux'),
    node('song:night-drive', 'song', 'Night Drive'),
    node('song:sunrise', 'song', 'Sunrise'),
    node('place:motor-city', 'place', 'Motor City'),
    node('artist:ben-ray', 'artist', 'Ben Ray'),
    node('song:long', 'song', 'A Song With A Very Long Name Indeed'),
  ],
  edges: [
    { from: 'song:night-drive', to: 'artist:ana-lux', kind: 'performed_by' },
    { from: 'song:night-drive', to: 'artist:ana-lux', kind: 'written_by' },
    { from: 'song:sunrise', to: 'artist:ana-lux', kind: 'performed_by' },
    { from: 'artist:ana-lux', to: 'place:motor-city', kind: 'born_in' },
    { from: 'artist:ben-ray', to: 'place:motor-city', kind: 'based_in' },
    { from: 'song:long', to: 'artist:ana-lux', kind: 'performed_by' },
  ] as MindMapBoard['edges'],
};

const ADDED = [
  'song:night-drive',
  'song:sunrise',
  'place:motor-city',
  'artist:ben-ray',
  'song:long',
] as EntityId[];

describe('layoutMindMap', () => {
  const W = 328;
  const H = 260;
  const { placed, edges, lines } = layoutMindMap(BOARD, ADDED, W, H);

  it('keeps every node inside the picture, with room for its name below', () => {
    for (const { x, y } of placed.values()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + 15 + 19).toBeLessThanOrEqual(H);
    }
  });

  it('spreads a single ring across the width, not into a small circle', () => {
    const oneRing = layoutMindMap(
      BOARD,
      ADDED.filter((id) => id !== 'artist:ben-ray'),
      W,
      H,
    );
    const ring = [...oneRing.placed.values()].filter((p) => p.depth === 1);
    const xs = ring.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(W / 2);
  });

  it('puts the next step out on an outer ring', () => {
    const ben = placed.get('artist:ben-ray' as EntityId)!;
    const city = placed.get('place:motor-city' as EntityId)!;
    expect(ben.depth).toBe(2);
    expect(city.depth).toBe(1);
  });

  it('draws one line for two connections between the same pair', () => {
    expect(edges).toHaveLength(6);
    expect(lines).toHaveLength(5);
    const drive = lines.find((l) => l.other.node.id === 'song:night-drive');
    expect(drive?.reader.node.id).toBe('artist:ana-lux');
    expect(drive?.label).toBe('performed · wrote');
  });

  it('counts the wordings that do not fit on one line', () => {
    const busy: MindMapBoard = {
      ...BOARD,
      edges: [
        ...BOARD.edges,
        { from: 'song:night-drive', to: 'artist:ana-lux', kind: 'produced_by' },
      ] as MindMapBoard['edges'],
    };
    const drive = layoutMindMap(busy, ADDED, W, H).lines.find(
      (l) => l.other.node.id === 'song:night-drive',
    );
    expect(drive?.label).toBe('performed +2');
  });
});

describe('edgeLabelSpots', () => {
  it.each([
    [328, 260, 0],
    [576, 360, 3],
  ])(
    'at %ix%i, labels lines only where a pill covers nothing else',
    (W, H, least) => {
      const { placed, lines } = layoutMindMap(BOARD, ADDED, W, H);
      const spots = edgeLabelSpots(placed, lines, W);
      expect(spots.size).toBeGreaterThanOrEqual(least);
      const boxes = [...spots].map(([key, { x, y }]) => {
        const label = lines.find((l) => l.key === key)!.label;
        const half = (label.length * 6.6 + 10) / 2;
        return { x0: x - half, x1: x + half, y0: y - 9, y1: y + 9 };
      });
      for (const [i, a] of boxes.entries()) {
        expect(a.x0).toBeGreaterThanOrEqual(0);
        expect(a.x1).toBeLessThanOrEqual(W);
        for (const b of boxes.slice(i + 1))
          expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(
            false,
          );
        for (const { x, y } of placed.values())
          expect(
            x > a.x0 - 15 && x < a.x1 + 15 && y > a.y0 - 15 && y < a.y1 + 15,
          ).toBe(false);
      }
    },
  );

  it('labels the one line of a map with one connection', () => {
    const { placed, lines } = layoutMindMap(
      BOARD,
      ['place:motor-city' as EntityId],
      328,
      260,
    );
    expect(lines).toHaveLength(1);
    expect(edgeLabelSpots(placed, lines, 328).has(lines[0].key)).toBe(true);
  });

  it('gives the room to the lines tried first', () => {
    const { placed, lines } = layoutMindMap(BOARD, ADDED, 328, 260);
    const spots = edgeLabelSpots(placed, lines, 328);
    const reversed = edgeLabelSpots(placed, [...lines].reverse(), 328);
    const firstLabelled = lines.find((l) => spots.has(l.key))!;
    const lastLabelled = [...lines].reverse().find((l) => reversed.has(l.key))!;
    expect(lines.indexOf(firstLabelled)).toBeLessThanOrEqual(
      lines.indexOf(lastLabelled),
    );
  });
});
