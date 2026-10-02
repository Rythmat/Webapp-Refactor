// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGraph } from '@/content/graph/deriveGraph';
import type { EntityId } from '@/content/graph/types';
import type { Song } from '@/curriculum/types/songLibrary';
import { buildTableModel } from '../../../table/model/buildTableModel';
import { TABLES } from '../../../table/model/categories';
import { EntitySearch } from '../EntitySearch';
import { GraphListView } from '../map/GraphListView';
import { NodePreviewCard } from '../map/NodePreviewCard';
import { NodeSummaryPanel } from '../map/NodeSummaryPanel';

/**
 * A person a song's credits name, with no artist record of their own, is a
 * grey "missing" dot. Everywhere Cortex names that dot it reads as the
 * credit prints the name ("Russ Kunkel"), not as its id's slug
 * (`russ-kunkel`): the hover card, Find, the List view, the summary beside
 * the graph and the row a click opens. A person no record prints a name for
 * at all reads as their slug in words.
 *
 * The graph is built from records here, as the console builds it, so the
 * names come the whole way from the credits.
 */

const song = (id: string, title: string, extra: Partial<Song> = {}) =>
  ({
    id,
    title,
    artist: 'Carole King',
    year: 1971,
    key: 'C',
    mode: 'major',
    ...extra,
  }) as unknown as Song;

const snapshot = {
  songs: [
    song('so_far_away', 'So Far Away', {
      credits: [
        { name: 'Russ Kunkel', role: 'performer', instrument: 'drum-kit' },
      ],
    } as Partial<Song>),
  ],
  artists: [
    { slug: 'carole-king', name: 'Carole King' },
    // A member no record names: only the id knows them.
    {
      slug: 'the-city',
      name: 'The City',
      members: [{ artistId: 'tal-herzberg' }],
    },
  ],
};

const graph = buildGraph(snapshot);
const RUSS = 'artist:russ-kunkel' as EntityId;
const TAL = 'artist:tal-herzberg' as EntityId;
const SONG = 'song:so_far_away' as EntityId;

afterEach(cleanup);

describe('a person known only from a credit', () => {
  it('is a missing dot labelled as the credit prints it', () => {
    expect(graph.nodes.get(RUSS)).toMatchObject({
      label: 'Russ Kunkel',
      status: 'missing',
    });
    expect(graph.nodes.get(TAL)).toMatchObject({
      label: 'Tal Herzberg',
      status: 'missing',
    });
  });

  it('reads so in the hover card, its own and its song’s', () => {
    const own = render(
      <NodePreviewCard
        node={graph.nodes.get(RUSS)!}
        edges={graph.adjacency.get(RUSS) ?? []}
        nodes={graph.nodes}
      />,
    );
    const card = screen.getByRole('tooltip', {
      name: 'Preview of Russ Kunkel',
    });
    expect(within(card).getByText('Missing')).toBeTruthy();
    expect(card.textContent).not.toContain('russ-kunkel');
    own.unmount();

    render(
      <NodePreviewCard
        node={graph.nodes.get(SONG)!}
        edges={graph.adjacency.get(SONG) ?? []}
        nodes={graph.nodes}
      />,
    );
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items.some((t) => t?.includes('Russ Kunkel'))).toBe(true);
    expect(items.join(' ')).not.toContain('russ-kunkel');
  });

  it('is found by the name as printed', () => {
    render(<EntitySearch nodes={graph.nodes} onPick={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'kunkel' },
    });
    expect(screen.getByRole('option', { name: /^Russ Kunkel/ })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'tal herz' },
    });
    expect(screen.getByRole('option', { name: /^Tal Herzberg/ })).toBeTruthy();
  });

  it('reads so in the List view, as the focus and as a connection', () => {
    const view = render(
      <MemoryRouter>
        <GraphListView graph={graph} focus={RUSS} onMakeCurrent={() => {}} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Connections of Russ Kunkel' }),
    ).toBeTruthy();
    view.unmount();

    render(
      <MemoryRouter>
        <GraphListView graph={graph} focus={SONG} onMakeCurrent={() => {}} />
      </MemoryRouter>,
    );
    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('button', { name: /Russ Kunkel/ }),
    ).toBeTruthy();
    expect(table.textContent).not.toContain('russ-kunkel');
  });

  it('reads so in the summary beside the graph', () => {
    render(
      <MemoryRouter>
        <NodeSummaryPanel
          nodeId={RUSS}
          graph={graph}
          onClose={() => {}}
          onLocalGraph={() => {}}
          onOpen={() => {}}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Russ Kunkel', level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Connections of Russ Kunkel' }),
    ).toBeTruthy();
  });

  it('heads the row a click opens in the Artists table', () => {
    const model = buildTableModel({ graph, snapshot }, TABLES.artists);
    const at = model.byKey.get('russ-kunkel');
    expect(at).toBeDefined();
    expect(model.rows[at!]).toMatchObject({
      label: 'Russ Kunkel',
      status: 'missing',
    });
  });
});
