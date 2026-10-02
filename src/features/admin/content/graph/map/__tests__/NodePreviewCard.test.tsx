// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { EntityId, GraphEdge, GraphNode } from '@/content/graph/types';
import { NodePreviewCard, previewConnections } from '../NodePreviewCard';

/**
 * The Cmd-hover card over a hand-built neighbourhood of Toto: eight songs
 * (one guessed from the billing, one stated twice), a city it is marked
 * unconfirmed in, and a genre.
 */

const node = (
  id: string,
  label: string,
  status: GraphNode['status'] = 'published',
): GraphNode =>
  ({ id, kind: id.split(':')[0], label, status, origin: 'code' }) as GraphNode;

const edge = (
  from: string,
  kind: string,
  to: string,
  extra: Partial<GraphEdge> = {},
): GraphEdge =>
  ({ from, kind, to, via: [{ item: from, path: 'x' }], ...extra }) as GraphEdge;

const SONGS = [
  'Africa',
  'Rosanna',
  'Hold the Line',
  'Georgy Porgy',
  'Pamela',
  'Stop Loving You',
  'Waiting for Your Love',
];
const toto = node('artist:toto', 'Toto');
const nodes = new Map<EntityId, GraphNode>(
  [
    toto,
    ...SONGS.map((t) => node(`song:${t.toLowerCase().replace(/ /g, '-')}`, t)),
    node('place:los-angeles', 'Los Angeles'),
    node('genre:rock', 'Rock'),
  ].map((n) => [n.id, n]),
);
const songId = (t: string) => `song:${t.toLowerCase().replace(/ /g, '-')}`;
const edges: GraphEdge[] = [
  // Guessed from the billing: listed after everything stated.
  edge(songId('Africa'), 'performed_by', 'artist:toto', { inferred: true }),
  ...SONGS.slice(1).map((t) => edge(songId(t), 'performed_by', 'artist:toto')),
  // Stated twice: one line.
  edge(songId('Rosanna'), 'performed_by', 'artist:toto', {
    via: [{ item: songId('Rosanna') as EntityId, path: 'credits' }],
  }),
  edge('artist:toto', 'based_in', 'place:los-angeles', { unverified: true }),
  edge('artist:toto', 'in_genre', 'genre:rock'),
];

afterEach(cleanup);

describe('the preview card', () => {
  it('names the item, its kind, its status and its links', () => {
    render(<NodePreviewCard node={toto} edges={edges} nodes={nodes} />);
    const card = screen.getByRole('tooltip', { name: 'Preview of Toto' });
    expect(within(card).getByText('Toto')).toBeTruthy();
    expect(within(card).getByText('Artist')).toBeTruthy();
    expect(within(card).getByText('Published')).toBeTruthy();
    // Nine different items, though Rosanna is stated twice.
    expect(within(card).getByText('9 links')).toBeTruthy();
  });

  it('takes the graph’s own link count when it has one', () => {
    render(
      <NodePreviewCard node={toto} edges={edges} nodes={nodes} links={1} />,
    );
    expect(screen.getByText('1 link')).toBeTruthy();
  });

  it('lists five connections in the table’s words, stated ones first', () => {
    render(<NodePreviewCard node={toto} edges={edges} nodes={nodes} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toHaveLength(5);
    // The table's inverse wording for a song performed by Toto.
    expect(items[0]).toBe('performed Georgy Porgy');
    expect(items).not.toContain('performed Africa (guessed)');
    expect(screen.getByText('and 4 more')).toBeTruthy();
  });

  it('marks guessed and unconfirmed connections, and counts each once', () => {
    const rows = previewConnections('artist:toto', edges, nodes);
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.otherId === songId('Rosanna'))).toHaveLength(1);
    expect(rows.slice(-2).map((r) => [r.otherLabel, r.doubt])).toEqual([
      ['Africa', 'guessed'],
      ['Los Angeles', 'unconfirmed'],
    ]);
    // Stated: the songs first ("performed"), then the genre ("in").
    expect(rows.slice(0, 7).map((r) => r.wording)).toEqual([
      ...Array(6).fill('performed'),
      'in',
    ]);
  });

  it('says a missing item is missing', () => {
    render(
      <NodePreviewCard
        node={node('artist:nobody', 'Nobody', 'missing')}
        edges={[]}
        nodes={nodes}
      />,
    );
    expect(screen.getByText('Missing')).toBeTruthy();
    expect(screen.getByText('0 links')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('colours the dots as the graph’s groups do', () => {
    render(
      <NodePreviewCard
        node={toto}
        edges={edges}
        nodes={nodes}
        colorOf={(n) =>
          n.kind === 'artist' ? 'rgb(57, 135, 229)' : 'rgb(1, 2, 3)'
        }
      />,
    );
    const card = screen.getByRole('tooltip');
    const dots = card.querySelectorAll<HTMLElement>('span[aria-hidden]');
    expect(dots[0].style.background).toBe('rgb(57, 135, 229)');
    expect(
      card.querySelector<HTMLElement>('li span[aria-hidden]')?.style.background,
    ).toBe('rgb(1, 2, 3)');
  });

  it('sits beside the pointer, never taking it, and flips at the far edges', () => {
    const { rerender } = render(
      <NodePreviewCard
        node={toto}
        edges={edges}
        nodes={nodes}
        at={{ x: 100, y: 50 }}
        bounds={{ width: 1000, height: 800 }}
      />,
    );
    const card = screen.getByRole('tooltip');
    expect(card.className).toContain('pointer-events-none');
    expect(card.style.left).toBe('114px');
    expect(card.style.top).toBe('64px');

    rerender(
      <NodePreviewCard
        node={toto}
        edges={edges}
        nodes={nodes}
        at={{ x: 900, y: 750 }}
        bounds={{ width: 1000, height: 800 }}
      />,
    );
    expect(card.style.left).toBe('');
    expect(card.style.right).toBe('114px');
    expect(card.style.bottom).toBe('64px');
  });
});
