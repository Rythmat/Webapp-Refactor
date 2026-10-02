// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
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
import { assembleGraph, buildGraph } from '@/content/graph/deriveGraph';
import type { EntityId, GraphNode } from '@/content/graph/types';
import { suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import { seedBeforeImport } from '@/features/admin/content/mock/__tests__/seedBeforeImport';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockSeed,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import { loadSeed } from '@/features/admin/content/mock/seed';
import type {
  ContentItemDetail,
  ContentListItem,
} from '@/hooks/data/admin/useAdminContent';
import {
  type DecisionsFile,
  OPEN_STATUSES,
  type Suggestions,
} from '@/hooks/data/admin/useSuggestions';
import { BulkAcceptDialog } from '../bulk/BulkAcceptDialog';
import type { BulkItem, BulkPlan } from '../bulk/bulkAccept';
import { useBulkAccept } from '../bulk/useBulkAccept';
import { tableSuggestionsOf } from '../data/tableSuggestions';
import { ConfirmConnectionDialog } from '../link/ConfirmConnectionDialog';
import { linkFor } from '../link/links';
import { TABLES } from '../model/categories';
import { SuggestionsSection } from '../panel/SuggestionsSection';

/**
 * Reviewing suggestions against the offline mock's own server: the Table's
 * bulk accept (§5.1) and the row panel's Suggestions, each through the
 * content API as the console calls it (`contentRequest`, routed here to the
 * mock server in memory, which does what the backend will: re-read, check,
 * make records first, save, log).
 */

const who = vi.hoisted(() => ({
  role: 'admin' as 'admin' | 'editor',
  userId: 'admin-1',
}));
const net = vi.hoisted(() => ({
  server: null as ContentMockServer | null,
  /** Every `POST /suggestions/decisions` body, in order. */
  posted: [] as { decisions: Record<string, unknown>[]; threshold?: number }[],
  /** Runs inside each decisions POST, before the server answers. */
  duringPost: null as null | (() => void),
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
const served = vi.hoisted(() => ({ kinds: false }));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    capabilities: { kinds: [], features: {}, artifactsVersion: null },
    feature: (name: string) =>
      ['suggestions', 'export', 'lookup', 'create'].includes(name),
    // No exports read (the pin-move report's), unless a test serves them:
    // Link… asks whether its owner's kind is served.
    isServed: () => served.kinds,
    isAuthoritative: () => false,
    identityOf: (kind: string) =>
      ['artist', 'release', 'studio', 'label'].includes(kind) ? 'slug' : 'id',
    schemaVersionOf: () => 2,
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
      if (url.pathname === '/suggestions/decisions' && method === 'POST') {
        net.posted.push(body);
        net.duringPost?.();
      }
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

let seed: MockSeed;
beforeAll(async () => {
  // The repo before the bulk import of 30 September 2026, which filled the
  // fields these tests link, unlink and accept into (seedBeforeImport.ts).
  seed = seedBeforeImport(await loadSeed('all'));
  // cmdk and Radix scroll things into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
}, 60_000);

afterEach(cleanup);

/* ── The suggestions served ─────────────────────────────────────────── */

const app = (label: string): SuggestionSource => ({ provider: 'app', label });
const MB: SuggestionSource = {
  provider: 'musicbrainz',
  url: 'https://musicbrainz.org/artist/afdb7919-059d-43c1-b668-ba1d265e7e42',
  label: 'life-span begin',
};
const WD: SuggestionSource = {
  provider: 'wikidata',
  url: 'https://www.wikidata.org/wiki/Q189758',
  label: 'P2031',
};

const suggest = (parts: {
  kind: string;
  slug: string;
  path: string;
  value: unknown;
  display: string;
  op?: 'set' | 'add';
  tier?: SuggestionTier;
  sources?: SuggestionSource[];
  requires?: RequiredRecord[];
  batch?: string;
}): Suggestion => {
  const target = { kind: parts.kind, slug: parts.slug };
  const op = parts.op ?? 'set';
  return {
    id: suggestionId({ target, path: parts.path, op, value: parts.value }),
    target,
    path: parts.path,
    op,
    value: parts.value,
    display: parts.display,
    sources: parts.sources ?? [app(`${parts.slug} ${parts.path}`)],
    evidence: ['a test says so'],
    confidence: parts.tier === 'likely' ? 0.7 : 0.9,
    tier: parts.tier ?? 'sure',
    ...(parts.requires ? { requires: parts.requires } : {}),
    batch: parts.batch ?? 'app-stage1',
  };
};

const GARY: RequiredRecord = {
  kind: 'globe_city',
  slug: 'gary-in',
  body: {
    id: 'gary-in',
    name: 'Gary',
    country: 'US',
    subdivision: 'Indiana',
    region: 'north-america',
    coordinates: [41.5934, -87.3464],
    genres: [],
    description: '',
    activeDecades: [],
    pin: false,
  },
};

const EVENTS = {
  memphisPlace: suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'placeId',
    value: 'memphis',
    display: 'Took place in Memphis',
  }),
  memphisArtists: suggest({
    kind: 'globe_event',
    slug: 'evt-blues-memphis-1951',
    path: 'artistIds',
    value: ['ike-turner'],
    display: 'About Ike Turner',
  }),
  // It needs a place made first.
  tokyoPlace: suggest({
    kind: 'globe_event',
    slug: 'evt-citypop-tokyo-1982',
    path: 'placeId',
    value: 'gary-in',
    display: 'Took place in Gary (a new place)',
    requires: [GARY],
  }),
  // A proposal waits on this one.
  seoulPlace: suggest({
    kind: 'globe_event',
    slug: 'evt-kpop-seoul-1996',
    path: 'placeId',
    value: 'memphis',
    display: 'Took place in Memphis',
  }),
  motownArtists: suggest({
    kind: 'globe_event',
    slug: 'evt-motown-detroit-1966',
    path: 'artistIds',
    value: ['marvin-gaye'],
    display: 'About Marvin Gaye',
    tier: 'likely',
  }),
};

const MARVIN = {
  born: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'born.date',
    value: '1939-04-02',
    display: 'Born 2 Apr 1939',
    sources: [MB],
    batch: 'mb-uncalibrated',
  }),
  from: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'activeFrom',
    value: 1959,
    display: 'Active from 1959',
    sources: [WD],
    batch: 'mb-uncalibrated',
  }),
  pop: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'genreIds[]',
    op: 'add',
    value: 'pop',
    display: 'Genre: pop',
    sources: [WD],
    batch: 'mb-uncalibrated',
  }),
  piano: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'instrumentIds[]',
    op: 'add',
    value: 'piano',
    display: 'Plays Piano',
    sources: [WD],
    batch: 'mb-calibrated',
  }),
  city: suggest({
    kind: 'artist',
    slug: 'marvin-gaye',
    path: 'basedInPlaceId',
    value: 'washington-dc',
    display: 'City: Washington D.C. (song pins)',
    sources: [app('artist_location "marvin gaye" city')],
  }),
};

let clock = 0;
const makeServer = () =>
  createContentMockServer({
    seed,
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
    suggestions: {
      imported: [MARVIN.born, MARVIN.from, MARVIN.pop, MARVIN.piano],
      batches: [
        {
          batch: 'mb-uncalibrated',
          calibrated: false,
          measuredPrecision: null,
        },
        { batch: 'mb-calibrated', calibrated: true, measuredPrecision: 0.99 },
      ],
      app: () => [...Object.values(EVENTS), MARVIN.city],
    },
  });

/* ── Talking to it directly ─────────────────────────────────────────── */

const call = (
  method: string,
  path: string,
  {
    body,
    query,
    viewer = ADMIN,
  }: {
    body?: unknown;
    query?: Record<string, string>;
    viewer?: MockViewer;
  } = {},
) => {
  const response = net.server!.handle({ method, path, body, query, viewer });
  if (response.status !== 200)
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  return response.body;
};

const detailOf = (kind: string, slug: string): ContentItemDetail => {
  const { id } = call('GET', '/items/lookup', {
    query: { kind, slug },
  }) as ContentListItem;
  return call('GET', `/items/${id}`) as ContentItemDetail;
};

const bodyOf = (kind: string, slug: string) =>
  detailOf(kind, slug).body as Record<string, unknown>;

const put = (kind: string, slug: string, body: unknown, viewer = ADMIN) =>
  call('PUT', '/items', { body: { kind, slug, body }, viewer });

/** The table's rows as a bulk accept reads them. */
const itemsOf = (kind: string, slugs: readonly string[]) => {
  const items = new Map<string, BulkItem>();
  for (const slug of slugs) {
    const detail = detailOf(kind, slug);
    items.set(slug, {
      itemId: detail.id,
      label: detail.title,
      body: detail.body ?? undefined,
      pending: detail.editState !== null,
    });
  }
  return (slug: string) => items.get(slug);
};

const wrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

beforeEach(() => {
  net.server = makeServer();
  net.posted = [];
  net.duringPost = null;
  who.role = 'admin';
  who.userId = 'admin-1';
  served.kinds = false;
});

/* ── Bulk accept ────────────────────────────────────────────────────── */

describe('the bulk accept, against the mock server', () => {
  const eventSlugs = [
    ...new Set(Object.values(EVENTS).map((s) => s.target.slug)),
  ];

  const openDialog = (client = new QueryClient()) => {
    const itemOf = itemsOf('globe_event', eventSlugs);
    render(
      <BulkAcceptDialog
        def={TABLES.events}
        itemOf={itemOf}
        onClose={() => {}}
      />,
      { wrapper: wrapper(client) },
    );
    return client;
  };

  it('shows the dry run: counts, the records made first, the first changes and what is left out', async () => {
    // An editor's proposal waits on the Seoul event.
    put(
      'globe_event',
      'evt-kpop-seoul-1996',
      { ...bodyOf('globe_event', 'evt-kpop-seoul-1996'), description: 'New' },
      EDITOR,
    );
    openDialog();
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Dry run');
    expect(
      within(dialog).getByText(
        '2 events change: 3 suggestions accepted. 1 place made first.',
      ),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(/Creates the place “Gary, US” first/),
    ).toBeTruthy();
    // The first items' changes, open.
    expect(within(dialog).getAllByText('placeId').length).toBeGreaterThan(0);
    const left = within(dialog)
      .getByText(/^Left out/)
      .closest('section')!;
    expect(left.textContent).toContain(
      'a proposal waits for review on its item',
    );
    expect(left.textContent).toContain('it is likely, not sure');
    expect(
      within(dialog).getByRole('button', {
        name: 'Accept 3 suggestions on 2 events',
      }),
    ).toBeTruthy();
  });

  it('accepts through the server in bulk: places made first, each logged method bulk, one refetch', async () => {
    const client = openDialog();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const dialog = await screen.findByRole('dialog');
    const run = await within(dialog).findByRole('button', {
      name: 'Accept 4 suggestions on 3 events',
    });
    fireEvent.click(run);
    await within(dialog).findByText(
      /^Accepted 4 suggestions on 3 events in /,
      undefined,
      { timeout: 10_000 },
    );

    // One request (a few items at a time), every accept in bulk, as offered.
    expect(net.posted).toHaveLength(1);
    const sent = net.posted[0].decisions;
    expect(new Set(sent.map((d) => d.suggestionId))).toEqual(
      new Set(
        [
          EVENTS.memphisPlace,
          EVENTS.memphisArtists,
          EVENTS.tokyoPlace,
          EVENTS.seoulPlace,
        ].map((s) => s.id),
      ),
    );
    for (const decision of sent)
      expect(decision).toEqual({
        suggestionId: expect.any(String),
        op: 'accept',
        method: 'bulk',
      });
    // The owner's threshold goes with them: the server holds each to it.
    expect(net.posted[0].threshold).toBe(0.85);
    expect(bodyOf('globe_event', 'evt-blues-memphis-1951')).toMatchObject({
      placeId: 'memphis',
      artistIds: ['ike-turner'],
    });
    // The place it names was made first, and is used.
    expect(bodyOf('globe_city', 'gary-in')).toMatchObject({ name: 'Gary' });
    expect(bodyOf('globe_event', 'evt-citypop-tokyo-1982').placeId).toBe(
      'gary-in',
    );

    const file = call('GET', '/suggestions/decisions') as DecisionsFile;
    expect(file.decisions).toHaveLength(4);
    expect(new Set(file.decisions.map((d) => d.method))).toEqual(
      new Set(['bulk']),
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'content'] });

    // Each stays "accepted in bulk, not reviewed" until someone looks.
    const unreviewed = call('GET', '/suggestions', {
      query: { kind: 'globe_event', unreviewed: '1' },
    }) as { items: unknown[] };
    expect(unreviewed.items).toHaveLength(4);
  });

  it('lists a conflict the server finds at the run and never forces it', async () => {
    openDialog();
    const dialog = await screen.findByRole('dialog');
    const run = await within(dialog).findByRole('button', {
      name: 'Accept 4 suggestions on 3 events',
    });
    // After the dry run, before the run: someone sets the Tokyo event's
    // place by hand.
    put('globe_event', 'evt-citypop-tokyo-1982', {
      ...bodyOf('globe_event', 'evt-citypop-tokyo-1982'),
      placeId: 'memphis',
    });
    fireEvent.click(run);
    await within(dialog).findByText(
      /^Accepted 3 suggestions on 2 events in /,
      undefined,
      {
        timeout: 10_000,
      },
    );
    const refused = within(dialog)
      .getByText(/^Refused, and why/)
      .closest('details')!;
    expect(refused.textContent).toMatch(/City Pop|citypop|Tokyo/i);
    expect(refused.textContent).toContain('placeId it holds something else');
    // Never forced, and nothing made for it.
    expect(bodyOf('globe_event', 'evt-citypop-tokyo-1982').placeId).toBe(
      'memphis',
    );
    expect(() => detailOf('globe_city', 'gary-in')).toThrow(/404/);
  });

  it("says why the importer's wait, and never takes a song-pin City", async () => {
    const itemOf = itemsOf('artist', ['marvin-gaye']);
    render(
      <BulkAcceptDialog
        def={TABLES.artists}
        itemOf={itemOf}
        onClose={() => {}}
      />,
      { wrapper: wrapper(new QueryClient()) },
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Dry run');
    expect(
      within(dialog).getByText('Imported suggestions wait for calibration')
        .parentElement!.textContent,
    ).toMatch(/3 suggestions from the importer \(mb-uncalibrated\)/);
    // The calibrated run's sure one goes; the song-pin City never does.
    expect(
      within(dialog).getByText('1 artist change: 1 suggestion accepted.'),
    ).toBeTruthy();
    const left = within(dialog)
      .getByText(/^Left out/)
      .closest('section')!;
    expect(left.textContent).toContain(
      'a City read from song pins is never accepted in bulk',
    );
    // The request carries the threshold, down to the server's floor.
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['100%', '95%', '90%', '85%', '80%', '75%', '70%']);
  });

  it('reads what a song’s rows rest on from the server: the act’s identity, another kind’s', async () => {
    const identity = suggest({
      kind: 'artist',
      slug: 'marvin-gaye',
      path: 'externalIds.mbid',
      value: 'afdb7919-059d-43c1-b668-ba1d265e7e42',
      display: 'MusicBrainz: Marvin Gaye',
      sources: [MB],
      batch: 'mb-calibrated',
    });
    const studio = {
      ...suggest({
        kind: 'song',
        slug: 'whats_going_on',
        path: 'session.studioId',
        value: 'hitsville-u-s-a',
        display: 'Studio: Hitsville U.S.A.',
        sources: [MB],
        batch: 'mb-calibrated',
      }),
      dependsOn: identity.id,
    };
    net.server = createContentMockServer({
      seed,
      mode: 'all',
      now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
      suggestions: {
        imported: [identity, studio],
        batches: [
          { batch: 'mb-calibrated', calibrated: true, measuredPrecision: 1 },
        ],
      },
    });
    const served = (query: Record<string, string>) =>
      call('GET', '/suggestions', { query }) as Suggestions & {
        items: Suggestions['rows'];
      };
    // The songs list alone holds no artist row: the server says how the
    // identity stands, beside the song's row. An identity row is never
    // written nor shown, so it stands while the import would take it.
    expect(served({ kind: 'song' }).items[0].dependency).toMatchObject({
      id: identity.id,
      target: { kind: 'artist', slug: 'marvin-gaye' },
      display: 'MusicBrainz: Marvin Gaye',
      status: 'open',
      stands: true,
    });
    const openDialog = () =>
      render(
        <BulkAcceptDialog
          def={TABLES.songs}
          itemOf={itemsOf('song', ['whats_going_on'])}
          onClose={() => {}}
        />,
        { wrapper: wrapper(new QueryClient()) },
      );
    // Rejected, it no longer stands, and the row is left out.
    call('POST', '/suggestions/decisions', {
      body: { decisions: [{ suggestionId: identity.id, op: 'reject' }] },
    });
    expect(served({ kind: 'song' }).items[0].dependency).toMatchObject({
      status: 'rejected',
      stands: false,
    });
    openDialog();
    let dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Dry run');
    expect(within(dialog).getByText('Nothing would change.')).toBeTruthy();
    expect(
      within(dialog)
        .getByText(/^Left out/)
        .closest('section')!.textContent,
    ).toContain('the suggestion it rests on is not accepted yet');
    cleanup();

    call('POST', '/suggestions/decisions', {
      body: { decisions: [{ suggestionId: identity.id, op: 'reopen' }] },
    });
    expect(served({ kind: 'song' }).items[0].dependency).toMatchObject({
      status: 'open',
      stands: true,
    });
    openDialog();
    dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('Dry run');
    expect(
      within(dialog).getByText('1 song change: 1 suggestion accepted.'),
    ).toBeTruthy();
    // So does the server, in bulk.
    const answer = call('POST', '/suggestions/decisions', {
      body: {
        decisions: [{ suggestionId: studio.id, op: 'accept', method: 'bulk' }],
      },
    }) as { results: { outcome: string }[] };
    expect(answer.results[0].outcome).toBe('saved');
  });
});

describe('the run loop', () => {
  it('stops before the next request when asked, and still refetches once', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const hook = renderHook(() => useBulkAccept(), {
      wrapper: wrapper(client),
    });
    const itemOf = itemsOf('globe_event', [
      'evt-blues-memphis-1951',
      'evt-kpop-seoul-1996',
    ]);
    const item = (slug: string, suggestion: Suggestion) => ({
      slug,
      label: itemOf(slug)!.label,
      itemId: itemOf(slug)!.itemId!,
      suggestions: [suggestion],
      before: {},
      after: {},
    });
    const plan: BulkPlan = {
      items: [
        item('evt-blues-memphis-1951', EVENTS.memphisPlace),
        item('evt-kpop-seoul-1996', EVENTS.seoulPlace),
      ],
      count: 2,
      records: [],
      skipped: [],
    };
    net.duringPost = () => hook.result.current.stop();
    let result: Awaited<ReturnType<typeof hook.result.current.run>>;
    await act(async () => {
      result = await hook.result.current.run(plan, { perRequest: 1 });
    });
    expect(net.posted).toHaveLength(1);
    expect(result!).toMatchObject({
      done: 1,
      total: 2,
      accepted: 1,
      written: 1,
      failed: [],
      conflicts: [],
    });
    expect(result!.finishedAt).not.toBeNull();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

/* ── The row panel's Suggestions ────────────────────────────────────── */

describe("the row panel's Suggestions, against the mock server", () => {
  const graphOf = () =>
    buildGraph({
      artists: [{ slug: 'marvin-gaye', name: 'Marvin Gaye' }],
      places: [
        {
          id: 'washington-dc',
          name: 'Washington D.C.',
          country: 'US',
          region: 'north-america',
          coordinates: [38.9, -77],
          genres: [],
          description: '',
          activeDecades: [],
          subdivision: '',
        },
      ],
    } as never);

  const mount = (
    over: Partial<Parameters<typeof SuggestionsSection>[0]> = {},
    client = new QueryClient(),
  ) =>
    render(
      <SuggestionsSection
        kind="artist"
        slug="marvin-gaye"
        label="Marvin Gaye"
        item={{ itemId: 'marvin-gaye', pending: false }}
        def={TABLES.artists}
        graph={graphOf()}
        base={bodyOf('artist', 'marvin-gaye')}
        isEditor={who.role === 'editor'}
        blocked={null}
        {...over}
      />,
      { wrapper: wrapper(client) },
    );

  const card = async (display: string) =>
    (await screen.findByText(display)).closest('article')!;

  it('lists each with its evidence, sources, tier and what it rests on', async () => {
    mount();
    const born = await card('Born 2 Apr 1939');
    expect(born.textContent).toContain('Born');
    expect(born.textContent).toContain('Sure · 90%');
    expect(born.textContent).toContain('a test says so');
    // The source in the site's words, with no link out and no catalogue
    // named (owner decision of 30 September 2026).
    expect(born.textContent).toContain('an outside source · life-span begin');
    expect(within(born).queryByRole('link')).toBeNull();
    expect(born.textContent).not.toMatch(/MusicBrainz|Wikidata/);
    expect(
      screen.getByRole('heading', { name: /Suggestions · 5/ }),
    ).toBeTruthy();
  });

  it('accepts one: the server saves it, logs it single, and it moves to Accepted', async () => {
    mount();
    const born = await card('Born 2 Apr 1939');
    fireEvent.click(within(born).getByRole('button', { name: /^Accept\b/ }));
    await waitFor(() =>
      // Bare: an outside suggestion names no source (30 September 2026).
      expect(bodyOf('artist', 'marvin-gaye').born).toEqual({
        date: '1939-04-02',
      }),
    );
    expect(net.posted.at(-1)!.decisions).toEqual([
      { suggestionId: MARVIN.born.id, op: 'accept', method: 'single' },
    ]);
    const accepted = await screen.findByText('Accepted · 1');
    expect(accepted.closest('details')!.textContent).toContain(
      'Born 2 Apr 1939',
    );
    // Said where it outlives the card.
    expect(screen.getByRole('status').textContent).toBe(
      'Accepted “Born 2 Apr 1939”.',
    );
  });

  it('remembers a rejection: not offered again, not counted, still rejected after a reload', async () => {
    mount();
    const pop = await card('Genre: pop');
    fireEvent.click(within(pop).getByRole('button', { name: /^Reject\b/ }));
    // It cannot be taken back, so it asks first; "Keep it" leaves it be.
    const asking = within(pop).getByRole('group', { name: /^Reject .*\?$/ });
    expect(asking.textContent).toContain('not offered again');
    expect(document.activeElement?.textContent).toBe('Reject');
    fireEvent.click(within(asking).getByRole('button', { name: 'Keep it' }));
    expect(within(pop).queryByRole('group')).toBeNull();
    fireEvent.click(within(pop).getByRole('button', { name: /^Reject\b/ }));
    fireEvent.click(
      within(within(pop).getByRole('group')).getByRole('button', {
        name: 'Reject',
      }),
    );
    const rejected = await screen.findByText('Rejected · 1');
    expect(rejected.closest('details')!.textContent).toContain(
      'Rejected — not offered again',
    );
    expect(
      screen.queryByText('Genre: pop', { selector: 'article p' }),
    ).toBeNull();

    // A fresh page: the log says so.
    cleanup();
    mount();
    expect(await screen.findByText('Rejected · 1')).toBeTruthy();
    // The grid's count leaves it out, and shows no ghost for it.
    const open = call('GET', '/suggestions', {
      query: {
        kind: 'artist',
        slug: 'marvin-gaye',
        status: OPEN_STATUSES.join(','),
      },
    }) as { items: Suggestions['rows'] };
    const table = tableSuggestionsOf(open.items);
    expect(table.count('artist:marvin-gaye')).toBe(4);
    expect(
      table.ghosts!('artist:marvin-gaye').map((g) => g.path),
    ).not.toContain('genreIds[]');
  });

  it('takes a rejection back: offered again, as before, and logged', async () => {
    mount();
    const pop = await card('Genre: pop');
    fireEvent.click(within(pop).getByRole('button', { name: /^Reject\b/ }));
    fireEvent.click(
      within(within(pop).getByRole('group')).getByRole('button', {
        name: 'Reject',
      }),
    );
    const decided = (await screen.findByText('Rejected · 1')).closest(
      'details',
    )!;
    fireEvent.click(
      within(decided).getByRole('button', { name: /^Undo reject: .*pop$/ }),
    );

    // Back among the cards, with the keyboard on it; the list is gone.
    await waitFor(() => expect(screen.queryByText('Rejected · 1')).toBeNull());
    const again = await card('Genre: pop');
    await waitFor(() =>
      expect(again.contains(document.activeElement)).toBe(true),
    );
    expect(again.dataset.status).toBe('open');
    expect(screen.getByRole('status').textContent).toBe(
      'Reopened “Genre: pop”: offered again.',
    );
    // The log keeps the reject, with the reopen after it.
    const { decisions } = call('GET', '/suggestions/decisions') as {
      decisions: { op: string }[];
    };
    expect(decisions.map((d) => d.op).slice(-2)).toEqual(['reject', 'reopen']);
  });

  it('offers no Undo to an editor, who does not reject', async () => {
    mount();
    const pop = await card('Genre: pop');
    fireEvent.click(within(pop).getByRole('button', { name: /^Reject\b/ }));
    fireEvent.click(
      within(within(pop).getByRole('group')).getByRole('button', {
        name: 'Reject',
      }),
    );
    await screen.findByText('Rejected · 1');
    cleanup();
    who.role = 'editor';
    mount();
    const decided = (await screen.findByText('Rejected · 1')).closest(
      'details',
    )!;
    expect(within(decided).queryByRole('button', { name: /^Undo/ })).toBeNull();
  });

  it('shows a conflict side by side, and Replace writes over what was shown', async () => {
    put('artist', 'marvin-gaye', {
      ...bodyOf('artist', 'marvin-gaye'),
      activeFrom: 1961,
    });
    mount();
    const from = await card('Active from 1959');
    expect(from.dataset.status).toBe('conflict');
    expect(within(from).getByText('Now').nextSibling!.textContent).toBe('1961');
    expect(within(from).getByText('Suggested').nextSibling!.textContent).toBe(
      'Active from 1959',
    );
    fireEvent.click(within(from).getByRole('button', { name: /^Replace\b/ }));
    await waitFor(() =>
      expect(bodyOf('artist', 'marvin-gaye').activeFrom).toBe(1959),
    );
    expect(net.posted.at(-1)!.decisions).toEqual([
      {
        suggestionId: MARVIN.from.id,
        op: 'replace',
        method: 'single',
        seen: 1961,
      },
    ]);
  });

  it('marks a bulk accept reviewed', async () => {
    call('POST', '/suggestions/decisions', {
      body: {
        decisions: [
          { suggestionId: MARVIN.piano.id, op: 'accept', method: 'bulk' },
        ],
      },
    });
    mount();
    const piano = await card('Plays Piano');
    expect(piano.textContent).toMatch(
      /Accepted in bulk on .*; not reviewed yet/,
    );
    fireEvent.click(
      within(piano).getByRole('button', { name: /^Mark .* reviewed$/ }),
    );
    const accepted = await screen.findByText('Accepted · 1');
    expect(accepted.closest('details')!.textContent).toContain(
      'Accepted in bulk, reviewed',
    );
    const waiting = call('GET', '/suggestions', {
      query: { kind: 'artist', unreviewed: '1' },
    }) as { items: unknown[] };
    expect(waiting.items).toHaveLength(0);
  });

  it('says why a sure one is not in bulk, and takes the row’s sure ones in one go', async () => {
    mount();
    const born = await card('Born 2 Apr 1939');
    expect(born.textContent).toContain(
      "Not in bulk: the importer's sure tier is not calibrated yet.",
    );
    // A calibrated one with nothing in its way says nothing.
    expect((await card('Plays Piano')).textContent).not.toContain(
      'Not in bulk',
    );
    // Each named, for a screen reader's list of buttons.
    expect(
      within(born).getByRole('button', { name: 'Accept Born Born 2 Apr 1939' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: /^Accept the \d+ sure ones$/ }),
    );
    await screen.findByText(/^Accepted \d+ sure suggestions\.$/);
    const sent = net.posted.at(-1)!.decisions;
    // One request, a person's accepts, never the City.
    expect(sent.length).toBeGreaterThan(1);
    for (const decision of sent)
      expect(decision).toMatchObject({ op: 'accept', method: 'single' });
    expect(sent.map((d) => d.suggestionId)).not.toContain(MARVIN.city.id);
    // An outside suggestion goes in bare (owner decision of 30 September
    // 2026): no source, no unverified mark.
    expect(bodyOf('artist', 'marvin-gaye').born).toEqual({
      date: '1939-04-02',
    });
  });

  it('shows a song’s card resting on its act’s identity by name, and bills the act on its own credits', async () => {
    const identity = suggest({
      kind: 'artist',
      slug: 'marvin-gaye',
      path: 'externalIds.mbid',
      value: 'afdb7919-059d-43c1-b668-ba1d265e7e42',
      display: 'MusicBrainz: Marvin Gaye',
      sources: [MB],
      batch: 'mb-calibrated',
    });
    const credit = (value: Record<string, unknown>, display: string) => ({
      ...suggest({
        kind: 'song',
        slug: 'whats_going_on',
        path: 'credits[]',
        op: 'add',
        value,
        display,
        sources: [MB],
        batch: 'mb-calibrated',
      }),
      dependsOn: identity.id,
    });
    const vocals = credit(
      { name: 'Marvin Gaye', role: 'vocals', artistGlobeId: 'marvin-gaye' },
      'Vocals: Marvin Gaye',
    );
    const writer = credit(
      { name: 'Al Cleveland', role: 'songwriter' },
      'Songwriter: Al Cleveland',
    );
    net.server = createContentMockServer({
      seed,
      mode: 'all',
      now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
      suggestions: {
        imported: [identity, vocals, writer],
        batches: [
          { batch: 'mb-calibrated', calibrated: true, measuredPrecision: 1 },
        ],
      },
    });
    const client = new QueryClient();
    const props = {
      kind: 'song' as const,
      slug: 'whats_going_on',
      label: 'What’s Going On',
      item: { itemId: 'whats_going_on', pending: false },
      def: TABLES.songs,
      graph: graphOf(),
      isEditor: false,
      blocked: null,
    };
    render(
      <MemoryRouter>
        <SuggestionsSection
          {...props}
          base={bodyOf('song', 'whats_going_on')}
        />
      </MemoryRouter>,
      { wrapper: wrapper(client) },
    );
    const sung = await card('Vocals: Marvin Gaye');
    // Its column by its role: each role has a column of `credits[]`, and
    // Credits takes only a role none has.
    expect(sung.textContent).toContain('Vocals:');
    expect(sung.textContent).not.toContain('Credits:');
    expect((await card('Songwriter: Al Cleveland')).textContent).toContain(
      'Composers',
    );
    // What it rests on, by name, with the way to its row; not the raw id.
    // The identity row itself is never shown nor written: the match is
    // taken as given, as the import takes it.
    expect(sung.textContent).toContain(
      'Rests on “Outside source: Marvin Gaye”, a match taken as given.',
    );
    expect(
      within(sung).getByRole('link', { name: '“Outside source: Marvin Gaye”' }),
    ).toHaveAttribute('href', '/console/table/artists/marvin-gaye');
    fireEvent.click(
      screen.getByRole('button', { name: 'Accept the 2 sure ones' }),
    );
    await screen.findByText('Accepted 2 sure suggestions.');
    // The act's own credit is its billing, not a sideman's.
    const credits = bodyOf('song', 'whats_going_on').credits as Record<
      string,
      unknown
    >[];
    expect(credits.find((c) => c.role === 'vocals')).toMatchObject({
      artistGlobeId: 'marvin-gaye',
      primary: true,
    });
    expect(
      credits.find((c) => c.role === 'songwriter')?.primary,
    ).toBeUndefined();
  });

  it('moves the keyboard to the next suggestion once one is decided', async () => {
    mount();
    const born = await card('Born 2 Apr 1939');
    const button = within(born).getByRole('button', { name: /^Accept\b/ });
    button.focus();
    fireEvent.click(button);
    await screen.findByText('Accepted · 1');
    await waitFor(() =>
      expect(document.activeElement?.closest('article')).not.toBeNull(),
    );
    expect(
      document.activeElement!.closest('article')!.textContent,
    ).not.toContain('Born 2 Apr 1939');
  });

  it("puts an editor's accept in their proposal, and leaves rejecting to an admin", async () => {
    who.role = 'editor';
    who.userId = 'ed-1';
    mount();
    const born = await card('Born 2 Apr 1939');
    expect(
      within(born).queryByRole('button', { name: /^Reject\b/ }),
    ).toBeNull();
    expect(born.textContent).toContain('Goes into your proposal, for review.');
    fireEvent.click(within(born).getByRole('button', { name: /^Accept\b/ }));
    expect(
      await screen.findByText(
        '“Born 2 Apr 1939” is in your proposal, for review.',
      ),
    ).toBeTruthy();
    const stored = detailOf('artist', 'marvin-gaye');
    expect(stored.editState).toBe('pending');
    expect((stored.pendingBody as { born?: unknown }).born).toMatchObject({
      date: '1939-04-02',
    });
    expect(stored.body!.born).toBeUndefined();
  });

  it('waits while the Details have unsaved changes', async () => {
    mount({
      blocked: 'Save or discard your changes first: accepting saves the item.',
    });
    const born = await card('Born 2 Apr 1939');
    expect(
      within(born).getByRole('button', { name: /^Accept\b/ }),
    ).toHaveProperty('disabled', true);
    // Said once over the cards, and on each held button.
    expect(
      screen.getAllByText(
        'Save or discard your changes first: accepting saves the item.',
      ),
    ).toHaveLength(1);
    expect(
      within(born).getByRole('button', { name: /^Accept\b/ }).title,
    ).toContain('Save or discard your changes first');
    // Rejecting writes nothing to the item, so it is not held back.
    expect(
      within(born).getByRole('button', { name: /^Reject\b/ }),
    ).toHaveProperty('disabled', false);
  });
});

/* ── Link… and Confirm log what they state ──────────────────────────── */

describe('a link that states a suggestion', () => {
  const MOTOWN = 'evt-motown-detroit-1966';
  const node = (id: EntityId, label: string): GraphNode => ({
    id,
    kind: id.slice(0, id.indexOf(':')) as GraphNode['kind'],
    label,
    status: 'published',
    origin: 'api',
  });
  const graph = assembleGraph(
    [
      node('artist:marvin-gaye', 'Marvin Gaye'),
      node('artist:the-temptations', 'The Temptations'),
      node(`event:${MOTOWN}`, 'Motown Records hits its golden era'),
    ],
    ['artist:marvin-gaye', 'artist:the-temptations'].map((to) => ({
      from: `event:${MOTOWN}` as EntityId,
      kind: 'about' as const,
      to: to as EntityId,
      via: { item: `event:${MOTOWN}` as EntityId, path: 'tags[]' },
      inferred: true,
    })),
  );
  const confirm = () => {
    served.kinds = true;
    const done = vi.fn();
    render(
      <MemoryRouter>
        <ConfirmConnectionDialog
          spec={linkFor('artists', 'events')!}
          graph={graph}
          row={{
            key: 'marvin-gaye',
            label: 'Marvin Gaye',
            node: 'artist:marvin-gaye',
          }}
          owner={MOTOWN}
          onDone={done}
          onClose={() => {}}
        />
      </MemoryRouter>,
      { wrapper: wrapper(new QueryClient()) },
    );
    return done;
  };
  const save = async () => {
    const button = await screen.findByRole(
      'button',
      { name: 'Save' },
      { timeout: 10_000 },
    );
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 10_000 });
    fireEvent.click(button);
  };
  const logged = () =>
    (call('GET', '/suggestions/decisions') as DecisionsFile).decisions.filter(
      (d) => d.suggestionId === EVENTS.motownArtists.id,
    );

  it('logs the suggestion it now states as accepted, once', async () => {
    const done = confirm();
    await save();
    await waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 10_000 });
    expect(bodyOf('globe_event', MOTOWN).artistIds).toEqual(['marvin-gaye']);
    expect(logged()).toEqual([
      expect.objectContaining({ op: 'accept', method: 'single' }),
    ]);
    expect(done.mock.calls[0][0]).toContain(
      'A suggestion it matches is logged as accepted.',
    );
  });

  it('logs the author’s own list when they chose among the guesses', async () => {
    const done = confirm();
    fireEvent.click(
      await screen.findByRole(
        'checkbox',
        { name: /The Temptations/ },
        { timeout: 10_000 },
      ),
    );
    await save();
    await waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 10_000 });
    const list = ['marvin-gaye', 'the-temptations'];
    expect(bodyOf('globe_event', MOTOWN).artistIds).toEqual(list);
    expect(logged()).toEqual([
      expect.objectContaining({ op: 'accept', value: list }),
    ]);
    // Decided: no longer a conflict offering Replace.
    const rows = call('GET', '/suggestions', {
      query: { kind: 'globe_event', slug: MOTOWN },
    }) as { items: { suggestion: { id: string }; status: string }[] };
    expect(
      rows.items.find((r) => r.suggestion.id === EVENTS.motownArtists.id)
        ?.status,
    ).toBe('applied');
  });
});
