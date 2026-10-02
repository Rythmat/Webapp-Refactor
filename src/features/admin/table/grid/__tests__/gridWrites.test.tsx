// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useMemo, useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import type { ContentItemDetail } from '@/hooks/data/admin/useAdminContent';
import { fixtureInput, ITEMS, SONGS } from '../../__tests__/tableFixtures';
import { CellWriteProvider } from '../../edit/CellWriteProvider';
import { useGridEditing } from '../../edit/useGridEditing';
import { getTableModel, type TableInput } from '../../model/buildTableModel';
import { TableGrid } from '../TableGrid';

/**
 * The grid's keys through the page's own writes (`CellWriteProvider`, the
 * write queue) into the offline mock's server: what the server holds
 * afterwards is the test. A Year typed into its cell and saved with Enter
 * is one PUT of the song read whole — its chart kept, no status sent —
 * shown in the cell meanwhile, toasted, said in the grid's live region,
 * and undone by ⌘Z with another write. An editor's edit is a proposal.
 * An edit rests on what its cell held when the editor opened: rows rebuilt
 * under it with someone else's value are not taken for what the author saw.
 */

const who = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'editor' }));
const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every PUT /items body, in order. */
  puts: [] as Record<string, unknown>[],
}));
const toasts = vi.hoisted(() => {
  const shown: { title: string }[] = [];
  const record = (title: string) => {
    shown.push({ title });
  };
  return {
    shown,
    toast: Object.assign(record, { error: record, warning: record }),
  };
});

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

vi.mock('sonner', () => ({ toast: toasts.toast }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    token: 'test',
    role: who.role,
    userId: who.role === 'admin' ? 'admin-1' : 'ed-1',
  }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    capabilities: { kinds: [], features: {}, artifactsVersion: null },
    feature: (name: string) => ['export', 'lookup', 'create'].includes(name),
    isServed: () => true,
    isAuthoritative: () => false,
    identityOf: () => 'id',
    schemaVersionOf: () => 2,
    songSchemaLevel: 2,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  /** The mock server over the wire: copies in and out, as JSON would be. */
  const request = async (path: string, _token: string, init?: RequestInit) => {
    const url = new URL(path, 'http://mock');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.pathname === '/items' && method === 'PUT') net.puts.push(body);
    const response = net.server!.handle({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      viewer: who.role === 'admin' ? ADMIN : EDITOR,
    });
    const answer = structuredClone(response.body);
    if (response.status !== 200)
      throw new actual.ContentApiError(
        response.status,
        answer as Record<string, unknown>,
      );
    return answer;
  };
  return { ...actual, contentRequest: request };
});

beforeEach(async () => {
  const { africa } = await import('@/curriculum/data/songs/africa');
  who.role = 'admin';
  net.puts.length = 0;
  toasts.shown.length = 0;
  let clock = 0;
  net.server = createContentMockServer({
    seed: {
      items: [
        {
          kind: 'song',
          slug: 'africa',
          body: JSON.parse(JSON.stringify(africa)),
        },
      ],
    },
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
  });
});
afterEach(cleanup);

/** The song as the server holds it now, as an admin reads it. */
const stored = (): ContentItemDetail => {
  const { id } = net.server!.handle({
    method: 'GET',
    path: '/items/lookup',
    query: { kind: 'song', slug: 'africa' },
    viewer: ADMIN,
  }).body as { id: string };
  return net.server!.handle({
    method: 'GET',
    path: `/items/${id}`,
    query: {},
    viewer: ADMIN,
  }).body as ContentItemDetail;
};

/** Rebuilds the page's rows, as a refresh after someone's save would. */
const page = { rebuild: (_input: TableInput) => {} };

/** The songs table as the page draws it, over the fixture's (lean) rows. */
const Page = () => {
  const [input, setInput] = useState<TableInput>(() => fixtureInput());
  page.rebuild = (next) => act(() => setInput(next));
  const model = useMemo(() => getTableModel(input, 'songs'), [input]);
  const [keep, setKeep] = useState<ReadonlySet<string>>(new Set());
  const edits = useGridEditing({
    def: model.def,
    mode: 'working',
    onEdited: (key) => setKeep((prev) => new Set(prev).add(key)),
  });
  return (
    <TableGrid
      model={model}
      keep={keep}
      edits={edits}
      height={400}
      width={2400}
    />
  );
};

const mount = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/console/table/:table/:row?',
        element: (
          <CellWriteProvider>
            <Page />
          </CellWriteProvider>
        ),
      },
    ],
    { initialEntries: ['/console/table/songs'] },
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

/** Africa's Year cell. */
const yearCell = () => {
  const index = screen
    .getAllByRole('columnheader')
    .findIndex((header) => header.firstChild?.textContent === 'Year');
  const row = screen
    .getAllByRole('row')
    .find((r) => r.getAttribute('data-row') === 'africa')!;
  return within(row).getAllByRole('gridcell')[index];
};

/**
 * Another admin saves Africa's year, and the page's rows are rebuilt with
 * it (as its refresh would bring it).
 */
const theirYear = (year: number) => {
  const { id } = net.server!.handle({
    method: 'GET',
    path: '/items/lookup',
    query: { kind: 'song', slug: 'africa' },
    viewer: ADMIN,
  }).body as { id: string };
  const saved = net.server!.handle({
    method: 'PUT',
    path: '/items',
    query: {},
    body: { kind: 'song', slug: 'africa', body: { ...stored().body, year } },
    viewer: { ...ADMIN, userId: 'admin-2', name: 'Bo' },
  });
  expect(saved.status).toBe(200);
  const africa = SONGS.find((song) => song.id === 'africa')!;
  page.rebuild(
    fixtureInput({
      items: new Map([
        ...ITEMS,
        [
          'song:africa',
          {
            id,
            status: 'published',
            editState: null,
            body: { ...africa, year },
          },
        ],
      ]),
    }),
  );
};

/** Types a year into Africa's cell and saves it with Enter. */
const typeYear = async (year: string) => {
  const cell = yearCell();
  fireEvent.click(cell);
  fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
  const box = await screen.findByRole('textbox', { name: 'Year, Africa' });
  expect(box).toHaveValue('1982');
  fireEvent.change(box, { target: { value: year } });
  fireEvent.keyDown(box, { key: 'Enter' });
};

describe('a cell edited in the grid', () => {
  it('is written whole to the server, shown meanwhile, said, and undone with ⌘Z', async () => {
    mount();
    const sections = (stored().body.sections as unknown[]).length;
    expect(sections).toBeGreaterThan(0);
    await typeYear('1983');
    // Shown at once, before the server has answered or the rows rebuilt.
    expect(yearCell()).toHaveTextContent('1983');
    await waitFor(() => expect(net.puts).toHaveLength(1));
    const [put] = net.puts;
    expect(put).toMatchObject({ kind: 'song', slug: 'africa' });
    expect(put).not.toHaveProperty('status');
    expect(put.note).toBe('Edited in the Table: Year');
    // The song was read whole: its chart is still there.
    const written = stored().body;
    expect(written.year).toBe(1983);
    expect((written.sections as unknown[]).length).toBe(sections);
    await waitFor(() =>
      expect(toasts.shown.map((t) => t.title)).toContain(
        'Year of Africa: 1982 → 1983',
      ),
    );
    const [, polite] = document.querySelectorAll('[aria-live="polite"]');
    expect(polite).toHaveTextContent('Saved: Year of Africa: 1982 → 1983');

    // The grid has the keyboard back: ⌘Z undoes the table's last edit.
    const grid = screen.getByRole('grid');
    expect(grid).toHaveFocus();
    act(() => {
      fireEvent.keyDown(grid, { key: 'z', metaKey: true });
    });
    await waitFor(() => expect(net.puts).toHaveLength(2));
    await waitFor(() => expect(stored().body.year).toBe(1982));
    await waitFor(() =>
      expect(polite).toHaveTextContent('Undone: Year of Africa: 1982 → 1983'),
    );
  });

  it('writes nothing back over a value someone saved while its editor was open', async () => {
    mount();
    fireEvent.click(yearCell());
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
    const box = await screen.findByRole('textbox', { name: 'Year, Africa' });
    expect(box).toHaveValue('1982');
    // Another admin saves 1983, and the rows are rebuilt under the editor.
    theirYear(1983);
    expect(box).toHaveValue('1982');
    // Enter to move on, nothing typed: nothing is sent, theirs stays.
    fireEvent.keyDown(box, { key: 'Enter' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(net.puts).toHaveLength(0);
    expect(stored().body.year).toBe(1983);
    expect(yearCell()).toHaveTextContent('1983');
  });

  it('asks, rather than writing over it, when the author changed it too', async () => {
    mount();
    fireEvent.click(yearCell());
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Enter' });
    const box = await screen.findByRole('textbox', { name: 'Year, Africa' });
    theirYear(1983);
    fireEvent.change(box, { target: { value: '1984' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() =>
      expect(yearCell()).toHaveTextContent(
        'not saved: Changed since you looked (year)',
      ),
    );
    expect(net.puts).toHaveLength(0);
    expect(stored().body.year).toBe(1983);
  });

  it('is a proposal when an editor makes it', async () => {
    who.role = 'editor';
    mount();
    await typeYear('1984');
    await waitFor(() => expect(net.puts).toHaveLength(1));
    const after = stored();
    // The live song is untouched; the editor's body waits for review.
    expect(after.body.year).toBe(1982);
    expect(after.pendingBody?.year).toBe(1984);
    await waitFor(() =>
      expect(toasts.shown.map((t) => t.title)).toContain(
        'Proposed: Year of Africa: 1982 → 1984',
      ),
    );
  });
});
