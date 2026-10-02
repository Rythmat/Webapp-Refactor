// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type { EntityId, GraphNode } from '@/content/graph/types';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import type {
  ContentItemDetail,
  SaveContentInput,
  SaveContentResult,
} from '@/hooks/data/admin/useAdminContent';
import {
  type ItemSession,
  useItemSession,
} from '../../../content/itemEditor/useItemSession';
import { ConfirmConnectionDialog } from '../../link/ConfirmConnectionDialog';
import { linkFor } from '../../link/links';
import { CellWriteProvider } from '../CellWriteProvider';
import { useCellWrites, useItemLock, usePanelDraft } from '../cellWriteContext';
import type { CellWrite, WriteQueue } from '../writeQueue';

/**
 * The cell writes against the offline mock's own server, through the page's
 * provider: what the server holds afterwards is the test. A song is read
 * whole before it is written, so a Year edit keeps its chart; a value
 * someone changed first is asked about; an editor's edit is a proposal,
 * and a proposal on the item stops the write; and the row panel on the
 * same item takes the edit into its unsaved changes, or waits on the same
 * lock to save its own, as Link… does.
 */

const who = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor',
  userId: 'admin-1',
}));
const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every PUT /items body, in order. */
  puts: [] as Record<string, unknown>[],
  /** Every GET of one item, in order. */
  reads: 0,
  /** Hold the next item read's answer (as it was when asked) until released. */
  holdNextRead: false,
  gates: [] as (() => void)[],
}));
const toasts = vi.hoisted(() => {
  const record = (tone: string) =>
    Object.assign(
      (title: string, options?: Record<string, unknown>) => {
        toasts.shown.push({ tone, title, options: options ?? {} });
      },
      { tone },
    );
  const toasts = {
    shown: [] as {
      tone: string;
      title: string;
      options: Record<string, unknown>;
    }[],
    toast: null as unknown,
  };
  toasts.toast = Object.assign(record('info'), {
    error: record('error'),
    warning: record('warning'),
  });
  return toasts;
});

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };
const EDITOR_2: MockViewer = { role: 'editor', userId: 'ed-2', name: 'Edna' };

vi.mock('sonner', () => ({ toast: toasts.toast }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    token: 'test',
    role: who.role,
    userId: who.userId,
  }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    capabilities: { kinds: [], features: {}, artifactsVersion: null },
    feature: (name: string) => ['export', 'lookup', 'create'].includes(name),
    isServed: () => true,
    isAuthoritative: () => false,
    identityOf: (kind: string) =>
      ['artist', 'release', 'studio', 'label'].includes(kind) ? 'slug' : 'id',
    schemaVersionOf: () => 2,
    songSchemaLevel: 2,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  const viewer = () => (who.role === 'admin' ? ADMIN : EDITOR);
  /** The mock server over the wire: copies in and out, as JSON would be. */
  const request = async (path: string, _token: string, init?: RequestInit) => {
    const url = new URL(path, 'http://mock');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.pathname === '/items' && method === 'PUT') net.puts.push(body);
    const oneItem =
      method === 'GET' && /^\/items\/(?!lookup$)[^/]+$/.test(url.pathname);
    if (oneItem) net.reads += 1;
    const response = net.server!.handle({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      viewer: viewer(),
    });
    const answer = structuredClone(response.body);
    if (oneItem && net.holdNextRead) {
      net.holdNextRead = false;
      await new Promise<void>((go) => net.gates.push(go));
    }
    if (response.status !== 200)
      throw new actual.ContentApiError(
        response.status,
        answer as Record<string, unknown>,
      );
    return answer;
  };
  const noop = () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMutation<unknown, Error, unknown>({ mutationFn: async () => null });
  return {
    ...actual,
    contentRequest: request,
    useContentItem: (id: string | undefined) =>
      useQuery<ContentItemDetail>({
        queryKey: [...actual.CONTENT_KEY, 'item', id],
        queryFn: () => request(`/items/${id}`, 'test') as never,
        enabled: !!id,
      }),
    useContentTemplate: () => ({ data: undefined, isLoading: false }),
    useSaveContentItem: () => {
      const client = useQueryClient();
      return useMutation<SaveContentResult, Error, SaveContentInput>({
        mutationFn: async (input) =>
          actual.unwrapSaveResponse(
            await request('/items', 'test', {
              method: 'PUT',
              body: JSON.stringify(input),
            }),
          ),
        onSuccess: () =>
          void client.invalidateQueries({ queryKey: actual.CONTENT_KEY }),
      });
    },
    useDeleteContentItem: noop,
    useApproveContentEdit: noop,
    useRejectContentEdit: noop,
    useDiscardContentEdit: noop,
  };
});

/** The song, as the repo has it: chart and all. */
let AFRICA: Record<string, unknown>;

let clock = 0;
beforeEach(async () => {
  const { africa } = await import('@/curriculum/data/songs/africa');
  AFRICA = JSON.parse(JSON.stringify(africa));
  who.role = 'admin';
  who.userId = 'admin-1';
  net.puts.length = 0;
  net.reads = 0;
  net.holdNextRead = false;
  net.gates.length = 0;
  toasts.shown.length = 0;
  net.server = createContentMockServer({
    seed: { items: [{ kind: 'song', slug: 'africa', body: AFRICA }] },
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
  });
});
afterEach(cleanup);

/* ── The server, directly ────────────────────────────────────────────── */

const idOf = (slug: string): string =>
  (
    net.server!.handle({
      method: 'GET',
      path: '/items/lookup',
      query: { kind: 'song', slug },
      viewer: ADMIN,
    }).body as { id: string }
  ).id;

/** The song as the server holds it now, as an admin reads it. */
const stored = (): ContentItemDetail =>
  net.server!.handle({
    method: 'GET',
    path: `/items/${idOf('africa')}`,
    query: {},
    viewer: ADMIN,
  }).body as ContentItemDetail;

/** Someone else's save of the song. */
const saveAs = (
  viewer: MockViewer,
  edit: (body: Record<string, unknown>) => Record<string, unknown>,
) => {
  const response = net.server!.handle({
    method: 'PUT',
    path: '/items',
    query: {},
    body: { kind: 'song', slug: 'africa', body: edit(stored().body) },
    viewer,
  });
  if (response.status !== 200)
    throw new Error(`setup save failed: ${JSON.stringify(response.body)}`);
};

/* ── The page ───────────────────────────────────────────────────────── */

const YEAR = { table: 'songs', rowKey: 'africa', column: 'year' };

const setYear = (value: number, seen = 1982): CellWrite => ({
  item: { kind: 'song', slug: 'africa', id: idOf('africa'), name: 'Africa' },
  ops: [{ op: 'set', path: 'year', value, seen }],
  cells: [{ ...YEAR, paths: ['year'], seen }],
  fields: ['Year'],
  summary: `Year of Africa: ${seen} → ${value}`,
});

/** What the page's children reach. */
const page = {
  queue: null as WriteQueue | null,
  session: null as ItemSession | null,
};

const Probe = () => {
  page.queue = useCellWrites();
  return null;
};

/** The row panel's part in it: an editing session on the song, as the Table's. */
const Panel = ({ id }: { id: string }) => {
  const withItemLock = useItemLock();
  const session = useItemSession({
    kind: 'song',
    itemId: id,
    lock: (run) => withItemLock('song:africa', run),
  });
  usePanelDraft('song:africa', session);
  page.session = session;
  return null;
};

function renderPage(children?: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CellWriteProvider>
          <Probe />
          {children}
        </CellWriteProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return page.queue!;
}

/** Commits and waits for every write to be done. */
async function commit(queue: WriteQueue, write: CellWrite) {
  await act(async () => {
    queue.commit(write);
    await queue.whenIdle();
  });
}

const lastToast = () => toasts.shown[toasts.shown.length - 1];

type Action = { label: string; onClick: () => void };

describe('cell writes against the mock server', () => {
  it('keeps a song’s chart when its Year is edited — the lean-export trap', async () => {
    const queue = renderPage();
    const sections = stored().body.sections;
    expect(Array.isArray(sections) && sections.length).toBeGreaterThan(0);

    await commit(queue, setYear(1983));
    const after = stored();
    expect(after.body.year).toBe(1983);
    expect(after.body.sections).toEqual(sections);
    expect(after.body.audioSources).toEqual(AFRICA.audioSources);
    expect(after.status).toBe('published');
    expect(net.puts).toHaveLength(1);
    expect(net.puts[0]).not.toHaveProperty('status');
    expect(net.puts[0].note).toBe('Edited in the Table: Year');
    expect(queue.store.get(YEAR)?.status).toBe('saved');

    // Its toast undoes it: the chart still there.
    expect(lastToast()).toMatchObject({
      tone: 'info',
      title: 'Year of Africa: 1982 → 1983',
    });
    const undo = lastToast().options.action as Action;
    expect(undo.label).toBe('Undo');
    await act(async () => {
      undo.onClick();
      await queue.whenIdle();
    });
    expect(stored().body.year).toBe(1982);
    expect(stored().body.sections).toEqual(sections);
    expect(lastToast().title).toBe('Undone: Year of Africa: 1982 → 1983');
  });

  it('asks when someone changed the value first: Use mine writes over it', async () => {
    const queue = renderPage();
    saveAs(ADMIN, (body) => ({ ...body, year: 1985 }));
    await commit(queue, setYear(1983));
    expect(net.puts).toHaveLength(0);
    expect(queue.store.get(YEAR)).toMatchObject({
      status: 'conflict',
      conflicts: [{ path: 'year', seen: 1982, now: 1985, mine: 1983 }],
    });
    expect(lastToast().tone).toBe('warning');
    const mine = lastToast().options.action as Action;
    expect(mine.label).toBe('Use mine');
    await act(async () => {
      mine.onClick();
      await queue.whenIdle();
    });
    expect(stored().body.year).toBe(1983);
    expect(stored().body.sections).toEqual(AFRICA.sections);
  });

  it('asks when someone changed the value first: Keep theirs leaves it', async () => {
    const queue = renderPage();
    saveAs(ADMIN, (body) => ({ ...body, year: 1985 }));
    await commit(queue, setYear(1983));
    const theirs = lastToast().options.cancel as Action;
    expect(theirs.label).toBe('Keep theirs');
    act(() => theirs.onClick());
    expect(queue.store.get(YEAR)).toBeUndefined();
    expect(queue.hasUnsaved()).toBe(false);
    expect(net.puts).toHaveLength(0);
    expect(stored().body.year).toBe(1985);
  });

  it('makes an editor’s edit a proposal: the live song is untouched', async () => {
    who.role = 'editor';
    who.userId = 'ed-1';
    const queue = renderPage();
    await commit(queue, setYear(1983));
    const after = stored();
    expect(after.body.year).toBe(1982);
    expect(after.editState).toBe('pending');
    expect(after.pendingById).toBe('ed-1');
    expect(after.pendingBody?.year).toBe(1983);
    expect(after.pendingBody?.sections).toEqual(AFRICA.sections);
    expect(queue.store.get(YEAR)?.status).toBe('proposed');
    expect(lastToast().title).toBe('Proposed: Year of Africa: 1982 → 1983');

    // A second edit builds on the proposal, not on the live song.
    await commit(queue, {
      ...setYear(1983),
      ops: [{ op: 'set', path: 'popularity', value: 60, seen: 50 }],
      cells: [{ ...YEAR, column: 'popularity', paths: ['popularity'] }],
      fields: ['Popularity'],
      summary: 'Popularity of Africa: 50 → 60',
    });
    expect(stored().pendingBody).toMatchObject({ year: 1983, popularity: 60 });
  });

  it('stops an editor’s edit while another editor’s proposal waits', async () => {
    saveAs(EDITOR_2, (body) => ({ ...body, popularity: 99 }));
    who.role = 'editor';
    who.userId = 'ed-1';
    const queue = renderPage();
    await commit(queue, setYear(1983));
    expect(net.puts).toHaveLength(0);
    expect(stored().pendingById).toBe('ed-2');
    expect(queue.store.get(YEAR)).toMatchObject({
      status: 'error',
      blocked: true,
    });
  });

  it('stops an admin’s edit while a proposal waits for review, and offers the row', async () => {
    saveAs(EDITOR_2, (body) => ({ ...body, popularity: 99 }));
    const queue = renderPage();
    await commit(queue, setYear(1983));
    expect(net.puts).toHaveLength(0);
    expect(stored().body.year).toBe(1982);
    expect(queue.store.get(YEAR)).toMatchObject({
      status: 'error',
      blocked: true,
      message: expect.stringMatching(/Review the pending proposal on Africa/),
    });
    expect(lastToast()).toMatchObject({ tone: 'error' });
    expect((lastToast().options.action as Action).label).toBe('Open row');
    expect(queue.hasUnsaved()).toBe(true);
  });

  it('lands a refused value’s reason on its cell, with Retry', async () => {
    const queue = renderPage();
    await commit(queue, {
      ...setYear(1983),
      ops: [{ op: 'set', path: 'year', value: 'nineteen', seen: 1982 }],
    });
    expect(net.puts).toHaveLength(1);
    expect(queue.store.get(YEAR)).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/year/i),
    });
    expect((lastToast().options.action as Action).label).toBe('Retry');
    expect(stored().body.year).toBe(1982);
  });
});

describe('the row panel and the cells on one item', () => {
  it('takes a cell’s edit into the panel’s unsaved changes, and its Save sends both', async () => {
    const id = idOf('africa');
    const queue = renderPage(<Panel id={id} />);
    await waitFor(() => expect(page.session?.body).toBeTruthy());
    act(() =>
      page.session!.applyBody({
        ...page.session!.body!,
        title: 'Africa (panel)',
      }),
    );
    expect(page.session!.dirty).toBe(true);

    act(() => {
      expect(queue.commit(setYear(1983))).toBeNull();
    });
    expect(net.puts).toHaveLength(0);
    expect(page.session!.body).toMatchObject({
      title: 'Africa (panel)',
      year: 1983,
    });
    expect(queue.store.get(YEAR)?.status).toBe('in-panel');
    // Held by the panel's own guard, not the queue's.
    expect(queue.hasUnsaved()).toBe(false);

    await act(async () => {
      await page.session!.save();
    });
    expect(net.puts).toHaveLength(1);
    expect(stored().body).toMatchObject({
      title: 'Africa (panel)',
      year: 1983,
    });
    expect(stored().body.sections).toEqual(AFRICA.sections);
    await waitFor(() => expect(queue.store.get(YEAR)?.status).toBe('saved'));
  });

  it('lets a cell write straight away past a clean panel, which re-seeds from it', async () => {
    const id = idOf('africa');
    const queue = renderPage(<Panel id={id} />);
    await waitFor(() => expect(page.session?.body).toBeTruthy());
    await commit(queue, setYear(1983));
    expect(net.puts).toHaveLength(1);
    await waitFor(() => expect(page.session!.body?.year).toBe(1983));
    expect(page.session!.dirty).toBe(false);
  });

  it('holds the panel’s save until a cell’s write to the item is done, then builds on it', async () => {
    const id = idOf('africa');
    const queue = renderPage(<Panel id={id} />);
    await waitFor(() => expect(page.session?.body).toBeTruthy());
    const readsBefore = net.reads;

    // The cell's write reads the song, and its answer is slow to come.
    net.holdNextRead = true;
    act(() => {
      queue.commit(setYear(1983));
    });
    await waitFor(() => expect(net.gates).toHaveLength(1));

    // Meanwhile the panel is edited and saved.
    act(() =>
      page.session!.applyBody({
        ...page.session!.body!,
        title: 'Africa (panel)',
      }),
    );
    let saving: Promise<unknown> = Promise.resolve();
    act(() => {
      saving = page.session!.save();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    // The panel has neither read the song again nor written it.
    expect(net.puts).toHaveLength(0);
    expect(net.reads).toBe(readsBefore + 1);

    await act(async () => {
      net.gates.shift()!();
      await queue.whenIdle();
      await saving;
    });
    expect(net.puts.map((put) => Object.keys(put).includes('body'))).toEqual([
      true,
      true,
    ]);
    // The cell's write first; the panel's save read it, and kept it.
    expect((net.puts[0].body as Record<string, unknown>).title).toBe('Africa');
    expect(net.puts[1].body).toMatchObject({
      title: 'Africa (panel)',
      year: 1983,
    });
    expect(stored().body).toMatchObject({
      title: 'Africa (panel)',
      year: 1983,
    });
  });
});

describe('Link… and the cells on one item', () => {
  const node = (id: EntityId, label: string): GraphNode => ({
    id,
    kind: id.slice(0, id.indexOf(':')) as GraphNode['kind'],
    label,
    status: 'published',
    origin: 'api',
  });
  const graph = assembleGraph(
    [
      node('studio:sunset-sound', 'Sunset Sound'),
      node('song:africa', 'Africa'),
    ],
    [],
  );

  it('holds Link…’s save until a cell’s write to its owner is done, then builds on it', async () => {
    const done = vi.fn();
    const queue = renderPage(
      <ConfirmConnectionDialog
        spec={linkFor('studios', 'songs')!}
        graph={graph}
        row={{
          key: 'sunset-sound',
          label: 'Sunset Sound',
          node: 'studio:sunset-sound',
        }}
        owner="africa"
        onDone={done}
        onClose={vi.fn()}
      />,
    );
    const dialog = () => screen.getByRole('dialog');
    const save = () => within(dialog()).getByRole('button', { name: 'Save' });
    await waitFor(
      () => expect(dialog().textContent).toMatch(/none → Sunset Sound/),
      { timeout: 10_000 },
    );
    await waitFor(() => expect(save()).toBeEnabled());

    // The cell's write to the song reads it, and its answer is slow.
    net.holdNextRead = true;
    act(() => {
      queue.commit(setYear(1983));
    });
    await waitFor(() => expect(net.gates).toHaveLength(1));
    const reads = net.reads;

    fireEvent.click(save());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    // Link… has neither read the song again nor written it.
    expect(net.puts).toHaveLength(0);
    expect(net.reads).toBe(reads);

    await act(async () => {
      net.gates.shift()!();
      await queue.whenIdle();
    });
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(net.puts).toHaveLength(2);
    expect(net.puts[1].note).toBe(
      'Linked in the Table: Sunset Sound → Africa session.studioId',
    );
    // Both stand: the year the cell wrote, the studio Link… wrote over it.
    const song = stored().body;
    expect(song.year).toBe(1983);
    expect(song.session).toMatchObject({ studioId: 'sunset-sound' });
    expect(song.sections).toEqual(AFRICA.sections);
  });
});
