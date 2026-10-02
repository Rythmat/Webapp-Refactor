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
import { assembleGraph, type Graph } from '@/content/graph/deriveGraph';
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
import { ConfirmConnectionDialog } from '../ConfirmConnectionDialog';
import { type LinkSpec, linkFor } from '../links';

/**
 * Unlink, and Link… on the links added with it, against the offline mock's
 * own server: the dialog re-reads the owner, shows the whole field as it
 * will be — the row taken out, the ways it goes, the text that goes with it
 * or will guess it back — and saves once. What the server holds afterwards
 * is the test.
 */

const who = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor',
  userId: 'admin-1',
}));
const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every PUT /items body the dialog sent, in order. */
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

const NODES: readonly GraphNode[] = [
  node('artist:toto', 'Toto'),
  node('artist:marvin-gaye', 'Marvin Gaye'),
  node('artist:diana-ross', 'Diana Ross'),
  node('artist:the-temptations', 'The Temptations'),
  node('song:africa', 'Africa'),
  node(`event:${MOTOWN}`, 'Motown Records hits its golden era'),
  node('studio:sunset-sound', 'Sunset Sound'),
  node('place:detroit', 'Detroit'),
  node('place:los-angeles', 'Los Angeles'),
  node('genre:funk', 'Funk'),
  node('genre:classical', 'Classical'),
];

const GUESSES: readonly Edge[] = [
  guessed('artist:marvin-gaye'),
  guessed('artist:diana-ross'),
  guessed('artist:the-temptations'),
];

const graph = assembleGraph(NODES, GUESSES);

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

/** Someone else's save before the dialog opens: the item's body, changed. */
const change = (
  kind: string,
  slug: string,
  edit: (body: Record<string, unknown>) => Record<string, unknown>,
) => {
  const response = net.server!.handle({
    method: 'PUT',
    path: '/items',
    query: {},
    body: { kind, slug, body: edit(stored(kind, slug).body) },
    viewer: ADMIN,
  });
  if (response.status !== 200)
    throw new Error(`setup PUT refused: ${JSON.stringify(response.body)}`);
};

const spec = (table: string, column: string): LinkSpec =>
  linkFor(table as never, column)!;

const mount = ({
  link,
  row,
  owner,
  mode,
  on = graph,
}: {
  link: LinkSpec;
  row: { key: string; label: string; node: EntityId };
  owner?: string;
  mode?: 'link' | 'unlink';
  on?: Graph;
}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const done = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConfirmConnectionDialog
          spec={link}
          graph={on}
          row={row}
          mode={mode}
          owner={owner}
          onDone={done}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate, done };
};

const dialog = () => screen.getByRole('dialog');
const button = (name: string) => within(dialog()).getByRole('button', { name });
const box = (name: RegExp) => within(dialog()).getByRole('checkbox', { name });

/** Wait for the owner's re-read, then its field as it will be. */
const ready = async (text: RegExp, save: string) => {
  await waitFor(() => expect(dialog().textContent).toMatch(text), {
    timeout: 10_000,
  });
  await waitFor(() => expect(button(save)).toBeEnabled());
};

const session = (slug: string) =>
  stored('song', slug).body.session as Record<string, unknown>;

describe('Unlink: one id, and the text that followed it', () => {
  it('clears a song’s studio and the studio’s name with it, once', async () => {
    change('song', 'africa', (body) => ({
      ...body,
      session: {
        ...(body.session as object),
        studioId: 'sunset-sound',
        studio: 'Sunset Sound',
      },
    }));
    const { done, invalidate } = mount({
      link: spec('studios', 'songs'),
      row: {
        key: 'sunset-sound',
        label: 'Sunset Sound',
        node: 'studio:sunset-sound',
      },
      owner: 'africa',
      mode: 'unlink',
    });
    await ready(/Sunset Sound → none/, 'Unlink');
    expect(dialog().textContent).toContain(
      'Its session.studio “Sunset Sound” goes with it',
    );
    expect(within(dialog()).getByRole('heading').textContent).toBe(
      'Unlink Sunset Sound from Africa',
    );

    fireEvent.click(button('Unlink'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(session('africa')).not.toHaveProperty('studioId');
    expect(session('africa')).not.toHaveProperty('studio');
    // The rest of the session is the song's own.
    expect(session('africa').city).toBe('Los Angeles');
    expect(net.puts).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toBe(
      'Unlinked: Africa · session.studioId no longer names Sunset Sound.',
    );
    expect(stored('song', 'africa').Revisions[0].note).toBe(
      'Unlinked in the Table: Sunset Sound from Africa session.studioId',
    );
  });

  it('says so when a text the owner keeps will place it there again', async () => {
    change('globe_event', MOTOWN, (body) => ({ ...body, placeId: 'detroit' }));
    const { done } = mount({
      link: spec('locations', 'events'),
      row: { key: 'detroit', label: 'Detroit', node: 'place:detroit' },
      owner: MOTOWN,
      mode: 'unlink',
    });
    await ready(/Detroit → none/, 'Unlink');
    expect(dialog().textContent).toMatch(
      /Its location\.city still says “Detroit”, so the map will guess Detroit there again/,
    );
    fireEvent.click(button('Unlink'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('globe_event', MOTOWN).body).not.toHaveProperty('placeId');
  });

  it('has nothing to take out where the row is not linked', async () => {
    mount({
      link: spec('artists', 'songs'),
      row: { key: 'toto', label: 'Toto', node: 'artist:toto' },
      owner: 'africa',
      mode: 'unlink',
    });
    expect(
      await within(dialog()).findByText(
        'Not linked: nothing to take out.',
        undefined,
        { timeout: 10_000 },
      ),
    ).toBeDefined();
    expect(button('Unlink')).toBeDisabled();
  });
});

describe('Unlink: an id list, written whole', () => {
  it('takes one artist out of an event’s stored list, the others kept', async () => {
    change('globe_event', MOTOWN, (body) => ({
      ...body,
      artistIds: ['marvin-gaye', 'diana-ross'],
    }));
    const { done } = mount({
      link: spec('artists', 'events'),
      row: {
        key: 'diana-ross',
        label: 'Diana Ross',
        node: 'artist:diana-ross',
      },
      owner: MOTOWN,
      mode: 'unlink',
    });
    await ready(/artistIds, as it will be/, 'Unlink');
    expect(box(/Diana Ross/)).not.toBeChecked();
    expect(box(/Diana Ross/)).toBeDisabled();
    expect(box(/Marvin Gaye/)).toBeChecked();
    fireEvent.click(button('Unlink'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('globe_event', MOTOWN).body.artistIds).toEqual([
      'marvin-gaye',
    ]);
    expect(done.mock.calls[0][0]).toBe(
      'Unlinked: Motown Records hits its golden era · artistIds no longer names Diana Ross.',
    );
  });

  it('stores the guesses kept when the event stores nothing yet', async () => {
    const { done } = mount({
      link: spec('artists', 'events'),
      row: {
        key: 'diana-ross',
        label: 'Diana Ross',
        node: 'artist:diana-ross',
      },
      owner: MOTOWN,
      mode: 'unlink',
    });
    await ready(/Storing the list without Diana Ross/, 'Unlink');
    expect(box(/Diana Ross/)).not.toBeChecked();
    expect(box(/Marvin Gaye/)).toBeChecked();
    // One word after "The": left for a person to tick.
    expect(box(/The Temptations/)).not.toBeChecked();
    fireEvent.click(button('Unlink'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('globe_event', MOTOWN).body.artistIds).toEqual([
      'marvin-gaye',
    ]);
  });

  it('sends an editor’s unlink as a proposal, the live list untouched', async () => {
    change('globe_event', MOTOWN, (body) => ({
      ...body,
      artistIds: ['marvin-gaye', 'diana-ross'],
    }));
    who.role = 'editor';
    who.userId = 'ed-1';
    const { done } = mount({
      link: spec('artists', 'events'),
      row: {
        key: 'diana-ross',
        label: 'Diana Ross',
        node: 'artist:diana-ross',
      },
      owner: MOTOWN,
      mode: 'unlink',
    });
    await ready(/artistIds, as it will be/, 'Submit for review');
    fireEvent.click(button('Submit for review'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const motown = stored('globe_event', MOTOWN);
    expect(motown.editState).toBe('pending');
    expect(motown.pendingBody?.artistIds).toEqual(['marvin-gaye']);
    expect(motown.body.artistIds).toEqual(['marvin-gaye', 'diana-ross']);
    expect(done.mock.calls[0][0]).toBe(
      'Sent for review: Motown Records hits its golden era · artistIds, no longer naming Diana Ross.',
    );
  });
});

describe('Unlink: the ways a song names its artist', () => {
  it('takes out only the ways chosen, and says the billing line guesses them back', async () => {
    change('song', 'africa', (body) => ({
      ...body,
      origin: { ...(body.origin as object), artistGlobeId: 'toto' },
      credits: (body.credits as Record<string, unknown>[]).map((credit) =>
        credit.name === 'Toto' ? { ...credit, artistGlobeId: 'toto' } : credit,
      ),
    }));
    const { done } = mount({
      link: spec('artists', 'songs'),
      row: { key: 'toto', label: 'Toto', node: 'artist:toto' },
      owner: 'africa',
      mode: 'unlink',
    });
    await ready(/credits, as they will be/, 'Unlink');
    expect(box(/Its lead act/)).toBeChecked();
    expect(box(/The credit Toto/)).toBeChecked();
    // Keep the producer credit; the lead act goes.
    fireEvent.click(box(/The credit Toto/));
    await waitFor(() =>
      expect(dialog().textContent).toMatch(
        /Its artist still says “Toto”, so the map will guess Toto there again/,
      ),
    );
    fireEvent.click(button('Unlink'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const africa = stored('song', 'africa').body;
    expect(
      (africa.origin as Record<string, unknown> | undefined)?.artistGlobeId,
    ).toBeUndefined();
    const credits = africa.credits as Record<string, unknown>[];
    expect(credits.find((c) => c.name === 'Toto')).toMatchObject({
      role: 'producer',
      artistGlobeId: 'toto',
    });
  });
});

describe('Link… on the links added with Unlink', () => {
  it('adds an artist to a group’s members', async () => {
    const { done } = mount({
      link: spec('artists', 'memberOf'),
      row: {
        key: 'diana-ross',
        label: 'Diana Ross',
        node: 'artist:diana-ross',
      },
      owner: 'the-temptations',
    });
    await ready(/members, as it will be/, 'Save');
    expect(dialog().textContent).toContain('Diana Ross · new');
    fireEvent.click(button('Save'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('artist', 'the-temptations').body.members).toContainEqual({
      artistId: 'diana-ross',
    });
  });

  it('refuses a membership that would loop, and writes nothing', async () => {
    // Marvin Gaye is a member of the Temptations here: the Temptations
    // cannot become a member of Marvin Gaye.
    const looped = assembleGraph(NODES, [
      ...GUESSES,
      {
        from: 'artist:marvin-gaye',
        kind: 'member_of',
        to: 'artist:the-temptations',
        via: { item: 'artist:the-temptations', path: 'members[].artistId' },
      },
    ]);
    mount({
      link: spec('artists', 'memberOf'),
      row: {
        key: 'the-temptations',
        label: 'The Temptations',
        node: 'artist:the-temptations',
      },
      owner: 'marvin-gaye',
      on: looped,
    });
    expect(
      await within(dialog()).findByText(/it would loop/, undefined, {
        timeout: 10_000,
      }),
    ).toBeDefined();
    expect(button('Save')).toBeDisabled();
    expect(net.puts).toHaveLength(0);
  });

  it('moves an artist’s city, saying where from', async () => {
    change('artist', 'toto', (body) => ({
      ...body,
      basedInPlaceId: 'detroit',
    }));
    const { done } = mount({
      link: spec('locations', 'artists'),
      row: {
        key: 'los-angeles',
        label: 'Los Angeles',
        node: 'place:los-angeles',
      },
      owner: 'toto',
    });
    await ready(/Detroit → Los Angeles/, 'Save');
    expect(dialog().textContent).toContain('Moves Toto from Detroit.');
    fireEvent.click(button('Save'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('artist', 'toto').body.basedInPlaceId).toBe('los-angeles');
  });

  it('tags a song with a taught genre, and refuses one no tag spells before a song is picked', async () => {
    const { done } = mount({
      link: spec('genres', 'songs'),
      row: { key: 'funk', label: 'Funk', node: 'genre:funk' },
      owner: 'africa',
    });
    await ready(/genreTags, as it will be/, 'Save');
    fireEvent.click(button('Save'));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(stored('song', 'africa').body.genreTags).toEqual(['rock', 'funk']);
    cleanup();

    mount({
      link: spec('genres', 'songs'),
      row: { key: 'classical', label: 'Classical', node: 'genre:classical' },
    });
    expect(dialog().textContent).toMatch(/No song tag spells this genre/);
    expect(button('Save')).toBeDisabled();
  });
});
