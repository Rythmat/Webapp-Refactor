// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EntityId, GraphEdge, GraphNode } from '@/content/graph/types';
import {
  GraphListView,
  type GraphListViewProps,
  listSubject,
} from '../GraphListView';

/**
 * The List view over a five-node graph built by hand: Toto, two of its
 * songs (one only guessed from the billing), a key and a city.
 */

const node = (id: string, label: string): GraphNode =>
  ({
    id,
    kind: id.split(':')[0],
    label,
    status: 'published',
    origin: 'code',
  }) as GraphNode;

const edge = (
  from: string,
  kind: string,
  to: string,
  extra: Partial<GraphEdge> = {},
): GraphEdge =>
  ({
    from,
    kind,
    to,
    via: [{ item: from, path: 'credits' }],
    ...extra,
  }) as GraphEdge;

const nodes = new Map<EntityId, GraphNode>(
  [
    node('artist:toto', 'Toto'),
    node('song:africa', 'Africa'),
    node('song:rosanna', 'Rosanna'),
    node('key:b', 'B'),
    node('place:los-angeles', 'Los Angeles'),
  ].map((n) => [n.id, n]),
);
const edges = [
  edge('song:africa', 'performed_by', 'artist:toto', { inferred: true }),
  edge('song:rosanna', 'performed_by', 'artist:toto'),
  edge('artist:toto', 'based_in', 'place:los-angeles', { unverified: true }),
  edge('song:africa', 'in_key', 'key:b'),
];
const adjacency = new Map<EntityId, GraphEdge[]>();
for (const e of edges) {
  for (const end of [e.from, e.to]) {
    adjacency.set(end, [...(adjacency.get(end) ?? []), e]);
  }
}
const graph = { nodes, adjacency };

const show = (props: Partial<GraphListViewProps> = {}) => {
  const onMakeCurrent = vi.fn();
  const view = render(
    <MemoryRouter>
      <GraphListView graph={graph} onMakeCurrent={onMakeCurrent} {...props} />
    </MemoryRouter>,
  );
  return { ...view, onMakeCurrent };
};

afterEach(cleanup);

describe('the List view', () => {
  it('lists the current item, else the selection, else the focus', () => {
    const { rerender } = show({ focus: 'artist:toto' });
    expect(
      screen.getByRole('heading', { name: 'Connections of Toto' }),
    ).toBeTruthy();
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.slice(1).map((r) => r.textContent)).toEqual([
      expect.stringContaining('Africa'),
      expect.stringContaining('Rosanna'),
      expect.stringContaining('Los Angeles'),
    ]);

    const again = (props: Partial<GraphListViewProps>) =>
      rerender(
        <MemoryRouter>
          <GraphListView graph={graph} onMakeCurrent={() => {}} {...props} />
        </MemoryRouter>,
      );
    again({ focus: 'artist:toto', selected: 'song:africa' });
    expect(screen.getByRole('heading').textContent).toBe(
      'Connections of Africa',
    );
    again({
      focus: 'artist:toto',
      selected: 'song:africa',
      current: 'key:b',
    });
    expect(screen.getByRole('heading').textContent).toBe('Connections of B');
  });

  it('is a region named by its heading, which a skip link can land on', () => {
    show({ focus: 'artist:toto', headingId: 'graph-list' });
    const region = screen.getByRole('region', { name: 'Connections of Toto' });
    const heading = within(region).getByRole('heading');
    expect(heading.id).toBe('graph-list');
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('folds a song’s globe event onto the song', () => {
    expect(listSubject(null, null, 'event:song-africa')).toBe('song:africa');
    show({ focus: 'event:song-africa' });
    expect(screen.getByRole('heading').textContent).toBe(
      'Connections of Africa',
    );
  });

  it('makes the item a "To" names current', () => {
    const { onMakeCurrent } = show({ focus: 'artist:toto' });
    const table = screen.getByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Rosanna/ }));
    expect(onMakeCurrent).toHaveBeenCalledWith('song:rosanna');
  });

  it('lands on the next item’s heading once a "To" moves the list on', () => {
    const Walk = () => {
      const [current, setCurrent] = useState<string | null>(null);
      return (
        <MemoryRouter>
          <GraphListView
            graph={graph}
            focus="artist:toto"
            current={current}
            onMakeCurrent={setCurrent}
          />
        </MemoryRouter>
      );
    };
    render(<Walk />);
    const table = screen.getByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /Rosanna/ }));
    const heading = screen.getByRole('heading', {
      name: 'Connections of Rosanna',
    });
    expect(document.activeElement).toBe(heading);
  });

  it('lists only what the graph’s filters show', () => {
    show({ focus: 'artist:toto', edgeOk: (e) => !e.inferred && !e.unverified });
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.slice(1).map((r) => r.textContent)).toEqual([
      expect.stringContaining('Rosanna'),
    ]);
  });

  it('colours each dot as the graph’s groups do', () => {
    const colorOf = vi.fn((n: { id: string; kind: string }) =>
      n.kind === 'song' ? 'rgb(238, 236, 248)' : 'rgb(57, 135, 229)',
    );
    show({ focus: 'artist:toto', colorOf });
    const table = screen.getByRole('table');
    const dot = within(table)
      .getByRole('button', { name: /Rosanna/ })
      .querySelector('span[aria-hidden]') as HTMLElement;
    expect(dot.style.background).toBe('rgb(238, 236, 248)');
    expect(colorOf).toHaveBeenCalledWith({
      id: 'song:rosanna',
      kind: 'song',
    });
  });

  it('says what to do with nothing chosen, and when the item is not there', () => {
    show();
    expect(screen.getByRole('heading').textContent).toBe('Connections');
    expect(screen.getByText(/Nothing is chosen yet/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    cleanup();

    show({ focus: 'artist:nobody' });
    expect(screen.getByText(/Nothing in the graph is called/)).toBeTruthy();
  });
});
