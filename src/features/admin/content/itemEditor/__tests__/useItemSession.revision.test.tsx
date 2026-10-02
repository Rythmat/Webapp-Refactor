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
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ContentMockServer,
  createContentMockServer,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import type {
  ContentItemDetail,
  SaveContentInput,
  SaveContentResult,
} from '@/hooks/data/admin/useAdminContent';
import { PanelSaveBar } from '../../../table/panel/PanelSaveBar';
import { type ItemSession, useItemSession } from '../useItemSession';

/**
 * The item session's save against the offline mock's own server, over the
 * wire as the console sends it: the PUT carries the revision the draft is
 * laid on (`expectedRevision`, contract 5b), and a version saved between
 * the save's re-read and its write is refused (409 `REVISION_CONFLICT`)
 * and taken in the way a version seen before the save is: merged under the
 * draft and saved once more where nothing overlaps, and `stale`, with the
 * author choosing, where both changed a field. The row panel's save bar
 * offers only the statuses the store honours.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const OTHER: MockViewer = { role: 'admin', userId: 'admin-2', name: 'Bo' };

const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every PUT /items body, in order. */
  puts: [] as Record<string, unknown>[],
  /** Run once, just before the next PUT is handled: someone else's save. */
  beforePut: null as (() => void) | null,
  /** What `/capabilities` says of where saves land. */
  store: 'api' as 'api' | 'repo',
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'test', role: 'admin', userId: 'admin-1' }),
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
    store: net.store,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  /** The mock server over the wire: copies in and out, as JSON would be. */
  const request = async (path: string, init?: RequestInit) => {
    const url = new URL(path, 'http://mock');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.pathname === '/items' && method === 'PUT') {
      net.puts.push(body);
      const before = net.beforePut;
      net.beforePut = null;
      before?.();
    }
    const response = net.server!.handle({
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      viewer: ADMIN,
    });
    const answer = structuredClone(response.body);
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
    useContentItem: (id: string | undefined) =>
      useQuery<ContentItemDetail>({
        queryKey: [...actual.CONTENT_KEY, 'item', id],
        queryFn: () => request(`/items/${id}`) as never,
        enabled: !!id,
      }),
    useContentTemplate: () => ({ data: undefined, isLoading: false }),
    useSaveContentItem: () => {
      const client = useQueryClient();
      return useMutation<SaveContentResult, Error, SaveContentInput>({
        mutationFn: async (input) =>
          actual.unwrapSaveResponse(
            await request('/items', {
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

type Body = Record<string, unknown>;

let AFRICA: Body;
const STUDIO: Body = { slug: 'sunset-sound', name: 'Sunset Sound' };

let clock = 0;
beforeEach(async () => {
  const { africa } = await import('@/curriculum/data/songs/africa');
  AFRICA = JSON.parse(JSON.stringify(africa));
  net.puts.length = 0;
  net.beforePut = null;
  net.store = 'api';
  net.server = createContentMockServer({
    seed: {
      items: [
        { kind: 'song', slug: 'africa', body: AFRICA },
        { kind: 'studio', slug: 'sunset-sound', body: STUDIO },
      ],
    },
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
  });
});
afterEach(cleanup);

/* ── The server, directly ────────────────────────────────────────────── */

const idOf = (kind: string, slug: string): string =>
  (
    net.server!.handle({
      method: 'GET',
      path: '/items/lookup',
      query: { kind, slug },
      viewer: ADMIN,
    }).body as { id: string }
  ).id;

/** The item as the server holds it now. */
const stored = (kind = 'song', slug = 'africa'): ContentItemDetail =>
  net.server!.handle({
    method: 'GET',
    path: `/items/${idOf(kind, slug)}`,
    query: {},
    viewer: ADMIN,
  }).body as ContentItemDetail;

/** Someone else's save of the song, straight to the server. */
const saveAs = (viewer: MockViewer, edit: (body: Body) => Body) => {
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

/* ── The session ─────────────────────────────────────────────────────── */

const page = { session: null as ItemSession | null };

const Session = ({ kind, id }: { kind: 'song' | 'studio'; id: string }) => {
  const session = useItemSession({ kind, itemId: id });
  page.session = session;
  return <PanelSaveBar session={session} onShowField={() => undefined} />;
};

async function open(kind: 'song' | 'studio' = 'song', slug = 'africa') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Session kind={kind} id={idOf(kind, slug)} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(page.session?.body).toBeTruthy());
  return () => page.session!;
}

const edit = (session: () => ItemSession, patch: Body) =>
  act(() => session().applyBody({ ...session().body!, ...patch }));

async function save(session: () => ItemSession) {
  let result: Awaited<ReturnType<ItemSession['save']>> = null;
  await act(async () => {
    result = await session().save();
  });
  return result;
}

describe('a save’s revision', () => {
  it('sends the revision the draft is laid on, and the saved one next', async () => {
    const session = await open();
    const at = stored().revision!;
    expect(at).toBeGreaterThan(0);

    await edit(session, { year: 1983 });
    expect(await save(session)).not.toBeNull();
    await edit(session, { year: 1984 });
    expect(await save(session)).not.toBeNull();

    expect(net.puts.map((put) => put.expectedRevision)).toEqual([at, at + 1]);
    expect(stored()).toMatchObject({ revision: at + 2, body: { year: 1984 } });
  });

  it('on REVISION_CONFLICT, lays the draft on the version saved meanwhile and saves once more', async () => {
    const session = await open();
    const at = stored().revision!;
    expect(AFRICA.popularity).not.toBe(42);

    await edit(session, { year: 1983 });
    // Saved between the session's re-read and its write: another field.
    net.beforePut = () =>
      saveAs(OTHER, (body) => ({ ...body, popularity: 42 }));
    const saved = await save(session);

    expect(saved).not.toBeNull();
    // Refused at the old revision, then sent on the one it moved to.
    expect(net.puts.map((put) => put.expectedRevision)).toEqual([at, at + 1]);
    // Both changes stand: theirs was merged under the draft, not written over.
    expect(stored().body).toMatchObject({ year: 1983, popularity: 42 });
    expect(session().stale).toBeNull();
    expect(session().saveError).toBeNull();
    expect(session().dirty).toBe(false);
  });

  it('on REVISION_CONFLICT over the same field, shows it as changed elsewhere and writes nothing', async () => {
    const session = await open();
    const at = stored().revision!;

    await edit(session, { year: 1983 });
    net.beforePut = () => saveAs(OTHER, (body) => ({ ...body, year: 1990 }));
    expect(await save(session)).toBeNull();

    // One refused PUT; theirs stands.
    expect(net.puts).toHaveLength(1);
    expect(stored().body.year).toBe(1990);
    // The changed-elsewhere choice, not an error.
    expect(session().stale).toEqual({
      overlap: ['year'],
      theirs: ['year'],
    });
    expect(session().saveError).toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('This item changed since you opened it');
    expect(
      within(alert).getByRole('button', { name: 'Keep mine for it' }),
    ).toBeInTheDocument();

    // Keeping mine saves it over theirs, at the revision theirs is at.
    act(() => session().keepMine());
    expect(await save(session)).not.toBeNull();
    expect(net.puts.map((put) => put.expectedRevision)).toEqual([at, at + 1]);
    expect(stored().body.year).toBe(1983);
  });
});

describe('the save bar’s status, by store', () => {
  const options = () =>
    within(screen.getByRole('combobox', { name: 'Status' }))
      .getAllByRole('option')
      .map((option) => option.textContent);

  it('offers every status against the content API', async () => {
    await open();
    expect(options()).toEqual(['Draft', 'Published', 'Archived']);
  });

  it('offers a song Draft and Published in repo mode', async () => {
    net.store = 'repo';
    await open();
    expect(options()).toEqual(['Draft', 'Published']);
  });

  it('offers any other kind no status in repo mode, and sends none', async () => {
    net.store = 'repo';
    const session = await open('studio', 'sunset-sound');
    expect(screen.queryByRole('combobox', { name: 'Status' })).toBeNull();
    expect(screen.getByText('Saves to repo')).toBeInTheDocument();

    await edit(session, { name: 'Sunset Sound Recorders' });
    expect(await save(session)).not.toBeNull();
    expect(net.puts).toHaveLength(1);
    expect(net.puts[0]).not.toHaveProperty('status');
    expect(stored('studio', 'sunset-sound').body.name).toBe(
      'Sunset Sound Recorders',
    );
  });
});
