// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { assembleGraph } from '@/content/graph/deriveGraph';
import type { Edge, EntityId, GraphNode } from '@/content/graph/types';
import { seedBeforeImport } from '@/features/admin/content/mock/__tests__/seedBeforeImport';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import { loadSeed } from '@/features/admin/content/mock/seed';
import type { ContentItemDetail } from '@/hooks/data/admin/useAdminContent';
import { ConfirmConnectionDialog } from '../link/ConfirmConnectionDialog';
import { type LinkSpec, linkFor } from '../link/links';

/**
 * Link… and Confirm against the offline mock's own server: the dialog names
 * the owning item and field, re-reads it, shows the whole field as it will
 * be, and saves once — the item for an admin, a proposal for an editor —
 * having read it again just before; then refreshes once. What the server
 * holds afterwards is the test.
 */

const who = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor',
  userId: 'admin-1',
}));
const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every PUT /items body, in order. */
  puts: [] as Record<string, unknown>[],
}));

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

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
    schemaVersionOf: (kind: string) =>
      kind === 'song' || kind === 'globe_event' || kind === 'artist' ? 2 : 1,
    songSchemaLevel: 2,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/hooks/data/admin/useAdminContent')>();
  return {
    ...actual,
    contentRequest: async (
      path: string,
      _token: string,
      init?: RequestInit,
    ) => {
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
      if (response.status !== 200)
        throw new actual.ContentApiError(
          response.status,
          response.body as Record<string, unknown>,
        );
      return response.body;
    },
  };
});

// The dialog reads the owner's kind whole (its export) and the item, from
// a server holding the repo's every item: slower than a unit's default.
vi.setConfig({ testTimeout: 30_000 });

let seed: MockSeed;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which filled the
  // fields these tests link, unlink and accept into (seedBeforeImport.ts).
  seed = seedBeforeImport(await loadSeed('all'));
  // cmdk and Radix scroll things into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
}, 60_000);

let clock = 0;
beforeEach(() => {
  who.role = 'admin';
  who.userId = 'admin-1';
  net.puts.length = 0;
  net.server = createContentMockServer({
    seed,
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
  });
});
afterEach(cleanup);

/* ── A small graph over the mock's own items ─────────────────────────── */

const node = (id: EntityId, label: string): GraphNode => ({
  id,
  kind: id.slice(0, id.indexOf(':')) as GraphNode['kind'],
  label,
  status: 'published',
  origin: 'api',
});

const MOTOWN = 'evt-motown-detroit-1966';
const guessed = (to: EntityId): Edge => ({
  from: `event:${MOTOWN}`,
  kind: 'about',
  to,
  via: { item: `event:${MOTOWN}`, path: 'tags[]' },
  inferred: true,
});

const graph = assembleGraph(
  [
    node('artist:toto', 'Toto'),
    node('artist:marvin-gaye', 'Marvin Gaye'),
    node('artist:diana-ross', 'Diana Ross'),
    node('artist:the-temptations', 'The Temptations'),
    node('song:africa', 'Africa'),
    node('song:rosanna', 'Rosanna'),
    node('song:whats_going_on', 'What’s Going On'),
    node(`event:${MOTOWN}`, 'Motown Records hits its golden era'),
    node('studio:sunset-sound', 'Sunset Sound'),
    node('label:tamla', 'Tamla'),
    node(
      'progression:1',
      '1 major7 - 1 dominant7#5 - b2 major7 - b2 dominant7',
    ),
  ],
  [
    guessed('artist:marvin-gaye'),
    guessed('artist:diana-ross'),
    guessed('artist:the-temptations'),
    {
      from: 'song:africa',
      kind: 'performed_by',
      to: 'artist:toto',
      via: { item: 'song:africa', path: 'artist' },
      inferred: true,
    },
  ],
);

/** The item as the server holds it now, as an admin reads it. */
const stored = (kind: string, slug: string): ContentItemDetail => {
  const listed = net.server!.handle({
    method: 'GET',
    path: '/items/lookup',
    query: { kind, slug },
    viewer: ADMIN,
  }).body as { id: string };
  return net.server!.handle({
    method: 'GET',
    path: `/items/${listed.id}`,
    query: {},
    viewer: ADMIN,
  }).body as ContentItemDetail;
};

const spec = (table: string, column: string): LinkSpec =>
  linkFor(table as never, column)!;

const mount = ({
  link,
  row,
  owner,
  guesses,
}: {
  link: LinkSpec;
  row: { key: string; label: string };
  owner?: string;
  guesses?: string[];
}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const done = vi.fn();
  const close = vi.fn();
  const kind = link.table === 'artists' ? 'artist' : link.table.slice(0, -1);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConfirmConnectionDialog
          spec={link}
          graph={graph}
          row={{
            key: row.key,
            label: row.label,
            node: `${kind}:${row.key}` as EntityId,
          }}
          owner={owner}
          guessed={guesses}
          onDone={done}
          onClose={close}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate, done, close };
};

const dialog = () => screen.getByRole('dialog');
const saveButton = (name = 'Save') =>
  within(dialog()).getByRole('button', { name });

/** Wait for the owner's re-read, then its field as it will be. */
const ready = async (text: RegExp) => {
  await waitFor(() => expect(dialog().textContent).toMatch(text), {
    timeout: 10_000,
  });
  await waitFor(() =>
    expect(
      saveButton(who.role === 'editor' ? 'Submit for review' : 'Save'),
    ).toBeEnabled(),
  );
};

describe('Confirm: a guess stored on the item that guessed it', () => {
  it('writes the event’s whole artist list — the sure guesses kept, the doubtful left to tick — once', async () => {
    const { invalidate, done } = mount({
      link: spec('artists', 'events'),
      row: { key: 'marvin-gaye', label: 'Marvin Gaye' },
      owner: MOTOWN,
    });
    await ready(/artistIds, as it will be/);
    const box = (name: RegExp) =>
      within(dialog()).getByRole('checkbox', { name });
    // The row itself is fixed; a sure name is ticked; "The Temptations" is
    // one word after "The", so it waits for a person.
    expect(box(/Marvin Gaye/)).toBeChecked();
    expect(box(/Marvin Gaye/)).toBeDisabled();
    expect(box(/Diana Ross/)).toBeChecked();
    expect(box(/The Temptations/)).not.toBeChecked();
    expect(dialog().textContent).toContain('Nothing is stored yet');

    fireEvent.click(saveButton());
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('globe_event', MOTOWN).body.artistIds).toEqual([
      'marvin-gaye',
      'diana-ross',
    ]);
    // One save, one refresh.
    expect(net.puts).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toBe(
      'Linked: Motown Records hits its golden era · artistIds now names Marvin Gaye.',
    );
  });
});

describe('Link…: picking the owner', () => {
  it('writes an artist onto a song as its lead act, with a note in its history', async () => {
    const { done } = mount({
      link: spec('artists', 'songs'),
      row: { key: 'toto', label: 'Toto' },
      guesses: ['africa'],
    });
    // The guess is offered first; picking it reads the song.
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Africa' }));
    await ready(/none → Toto/);
    expect(
      within(dialog()).getByRole('radio', { name: /Its lead act/ }),
    ).toBeChecked();
    fireEvent.click(saveButton());
    await waitFor(() => expect(done).toHaveBeenCalled());
    const africa = stored('song', 'africa');
    expect(africa.body.origin).toEqual({ artistGlobeId: 'toto' });
    expect(africa.Revisions[0].note).toBe(
      'Linked in the Table: Toto → Africa origin.artistGlobeId',
    );
  });

  it('finds an owner by name, and says when it is not in the API to write', async () => {
    mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
    });
    const find = (text: string) =>
      fireEvent.change(within(dialog()).getByPlaceholderText(/^Find /), {
        target: { value: text },
      });
    // The graph has Rosanna; the server does not.
    find('rosan');
    fireEvent.click(
      await within(dialog()).findByRole('option', { name: /Rosanna/ }),
    );
    await waitFor(
      () =>
        expect(dialog().textContent).toContain(
          'Rosanna is not in the content API yet.',
        ),
      { timeout: 10_000 },
    );
    expect(saveButton()).toBeDisabled();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Change' }));
    find('going on');
    fireEvent.click(
      await within(dialog()).findByRole('option', { name: /Going On/ }),
    );
    await ready(/none → Sunset Sound/);
    // A session with no studio text takes the record's name (C20).
    expect(dialog().textContent).toContain(
      'Shown as “Sunset Sound” (session.studio).',
    );
  });
  it('adds a song to a progression’s list, which nothing guesses', async () => {
    const { done } = mount({
      link: spec('songs', 'progression'),
      row: { key: 'africa', label: 'Africa' },
      owner: '1',
    });
    await ready(/songIds, as it will be/);
    expect(dialog().textContent).not.toContain('Nothing is stored yet');
    expect(
      within(dialog()).getByRole('checkbox', {
        name: /Africa\s*new · this row/,
      }),
    ).toBeDisabled();
    fireEvent.click(saveButton());
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('chord_progression', '1').body.songIds).toEqual(['africa']);
  });
});

describe('who writes, and when not', () => {
  it('sends an editor’s link as a proposal, the live body untouched', async () => {
    who.role = 'editor';
    who.userId = 'ed-1';
    const { done } = mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
      owner: 'africa',
    });
    await ready(/none → Sunset Sound/);
    fireEvent.change(
      within(dialog()).getByLabelText('Note for the reviewer (optional)'),
      { target: { value: 'Recorded there' } },
    );
    fireEvent.click(saveButton('Submit for review'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const africa = stored('song', 'africa');
    expect(africa.editState).toBe('pending');
    expect(africa.pendingNote).toBe('Recorded there');
    expect(
      (africa.pendingBody?.session as Record<string, unknown>).studioId,
    ).toBe('sunset-sound');
    expect(
      (africa.body.session as Record<string, unknown>).studioId,
    ).toBeUndefined();
    expect(done.mock.calls[0][0]).toMatch(/^Sent for review: Africa/);
  });

  it('holds an admin’s link while a proposal waits on the item', async () => {
    who.role = 'editor';
    who.userId = 'ed-1';
    const africa = stored('song', 'africa');
    net.server!.handle({
      method: 'PUT',
      path: '/items',
      query: {},
      body: {
        kind: 'song',
        slug: 'africa',
        body: { ...africa.body, year: 1983 },
      },
      viewer: EDITOR,
    });
    who.role = 'admin';
    who.userId = 'admin-1';
    mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
      owner: 'africa',
    });
    expect(
      await within(dialog()).findByText(
        /Review the pending proposal on Africa first/,
        undefined,
        { timeout: 10_000 },
      ),
    ).toBeDefined();
    expect(saveButton()).toBeDisabled();
  });

  /** An editor's proposal on Africa, which an admin then sends back. */
  const sentBack = () => {
    const africa = stored('song', 'africa');
    net.server!.handle({
      method: 'PUT',
      path: '/items',
      query: {},
      body: {
        kind: 'song',
        slug: 'africa',
        body: { ...africa.body, year: 1983 },
      },
      viewer: EDITOR,
    });
    net.server!.handle({
      method: 'POST',
      path: `/items/${africa.id}/reject`,
      query: {},
      body: { note: 'Check the year' },
      viewer: ADMIN,
    });
  };

  it('holds an admin’s link while a proposal is sent back, not only while it waits', async () => {
    sentBack();
    mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
      owner: 'africa',
    });
    expect(
      await within(dialog()).findByText(
        /Africa has a proposal that was sent back/,
        undefined,
        { timeout: 10_000 },
      ),
    ).toBeDefined();
    expect(saveButton()).toBeDisabled();
  });

  it('says so when an editor’s link goes into their own sent-back proposal', async () => {
    sentBack();
    who.role = 'editor';
    who.userId = 'ed-1';
    mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
      owner: 'africa',
    });
    expect(
      await within(dialog()).findByText(
        /Your proposal on Africa was sent back: “Check the year”. This goes into it, and sends it for review again./,
        undefined,
        { timeout: 10_000 },
      ),
    ).toBeDefined();
  });

  it('writes nothing when the field moved while the dialog was open', async () => {
    const { done } = mount({
      link: spec('studios', 'songs'),
      row: { key: 'sunset-sound', label: 'Sunset Sound' },
      owner: 'africa',
    });
    await ready(/none → Sunset Sound/);
    // Someone else links another studio meanwhile.
    const africa = stored('song', 'africa');
    net.server!.handle({
      method: 'PUT',
      path: '/items',
      query: {},
      body: {
        kind: 'song',
        slug: 'africa',
        body: {
          ...africa.body,
          session: {
            ...(africa.body.session as object),
            studioId: 'abbey-road-studios',
          },
        },
      },
      viewer: ADMIN,
    });
    const before = net.puts.length;
    fireEvent.click(saveButton());
    expect(
      await within(dialog()).findByText(/changed while this was open/),
    ).toBeDefined();
    expect(net.puts).toHaveLength(before);
    expect(done).not.toHaveBeenCalled();
    expect(
      (stored('song', 'africa').body.session as Record<string, unknown>)
        .studioId,
    ).toBe('abbey-road-studios');
  });
});
