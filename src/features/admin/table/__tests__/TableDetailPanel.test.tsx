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
import {
  createMemoryRouter,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  assembleGraph,
  buildGraph,
  type GraphSnapshot,
} from '@/content/graph/deriveGraph';
import type { EntityId } from '@/content/graph/types';
import { resetSessionEntitiesForTests } from '@/features/admin/content/entities/sessionEntities';
import { CONTENT_KINDS } from '@/features/admin/content/kinds';
import { GuardOutlet } from '@/features/admin/content/mirror/UnsavedChangesGuard';
import { RECORD_EDITORS } from '@/features/admin/content/recordEditors';
import { pick } from '@/features/admin/content/recordEditors/__tests__/harness';
import { ContentApiError } from '@/hooks/data/admin/useAdminContent';
import { FULL_EDITOR_KINDS, PANEL_EDIT_KINDS } from '../fullEditor';
import {
  getTableModel,
  type TableInput,
  type TableItem,
} from '../model/buildTableModel';
import { TABLES } from '../model/categories';
import { ColumnList, LIST_LIMIT } from '../panel/PanelConnections';
import { TableDetailPanel } from '../panel/TableDetailPanel';
import { findAnchor, findField } from '../panel/findField';
import { TABLE_FOR_CONTENT_KIND, type TableId } from '../tableIds';
import { api, caps, detail, resetPanelApi } from './panelApi';
import {
  ARTISTS,
  EDGES,
  EVENTS,
  fixtureGraph,
  fixtureInput,
  ITEMS,
  PLACES,
  SNAPSHOT,
  SONGS,
} from './tableFixtures';

/**
 * The row panel over the fixture Atlas: its header and ways out, its
 * editing (Details in the kind's editor, saved as the item or proposed for
 * review, the review banner, the unsaved-changes guard), its columns and
 * edges in full, and closing back to the table as it was left — beside the
 * grid on a wide screen, a sheet below xl.
 *
 * The content API is `panelApi.ts`: the items a session loads, and every
 * save and verdict it sends. Signed in with no token, so the pickers search
 * the repo's registries and nothing reaches the network.
 */

const auth = vi.hoisted(() => ({ role: 'admin', userId: 'me' }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({
    role: auth.role,
    token: null,
    userId: auth.userId,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) =>
  (await import('./panelApi')).fakeItemHooks(await importOriginal<object>()),
);
vi.mock('@/hooks/data/admin/useCapabilities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCapabilities: (await import('./panelApi')).fakeCapabilities,
}));
// The suggestions a row has, when the server serves them (none by default,
// as today's API); suggestionReview.test.tsx drives them against the mock.
const suggested = vi.hoisted(() => ({
  served: false,
  rows: [] as unknown[],
}));
vi.mock('@/hooks/data/admin/useSuggestions', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSuggestions: () => ({
    served: suggested.served,
    data: suggested.served ? { rows: suggested.rows } : undefined,
    isLoading: false,
    error: null,
  }),
}));

let wide = true;

beforeAll(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});

/** The fixture's items as the API holds them, for the sessions to load. */
const storeFixtureItems = () => {
  for (const [node, item] of ITEMS) {
    const kind = node.startsWith('artist:') ? 'artist' : 'song';
    const body = item.body ?? item.pendingBody ?? {};
    api.items.set(
      item.id,
      detail(item.id, kind, body as Record<string, unknown>, {
        status: item.status,
        editState: item.editState,
        pendingBody: item.pendingBody ?? null,
      }),
    );
  }
};

beforeEach(() => {
  wide = true;
  auth.role = 'admin';
  suggested.served = false;
  suggested.rows = [];
  resetPanelApi();
  storeFixtureItems();
  window.matchMedia = ((query: string) => ({
    matches: wide && query === '(min-width: 1280px)',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  resetSessionEntitiesForTests();
});

/** The table's route with the panel on the row the URL names. */
const Harness = ({
  input,
  mode,
  pins,
  onEdited,
}: {
  input: TableInput;
  mode: 'working' | 'repo';
  pins?: ReadonlyMap<string, string>;
  onEdited?(rowKey: string): void;
}) => {
  const { table, row } = useParams();
  const model = getTableModel(input, table as TableId);
  return (
    <>
      <h1>{model.def.title}</h1>
      {row && (
        <TableDetailPanel
          model={model}
          rowKey={row}
          graph={input.graph}
          mode={mode}
          pins={pins}
          onEdited={onEdited}
        />
      )}
    </>
  );
};

const mount = (
  path: string,
  {
    input = fixtureInput(),
    mode = 'working',
    pins,
    onEdited,
  }: {
    input?: TableInput;
    mode?: 'working' | 'repo';
    pins?: ReadonlyMap<string, string>;
    onEdited?(rowKey: string): void;
  } = {},
) => {
  // Under the console's one unsaved-changes guard, as AdminPages puts it.
  const router = createMemoryRouter(
    [
      {
        element: <GuardOutlet />,
        children: [
          {
            path: '/console/table/:table/:row?',
            element: (
              <Harness
                input={input}
                mode={mode}
                pins={pins}
                onEdited={onEdited}
              />
            ),
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

const where = (router: ReturnType<typeof mount>) =>
  `${router.state.location.pathname}${router.state.location.search}`;

const panel = () => screen.getByRole('complementary');

const field = (id: string) => {
  const found = panel().querySelector<HTMLElement>(`[data-field="${id}"]`);
  if (!found) throw new Error(`no field ${id}`);
  return found;
};

const hrefOf = (name: string | RegExp, within_: HTMLElement = panel()) =>
  within(within_).getByRole('link', { name }).getAttribute('href');

type Body = Record<string, unknown>;

/**
 * The fixture with the API holding these rows too: each a published item
 * with no proposal, stored for its session to load.
 */
const withItems = (
  rows: readonly [EntityId, string, Body][],
  base: TableInput = fixtureInput(),
): TableInput => {
  const items = new Map<EntityId, TableItem>(base.items);
  for (const [node, id, body] of rows) {
    items.set(node, { id, status: 'published', editState: null, body });
    const kind = CONTENT_KIND_OF_NODE[node.slice(0, node.indexOf(':'))];
    api.items.set(id, detail(id, kind, body));
  }
  return { ...base, items };
};

const CONTENT_KIND_OF_NODE: Record<string, Parameters<typeof detail>[1]> = {
  artist: 'artist',
  song: 'song',
  event: 'globe_event',
  place: 'globe_city',
  release: 'release',
  studio: 'studio',
  label: 'label',
  progression: 'chord_progression',
};

/** The fixture with the API's copy of Africa, so the song has an item id. */
const withSongItem = () =>
  withItems([['song:africa', 'db-africa', SONGS[0] as unknown as Body]]);

describe('the row panel', () => {
  it('names the row and its states, with the ways out', () => {
    mount('/console/table/artists/toto');
    expect(within(panel()).getByRole('heading', { level: 2 }).textContent).toBe(
      'Toto',
    );
    expect(panel()).toHaveAccessibleName('Toto');
    // An editor's proposal is waiting: said once, not as a status and again
    // as a review state.
    const header = within(panel()).getByRole('banner');
    expect(within(header).getByText('Artist')).toBeInTheDocument();
    expect(within(header).getByText('Pending review')).toBeInTheDocument();
    expect(within(header).queryByText('In review')).toBeNull();

    expect(hrefOf('Open in Cortex')).toBe(
      '/console/cortex?focus=artist%3Atoto',
    );
    expect(hrefOf('Open page')).toBe(
      '/console/content/atlas/globe?artist=Toto',
    );
    // Artists have no full editor yet: records/artist/:id would open nothing.
    expect(
      within(panel()).queryByRole('link', { name: /Full editor/ }),
    ).toBeNull();
  });

  it('edits the row in Details, and lists below what the graph adds', () => {
    mount('/console/table/artists/toto');
    const details = within(panel()).getByRole('region', { name: 'Details' });
    // The artist's own editor, over the API's item.
    const editor = within(details).getByRole('region', {
      name: 'Artist details',
    });
    expect(within(editor).getByLabelText<HTMLInputElement>('Name').value).toBe(
      'Toto',
    );
    // A group: Born is the year it formed.
    expect(
      within(editor).getByLabelText<HTMLInputElement>('Year formed').value,
    ).toBe('1977');
    // What a field shows beyond its stored value stays listed: the City
    // column's chips, the genres the songs and events offer.
    const connections = within(panel()).getByRole('region', {
      name: 'Connections',
    });
    expect(connections.contains(field('city'))).toBe(true);
    expect(field('city').textContent).toContain('Los Angeles');
    expect(field('city').textContent).toContain('Edited in Details.');
    expect(field('genres').textContent).toContain('Rock');
    expect(field('genres').textContent).toContain('offered, not stated');
    // A plain field is the editor's alone.
    expect(panel().querySelector('[data-field="born"]')).toBeNull();
  });

  it('lists the other columns in full, each chip saying how sure it is', () => {
    mount('/console/table/artists/toto');
    const connections = within(panel()).getByRole('region', {
      name: 'Connections',
    });
    const events = field('events');
    expect(connections.contains(events)).toBe(true);
    const chips = [...events.querySelectorAll('[data-style]')].map((chip) => [
      chip.querySelector('a')?.textContent,
      chip.getAttribute('data-style'),
    ]);
    expect(chips).toEqual([
      ['Toto sweeps the Grammys', 'solid'],
      ['Live Aid', 'dotted'],
    ]);
    // The guess is said in words too, and each chip opens its row.
    expect(within(events).getByText('(guessed)')).toBeDefined();
    expect(hrefOf('Live Aid', events)).toBe(
      '/console/table/events/evt-live-aid',
    );
    expect(hrefOf('Live Aid in Cortex', events)).toBe(
      '/console/cortex?focus=event%3Aevt-live-aid',
    );
    // Who owns the fact, when it is not the row: Link… writes it there, and
    // a guess is confirmed there; a stated one needs nothing.
    expect(events.textContent).toContain(
      'Stated on the globe events: artistIds[].',
    );
    expect(
      within(events).getByRole('button', { name: 'Link: Events' }),
    ).toBeDefined();
    expect(
      within(events).getByRole('button', { name: 'Confirm Live Aid' }),
    ).toBeDefined();
    expect(
      within(events).getAllByRole('button', { name: /^Confirm/ }),
    ).toHaveLength(1);
    cleanup();

    // Below the event body v2 the server refuses the field, and says so.
    caps.levels.globe_event = 1;
    mount('/console/table/artists/toto');
    expect(field('events').textContent).toContain(
      'Stated on the globe events: artistIds[], saveable with the event body v2.',
    );
  });

  it('opens the grid’s Link… as its dialog, and lets go of the URL', async () => {
    const router = mount('/console/table/artists/toto?q=to&link=events');
    // The dialog is lazy, like the panel.
    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Link Toto to an event' },
      { timeout: 10_000 },
    );
    expect(where(router)).toBe('/console/table/artists/toto?q=to');
    // The column's guesses come first.
    expect(
      within(dialog).getByRole('button', { name: 'Live Aid' }),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sends a song’s Label on no record to its own field in Details', async () => {
    const router = mount('/console/table/songs/africa?link=label', {
      input: withSongItem(),
    });
    await waitFor(() =>
      expect(where(router)).toBe('/console/table/songs/africa?field=label'),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    const label = field('label');
    expect(
      within(label).getByRole('button', { name: 'Set in Details: Label' }),
    ).toBeDefined();
  });

  it('offers no Link… or Confirm in repo mode, where nothing is written', () => {
    mount('/console/table/artists/toto', { mode: 'repo' });
    expect(
      within(field('events')).queryByRole('button', { name: /^Link/ }),
    ).toBeNull();
    expect(
      within(field('events')).queryByRole('button', { name: /^Confirm/ }),
    ).toBeNull();
  });

  it('lists every edge with the field that states it', () => {
    mount('/console/table/artists/toto');
    const all = within(panel()).getByRole('region', {
      name: /All connections/,
    });
    const featured = within(all).getByRole('region', { name: 'featured in' });
    // The event's own field, linked to the event's row.
    expect(hrefOf(/Live Aid\s+tags\[\]/, featured)).toBe(
      '/console/table/events/evt-live-aid',
    );
    const based = within(all).getByRole('region', { name: 'based in' });
    // The row's own field says "its".
    expect(within(based).getByText('its basedInPlaceId')).toBeDefined();
  });

  it('names a song pin as the pins, and opens the pin itself', () => {
    // Hall & Oates in Philadelphia only by where the globe pins their songs.
    const snapshot: GraphSnapshot = {
      artists: [{ slug: 'hall-and-oates', name: 'Hall & Oates' }],
      artistLocations: [
        { id: 'hall and oates', city: 'Philadelphia', country: 'US' },
      ],
    };
    const input = { graph: buildGraph(snapshot), snapshot, items: new Map() };
    const pinLink = () =>
      within(panel()).getByRole('link', { name: /^Song pins/ });

    // Where the API lists the pin, its item.
    mount('/console/table/artists/hall-and-oates', {
      input,
      pins: new Map([['hall and oates', 'db-pin-7']]),
    });
    expect(pinLink().textContent).toBe('Song pins ‘hall and oates’ city');
    expect(pinLink().getAttribute('href')).toBe(
      '/console/content/records/artist_location/db-pin-7',
    );
    cleanup();

    // Where it does not, the pins' list, searched for its key.
    mount('/console/table/artists/hall-and-oates', { input });
    expect(pinLink().getAttribute('href')).toBe(
      '/console/content/records/artist_location?q=hall+and+oates',
    );
  });

  it('names the file for a row that lives in code', () => {
    mount('/console/table/genres/rock');
    expect(within(panel()).getByText('Lives in code')).toBeDefined();
    expect(
      within(panel()).getByText('src/content/vocabulary/genres.json'),
    ).toBeDefined();
    expect(field('title').textContent).toContain('In code: genres.json');
    // No page, no full editor: a genre is a vocabulary entry.
    expect(
      within(panel()).queryByRole('link', { name: 'Open page' }),
    ).toBeNull();
  });

  it('offers the full editor where the panel edits only part', () => {
    mount('/console/table/songs/africa', { input: withSongItem() });
    expect(hrefOf(/Full editor/)).toBe(
      '/console/content/records/song/db-africa',
    );
    expect(hrefOf('Open page')).toBe('/console/content/songs/africa');
    // The key is the chart's: shown, and edited in its page editor.
    const key = panel().querySelector<HTMLElement>('[data-field~="key"]')!;
    expect(key.textContent).toContain('B major');
    expect(hrefOf('Edit in page editor', key)).toBe(
      '/console/content/songs/africa?edit=1',
    );
    // The credits in full: linked, unconfirmed, or a name found nowhere.
    const styles = [...field('credits').querySelectorAll('[data-style]')].map(
      (chip) => [
        chip.querySelector('a')?.textContent,
        chip.getAttribute('data-style'),
      ],
    );
    expect(styles).toEqual([
      ['David Paich', 'solid'],
      ['Jeff Porcaro', 'solid'],
      ['Jeff Porcaro', 'dashed'],
      ['Lenny Castro', 'hollow'],
    ]);
  });

  it('edits every kind a table holds, and the full editor has the rest', () => {
    // Every table's kind is edited in its panel, and has a kind spec, so the
    // content area edits it too.
    expect([...PANEL_EDIT_KINDS].sort()).toEqual(
      Object.keys(TABLE_FOR_CONTENT_KIND).sort(),
    );
    for (const kind of PANEL_EDIT_KINDS) {
      expect(Object.keys(CONTENT_KINDS), kind).toContain(kind);
    }
    // "Full editor" only where the panel edits part: the page editor's kinds.
    for (const kind of FULL_EDITOR_KINDS) {
      expect(PANEL_EDIT_KINDS.has(kind), kind).toBe(true);
      expect(CONTENT_KINDS[kind].FullEditor, kind).toBeDefined();
    }
    // The records' specs edit with the panel's own record editors.
    for (const [kind, { Editor, keys }] of Object.entries(RECORD_EDITORS)) {
      const spec = CONTENT_KINDS[kind as keyof typeof RECORD_EDITORS];
      expect(spec.StructuredEditor, kind).toBe(Editor);
      expect(spec.structuralKeys, kind).toEqual([...keys]);
      // The typed form never edits a key the record editor does.
      for (const key of spec.formKeys) {
        expect(keys as readonly string[], `${kind} ${key}`).not.toContain(key);
      }
    }
  });

  it('says where the rows come from in repo mode', () => {
    mount('/console/table/artists/toto', { mode: 'repo' });
    expect(
      within(panel()).getByText(
        'Repo snapshot: the repo’s copy of this row, not the working copy.',
      ),
    ).toBeDefined();
  });

  it('closes back to the table as it was left', () => {
    const router = mount('/console/table/genres/rock?q=ro&field=title');
    // A row nothing edits: the field asked for is the one marked.
    expect(field('title').dataset.focused).toBe('true');
    expect(field('artists').dataset.focused).toBeUndefined();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    expect(where(router)).toBe('/console/table/genres?q=ro');
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('says what it is for an item only the API has, in repo mode', () => {
    mount('/console/table/songs/brand-new', {
      mode: 'repo',
      input: fixtureInput({
        items: new Map<EntityId, TableItem>([
          [
            'song:brand-new',
            {
              id: 'db-new',
              status: 'draft',
              editState: null,
              body: null,
              title: 'Brand New',
            },
          ],
        ]),
      }),
    });
    expect(within(panel()).getByRole('heading', { level: 2 }).textContent).toBe(
      'Brand New',
    );
    expect(
      within(panel()).getByText('Not in the repo snapshot').parentElement
        ?.textContent,
    ).toContain('The full editor has the rest.');
    expect(hrefOf('Full editor')).toBe('/console/content/records/song/db-new');
    // The graph has no node to focus or page to open.
    expect(
      within(panel()).queryByRole('link', { name: 'Open in Cortex' }),
    ).toBeNull();
    expect(
      within(panel()).queryByRole('link', { name: 'Open page' }),
    ).toBeNull();
  });

  it('closes on Esc', () => {
    const router = mount('/console/table/events/evt-live-aid');
    fireEvent.keyDown(
      within(panel()).getByRole('link', { name: 'Open page' }),
      {
        key: 'Escape',
      },
    );
    expect(where(router)).toBe('/console/table/events');
  });

  it('says so for a row the table does not have', () => {
    const router = mount('/console/table/artists/nobody');
    expect(
      within(panel()).getByRole('heading', { name: 'Not in this table' }),
    ).toBeDefined();
    expect(panel().textContent).toContain('Artists has no artist “nobody”');
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    expect(where(router)).toBe('/console/table/artists');
  });

  it('is a sheet over the grid below xl', () => {
    wide = false;
    const router = mount('/console/table/artists/toto?q=toto');
    expect(screen.queryByRole('complementary')).toBeNull();
    const sheet = screen.getByRole('dialog', { name: 'Toto' });
    expect(
      within(sheet).getByRole('region', { name: 'Artist details' }),
    ).toBeDefined();
    // The sheet's own close is the only one.
    const closes = within(sheet).getAllByRole('button', { name: 'Close' });
    expect(closes).toHaveLength(1);
    fireEvent.click(closes[0]);
    expect(where(router)).toBe('/console/table/artists?q=toto');
  });
});

/* ── Editing ─────────────────────────────────────────────────────────── */

const PORCARO = ARTISTS[1] as unknown as Body;

/** Jeff Porcaro as a published item with nothing in review. */
const withPorcaro = () =>
  withItems([['artist:jeff-porcaro', 'db-porcaro', PORCARO]]);

const saveBar = () =>
  within(panel()).getByRole('contentinfo', { name: 'Save' });
const saveButton = (name: RegExp | string = /^(Save|Submit for review)$/) =>
  within(saveBar()).getByRole('button', { name });

/** The last save sent, once it has been. */
const sent = async (count = 1) => {
  await waitFor(() => expect(api.saves).toHaveLength(count));
  return api.saves[count - 1];
};

describe('suggestions in the row panel', () => {
  const cityFor = (slug: string) => ({
    suggestion: {
      id: `city-${slug}`,
      target: { kind: 'artist', slug },
      path: 'basedInPlaceId',
      op: 'set',
      value: 'los-angeles',
      display: 'City: Los Angeles',
      sources: [
        {
          provider: 'musicbrainz',
          url: 'https://musicbrainz.org/artist/x',
          label: 'area',
        },
      ],
      evidence: ['MusicBrainz area Los Angeles'],
      confidence: 0.9,
      tier: 'sure',
      batch: 'mb-test',
    },
    status: 'open',
    decision: null,
    unreviewed: false,
  });

  const accept = () =>
    within(
      within(panel()).getByText('City: Los Angeles').closest('article')!,
    ).getByRole('button', { name: /^Accept\b/ });

  it('lists them under Details, and holds an accept while there are unsaved changes', () => {
    suggested.served = true;
    suggested.rows = [cityFor('jeff-porcaro')];
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    expect(
      within(panel()).getByRole('region', { name: 'Suggestions · 1' }),
    ).toBeDefined();
    expect(accept()).toBeEnabled();

    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954-04-02' },
    });
    expect(accept()).toBeDisabled();
    expect(
      within(panel()).getByText(
        'Save or discard your changes first: accepting saves the item.',
      ),
    ).toBeDefined();
  });

  it('holds an admin’s accept while a proposal waits on the item', () => {
    suggested.served = true;
    suggested.rows = [cityFor('toto')];
    mount('/console/table/artists/toto');
    expect(accept()).toBeDisabled();
    // Said once, for every card, rather than on each.
    const section = within(panel()).getByRole('region', {
      name: /^Suggestions/,
    });
    expect(
      within(section).getAllByText(
        'Review the pending proposal first: approve or reject it above.',
      ),
    ).toHaveLength(1);
    expect(accept().title).toBe(
      'Review the pending proposal first: approve or reject it above.',
    );
  });

  it('has no section on a server without suggestions', () => {
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    expect(
      within(panel()).queryByRole('region', { name: /^Suggestions/ }),
    ).toBeNull();
  });
});

describe('when the item moves on the server', () => {
  const LIVE_AID = EVENTS[0] as unknown as Body;
  const withLiveAid = () =>
    withItems([['event:evt-live-aid', 'db-live-aid', LIVE_AID]]);
  /** Someone else saves the item: a newer version, as the API holds it. */
  const savedElsewhere = (body: Body) =>
    api.items.set(
      'db-live-aid',
      detail('db-live-aid', 'globe_event', body, {
        updatedAt: new Date(60_000),
      }),
    );
  const songs = () =>
    panel().querySelector<HTMLElement>('[data-field~="songIds"]')!;

  it('reads it again before saving, and lays the draft on what changed meanwhile', async () => {
    mount('/console/table/events/evt-live-aid', { input: withLiveAid() });
    fireEvent.click(within(songs()).getByRole('button', { name: 'None' }));
    // A Place accepted from elsewhere while this was open.
    savedElsewhere({ ...LIVE_AID, placeId: 'los-angeles' });
    fireEvent.click(saveButton('Save'));
    const save = await sent();
    // Both: theirs kept, this draft's change on it — never the old copy.
    expect(save.body).toStrictEqual({
      ...LIVE_AID,
      placeId: 'los-angeles',
      songIds: [],
    });
  });

  it('asks, rather than saving, where both changed the same field', async () => {
    mount('/console/table/events/evt-live-aid', { input: withLiveAid() });
    fireEvent.click(within(songs()).getByRole('button', { name: 'None' }));
    savedElsewhere({ ...LIVE_AID, songIds: ['rosanna'], placeId: 'gary' });
    fireEvent.click(saveButton('Save'));
    const asked = await within(saveBar()).findByRole('alert');
    expect(asked.textContent).toContain(
      'This item changed since you opened it, in songIds',
    );
    expect(api.saves).toHaveLength(0);
    expect(saveButton('Save')).toBeDisabled();

    // Keep mine for it: the draft's songIds over theirs, the rest theirs.
    fireEvent.click(
      within(asked).getByRole('button', { name: 'Keep mine for it' }),
    );
    expect(saveButton('Save')).toBeEnabled();
    fireEvent.click(saveButton('Save'));
    expect((await sent()).body).toStrictEqual({
      ...LIVE_AID,
      placeId: 'gary',
      songIds: [],
    });
  });

  it('reloads theirs, dropping the draft, when asked to', async () => {
    mount('/console/table/events/evt-live-aid', { input: withLiveAid() });
    fireEvent.click(within(songs()).getByRole('button', { name: 'None' }));
    savedElsewhere({ ...LIVE_AID, songIds: ['rosanna'] });
    fireEvent.click(saveButton('Save'));
    const asked = await within(saveBar()).findByRole('alert');
    fireEvent.click(
      within(asked).getByRole('button', { name: 'Reload theirs' }),
    );
    expect(within(saveBar()).queryByRole('alert')).toBeNull();
    expect(saveButton('Save')).toBeDisabled();
    expect(songs().textContent).not.toContain('Reviewed: no songs.');
    expect(api.saves).toHaveLength(0);
  });
});

describe('someone else’s proposal on the item', () => {
  const withPending = (over: Partial<Parameters<typeof detail>[3]>) => {
    const input = withPorcaro();
    api.items.set(
      'db-porcaro',
      detail('db-porcaro', 'artist', PORCARO, {
        pendingBody: { ...PORCARO, name: 'Jeffrey Porcaro' },
        pendingById: 'someone-else',
        pendingAt: new Date(30_000),
        editState: 'pending',
        ...over,
      }),
    );
    return input;
  };

  it('leaves an editor read-only, and never calls it theirs', () => {
    auth.role = 'editor';
    const input = withPending({ pendingBody: null, pendingNote: null });
    mount('/console/table/artists/jeff-porcaro', { input });
    expect(
      within(panel()).getByText(
        'Another editor’s proposal is waiting for review',
      ),
    ).toBeDefined();
    expect(within(panel()).queryByText('Submitted for review')).toBeNull();
    expect(
      within(panel()).getByText(/^Read-only: another editor’s proposal/),
    ).toBeDefined();
    expect(
      within(panel()).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
  });

  it('leaves an admin read-only while a proposal is sent back, not only while it waits', () => {
    mount('/console/table/artists/jeff-porcaro', {
      input: withPending({ editState: 'rejected', reviewNote: 'Not yet' }),
    });
    expect(within(panel()).getByText('You sent this back')).toBeDefined();
    expect(
      within(panel()).getByText(/^Sent back to its editor: nothing else/),
    ).toBeDefined();
    expect(
      within(panel()).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
  });
});

describe('editing in the row panel', () => {
  it('saves an admin’s edit of Born and City to the item, with its status', async () => {
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    const born =
      within(panel()).getByLabelText<HTMLInputElement>('Date of birth');
    expect(born.value).toBe('1954-04-01');
    // Nothing to save yet.
    expect(saveButton('Save')).toBeDisabled();

    fireEvent.change(born, { target: { value: '1954-04-02' } });
    await pick(
      within(panel()).getByRole('button', { name: 'City' }),
      'Los Angeles',
      /Los Angeles/,
    );
    expect(within(saveBar()).getByRole('status').textContent).toBe(
      'Unsaved changes',
    );
    // An admin sets the status the item is saved with.
    expect(
      within(saveBar()).getByRole<HTMLSelectElement>('combobox', {
        name: 'Status',
      }).value,
    ).toBe('published');
    fireEvent.click(saveButton('Save'));

    const save = await sent();
    expect(save).toStrictEqual({
      kind: 'artist',
      slug: 'jeff-porcaro',
      body: {
        ...PORCARO,
        born: { ...(PORCARO.born as Body), date: '1954-04-02' },
        basedInPlaceId: 'los-angeles',
      },
      status: 'published',
      note: undefined,
    });
    await waitFor(() =>
      expect(within(saveBar()).getByRole('status').textContent).toBe('Saved'),
    );
    expect(saveButton('Save')).toBeDisabled();
  });

  it('sends an editor’s edit as a proposal, with a note', async () => {
    auth.role = 'editor';
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954-04-02' },
    });
    // No status for an editor: whether it goes live is the review's call.
    expect(
      within(saveBar()).queryByRole('combobox', { name: 'Status' }),
    ).toBeNull();
    const note = within(saveBar()).getByLabelText('What changed');
    fireEvent.change(note, { target: { value: 'From the liner notes' } });
    fireEvent.click(saveButton('Submit for review'));

    const save = await sent();
    expect(save.status).toBeUndefined();
    expect(save.note).toBe('From the liner notes');
    expect((save.body as Body).born).toStrictEqual({
      ...(PORCARO.born as Body),
      date: '1954-04-02',
    });
    await waitFor(() =>
      expect(within(saveBar()).getByRole('status').textContent).toBe(
        'Sent for review',
      ),
    );
    expect(
      within(saveBar()).getByLabelText<HTMLInputElement>('What changed').value,
    ).toBe('');
  });

  it('creates an item for a row only the repo has, create-only', async () => {
    caps.create = true;
    // No item: the row is the repo's copy, which the new item starts from.
    mount('/console/table/artists/jeff-porcaro');
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954' },
    });
    fireEvent.click(saveButton('Save'));
    const save = await sent();
    expect(save).toMatchObject({
      kind: 'artist',
      slug: 'jeff-porcaro',
      create: true,
      status: 'draft',
    });
    // Then it is that item: the next save updates it, not creates it again.
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954-04' },
    });
    fireEvent.click(saveButton('Save'));
    expect((await sent(2)).create).toBeUndefined();
  });

  it('tells the grid which row it saved, which keeps it listed', async () => {
    const onEdited = vi.fn();
    mount('/console/table/artists/jeff-porcaro', {
      input: withPorcaro(),
      onEdited,
    });
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954-04-02' },
    });
    expect(onEdited).not.toHaveBeenCalled();
    fireEvent.click(saveButton('Save'));
    await sent();
    await waitFor(() => expect(onEdited).toHaveBeenCalledWith('jeff-porcaro'));
    expect(onEdited).toHaveBeenCalledTimes(1);
  });

  it('discards unsaved changes', () => {
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    const born =
      within(panel()).getByLabelText<HTMLInputElement>('Date of birth');
    fireEvent.change(born, { target: { value: '1999' } });
    fireEvent.click(within(saveBar()).getByRole('button', { name: 'Discard' }));
    expect(born.value).toBe('1954-04-01');
    expect(saveButton('Save')).toBeDisabled();
    expect(api.saves).toHaveLength(0);
  });

  it('says why a save was refused, and goes to the field it names', async () => {
    api.saveError = new ContentApiError(422, {
      error: 'Invalid artist body — Not a date the calendar has.',
      code: 'VALIDATION_FAILED',
      problems: [
        {
          code: 'INVALID_BODY',
          slug: 'jeff-porcaro',
          detail: 'Not a date the calendar has.',
          path: 'born.date',
        },
      ],
    });
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    const born = within(panel()).getByLabelText('Date of birth');
    fireEvent.change(born, { target: { value: '1954-02-30' } });
    fireEvent.click(saveButton('Save'));
    const alert = await within(saveBar()).findByRole('alert');
    expect(alert.textContent).toContain('Invalid artist body');
    fireEvent.click(within(alert).getByRole('button', { name: 'born.date' }));
    expect(document.activeElement).toBe(born);
    // Still unsaved: nothing was lost.
    expect(within(saveBar()).getByRole('status').textContent).toBe(
      'Unsaved changes',
    );
  });

  it('opens at the field the URL names, ready to type', () => {
    mount('/console/table/artists/jeff-porcaro?field=born', {
      input: withPorcaro(),
    });
    expect(document.activeElement).toBe(
      within(panel()).getByLabelText('Date of birth'),
    );
    cleanup();
    // A column the row edits under another name: City is basedInPlaceId.
    mount('/console/table/artists/jeff-porcaro?field=city', {
      input: withPorcaro(),
    });
    expect(document.activeElement).toBe(
      within(panel()).getByRole('button', { name: 'City' }),
    );
  });

  it('shows a pending proposal, and holds an admin’s edits until it is reviewed', async () => {
    api.items.set(
      'db-toto',
      detail('db-toto', 'artist', ITEMS.get('artist:toto')!.body as Body, {
        editState: 'pending',
        pendingNote: 'Added the bio',
        pendingBody: {
          ...(ITEMS.get('artist:toto')!.body as Body),
          bio: 'A proposed bio.',
        },
      }),
    );
    mount('/console/table/artists/toto');
    const body = panel();
    expect(within(body).getByText('An editor proposed changes')).toBeDefined();
    expect(within(body).getByText('“Added the bio”')).toBeDefined();
    expect(
      within(body).getByText(
        'Review the pending proposal first: approve or reject it above.',
      ),
    ).toBeDefined();
    // The live body, read-only, and nothing to save.
    const name = within(body).getByLabelText<HTMLInputElement>('Name');
    expect(name.closest('fieldset')).toBeDisabled();
    expect(
      within(body).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
    fireEvent.click(within(body).getByRole('button', { name: /Approve/ }));
    await waitFor(() => expect(api.approved).toEqual(['db-toto']));
  });

  it('lets an editor go on with their own proposal', () => {
    auth.role = 'editor';
    api.items.set(
      'db-toto',
      detail('db-toto', 'artist', ITEMS.get('artist:toto')!.body as Body, {
        editState: 'pending',
        pendingBody: {
          ...(ITEMS.get('artist:toto')!.body as Body),
          bio: 'A proposed bio.',
        },
      }),
    );
    mount('/console/table/artists/toto');
    // Seeded from their proposal, not the live body, and editable.
    expect(
      within(panel()).getByLabelText<HTMLTextAreaElement>('Bio').value,
    ).toBe('A proposed bio.');
    expect(
      within(panel()).getByLabelText('Name').closest('fieldset'),
    ).not.toBeDisabled();
    expect(within(panel()).getByText('Submitted for review')).toBeDefined();
    expect(saveButton('Submit for review')).toBeDefined();
  });

  it('asks before leaving a row with unsaved changes, not for the URL alone', async () => {
    const router = mount('/console/table/artists/jeff-porcaro', {
      input: withPorcaro(),
    });
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1954-04-02' },
    });
    // Only the query changes: no question.
    await router.navigate('/console/table/artists/jeff-porcaro?field=born');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(where(router)).toBe(
      '/console/table/artists/jeff-porcaro?field=born',
    );

    // Another row: asked, and still here.
    void router.navigate('/console/table/artists/toto');
    const ask = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
    });
    expect(router.state.location.pathname).toBe(
      '/console/table/artists/jeff-porcaro',
    );
    fireEvent.click(within(ask).getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(
      within(panel()).getByLabelText<HTMLInputElement>('Date of birth').value,
    ).toBe('1954-04-02');

    // Closing the panel is leaving too.
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', {
          name: 'Leave without saving?',
        }),
      ).getByRole('button', { name: 'Leave' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/console/table/artists'),
    );
  });

  it('is read-only in repo mode, and for a kind the API does not serve', () => {
    mount('/console/table/artists/jeff-porcaro', {
      input: withPorcaro(),
      mode: 'repo',
    });
    expect(
      within(panel()).getByText(/^Read-only: the rows are the repo’s snapshot/),
    ).toBeDefined();
    expect(
      within(panel()).getByLabelText('Date of birth').closest('fieldset'),
    ).toBeDisabled();
    expect(
      within(panel()).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
    cleanup();

    caps.served = ['song'];
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    expect(
      within(panel()).getByText(
        'Read-only: the content API does not serve artists yet.',
      ),
    ).toBeDefined();
    expect(
      within(panel()).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
  });

  describe('each kind in its own editor', () => {
    // Records, studios and labels the fixture Atlas has none of.
    const recordsInput = () => {
      const snapshot: GraphSnapshot = {
        ...SNAPSHOT,
        releases: [
          {
            slug: 'toto-iv',
            title: 'Toto IV',
            artistIds: ['toto'],
            format: 'album',
            year: 1982,
          },
        ],
        studios: [
          {
            slug: 'sunset-sound',
            name: 'Sunset Sound',
            placeId: 'los-angeles',
          },
        ],
        labels: [{ slug: 'columbia', name: 'Columbia' }],
      };
      return withItems(
        [
          [
            'release:toto-iv',
            'db-iv',
            snapshot.releases![0] as unknown as Body,
          ],
          [
            'studio:sunset-sound',
            'db-sunset',
            snapshot.studios![0] as unknown as Body,
          ],
          [
            'label:columbia',
            'db-columbia',
            snapshot.labels![0] as unknown as Body,
          ],
          ['place:los-angeles', 'db-la', PLACES[0] as unknown as Body],
        ],
        { graph: buildGraph(snapshot), snapshot, items: ITEMS },
      );
    };

    it.each([
      [
        'records/toto-iv',
        'Record details',
        'Title',
        'Toto IV',
        'release',
        'title',
      ],
      [
        'studios/sunset-sound',
        'Studio details',
        'Name',
        'Sunset Sound',
        'studio',
        'name',
      ],
      ['labels/columbia', 'Label details', 'Name', 'Columbia', 'label', 'name'],
      [
        'locations/los-angeles',
        'Place details',
        'Name',
        'Los Angeles',
        'globe_city',
        'name',
      ],
    ] as const)(
      '%s: its record editor, saved as that kind',
      async (path, region, label, value, kind, key) => {
        mount(`/console/table/${path}`, { input: recordsInput() });
        const editor = within(panel()).getByRole('region', { name: region });
        const input = within(editor).getByLabelText<HTMLInputElement>(label);
        expect(input.value).toBe(value);
        fireEvent.change(input, { target: { value: `${value} (edited)` } });
        fireEvent.click(saveButton('Save'));
        const save = await sent();
        expect(save.kind).toBe(kind);
        expect((save.body as Body)[key]).toBe(`${value} (edited)`);
        // No full editor: the panel edits all of it.
        expect(
          within(panel()).queryByRole('link', { name: /Full editor/ }),
        ).toBeNull();
      },
    );

    it('progressions: the progression editor', () => {
      mount('/console/table/progressions/2');
      expect(
        within(panel()).getByRole('region', { name: 'Progression details' }),
      ).toBeDefined();
    });

    it('songs: the year, the key as the chart has it, and the connections', async () => {
      mount('/console/table/songs/africa', { input: withSongItem() });
      const year = within(panel()).getByLabelText<HTMLInputElement>('Year');
      expect(year.value).toBe('1982');
      // The song editor's connections, with the v2 pickers at song v2.
      expect(
        within(panel()).getByRole('button', { name: 'Add a record' }),
      ).toBeDefined();
      fireEvent.change(year, { target: { value: '1983' } });
      fireEvent.click(saveButton('Save'));
      const save = await sent();
      expect(save.kind).toBe('song');
      expect(save.slug).toBe('africa');
      // One field changed; the chart's fields as they were.
      expect(save.body).toStrictEqual({ ...SONGS[0], year: 1983 });
    });

    it('songs: the title, and a popularity from 0 to 100', async () => {
      mount('/console/table/songs/africa', { input: withSongItem() });
      const details = within(panel()).getByRole('region', {
        name: 'Song details',
      });
      const title = within(details).getByLabelText<HTMLInputElement>('Title');
      expect(title.value).toBe('Africa');
      // A song needs its title: cleared, it is kept empty and asked for.
      fireEvent.change(title, { target: { value: '' } });
      expect(within(details).getByText('Needs title.')).toBeDefined();
      fireEvent.change(title, { target: { value: 'Africa (Remastered)' } });

      const popularity =
        within(details).getByLabelText<HTMLInputElement>('Popularity');
      expect(popularity.value).toBe('');
      // Out of range: it stays as typed, with why, and nothing is written.
      fireEvent.change(popularity, { target: { value: '150' } });
      expect(popularity.value).toBe('150');
      expect(popularity).toHaveAttribute('aria-invalid', 'true');
      expect(
        within(details).getByText(
          'Popularity is a whole number from 0 to 100.',
        ),
      ).toBeDefined();
      fireEvent.change(popularity, { target: { value: '85' } });
      expect(popularity).not.toHaveAttribute('aria-invalid');

      fireEvent.click(saveButton('Save'));
      const save = await sent();
      expect(save.body).toStrictEqual({
        ...SONGS[0],
        title: 'Africa (Remastered)',
        popularity: 85,
      });
    });

    it('songs: a refused popularity holds the save, typed key by key', async () => {
      mount('/console/table/songs/africa', { input: withSongItem() });
      const details = within(panel()).getByRole('region', {
        name: 'Song details',
      });
      const popularity =
        within(details).getByLabelText<HTMLInputElement>('Popularity');
      const problem = 'Popularity is a whole number from 0 to 100.';
      // "1" and "15" are written on the way to "150", which is refused:
      // Save waits, so it cannot write the 15 the box no longer shows.
      for (const typed of ['1', '15', '150']) {
        fireEvent.change(popularity, { target: { value: typed } });
      }
      expect(popularity.value).toBe('150');
      expect(popularity).toHaveAttribute('aria-invalid', 'true');
      expect(saveButton('Save')).toBeDisabled();
      expect(within(saveBar()).getByRole('status').textContent).toBe(problem);

      // A lone "-" is refused too, not read as clearing the field.
      fireEvent.change(popularity, { target: { value: '-' } });
      expect(popularity.value).toBe('-');
      expect(saveButton('Save')).toBeDisabled();

      // Discard puts the value back from outside: what was refused goes.
      fireEvent.click(
        within(saveBar()).getByRole('button', { name: 'Discard' }),
      );
      expect(popularity.value).toBe('');
      expect(popularity).not.toHaveAttribute('aria-invalid');
      expect(within(details).queryByText(problem)).toBeNull();

      for (const typed of ['1', '15', '150', '15']) {
        fireEvent.change(popularity, { target: { value: typed } });
      }
      expect(popularity).not.toHaveAttribute('aria-invalid');
      fireEvent.click(saveButton('Save'));
      const save = await sent();
      expect(save.body).toStrictEqual({ ...SONGS[0], popularity: 15 });
    });

    // A row of each table the panel edits: its Details are the kind's editor.
    // A group, for the artists: Members is a group's field.
    const ROW_OF: Record<string, string> = {
      artists: 'hall-and-oates',
      songs: 'africa',
      locations: 'los-angeles',
      events: 'evt-live-aid',
      records: 'toto-iv',
      studios: 'sunset-sound',
      labels: 'columbia',
      progressions: '2',
    };

    it('has a field in Details for every column the row states itself', () => {
      // Every table whose rows the panel edits: a new one needs a row here.
      const edited = Object.values(TABLES).filter(
        (def) =>
          def.contentKind !== undefined &&
          PANEL_EDIT_KINDS.has(def.contentKind) &&
          def.panel !== 'code',
      );
      expect(edited.map((def) => def.id).sort()).toEqual(
        Object.keys(ROW_OF).sort(),
      );
      const input = recordsInput();
      for (const def of edited) {
        mount(`/console/table/${def.id}/${ROW_OF[def.id]}`, { input });
        // Details alone: the Connections below name each column too, and
        // must not stand in for a field the editor lacks.
        const details = within(panel()).getByRole('region', {
          name: 'Details',
        });
        for (const column of def.columns) {
          const { edit } = column;
          if (edit.by !== 'row') continue;
          const where = `${def.id}: ${column.label} (${edit.path})`;
          // The field that edits the column's path…
          const anchor = findAnchor(details, [edit.path, ...(edit.also ?? [])]);
          expect(anchor, where).toBeDefined();
          // …is where `?field=` goes: a double-click on the cell lands there.
          expect(findField(details, def, column.id), where).toBe(anchor);
        }
        cleanup();
      }
    });

    const withLiveAid = () =>
      withItems([
        ['event:evt-live-aid', 'db-live-aid', EVENTS[0] as unknown as Body],
      ]);

    it('events: keeps the sure matches, stored — a name in doubt only if picked', async () => {
      // Matched from its tags: Toto (one word: in doubt) and David Paich.
      const graph = assembleGraph(
        [...fixtureGraph().nodes.values()],
        [
          ...EDGES,
          {
            from: 'event:evt-live-aid',
            kind: 'about',
            to: 'artist:david-paich',
            via: { item: 'event:evt-live-aid', path: 'tags[]' },
            inferred: true,
          },
        ],
      );
      mount('/console/table/events/evt-live-aid', {
        input: withItems(
          [['event:evt-live-aid', 'db-live-aid', EVENTS[0] as unknown as Body]],
          fixtureInput({ graph }),
        ),
      });
      const artists = panel().querySelector<HTMLElement>(
        '[data-field~="artistIds"]',
      )!;
      const matched = within(artists).getByRole('group', {
        name: 'Matched artists',
      });
      expect(matched.textContent).toContain('Toto?');
      expect(matched.textContent).toContain('(matched, in doubt, not stored)');
      expect(matched.textContent).toContain('David Paich');
      fireEvent.click(
        within(artists).getByRole('button', {
          name: 'Keep the sure match',
        }),
      );
      expect(artists.textContent).not.toContain('sure match');
      fireEvent.click(saveButton('Save'));
      const save = await sent();
      expect(save.kind).toBe('globe_event');
      expect(save.body).toStrictEqual({
        ...EVENTS[0],
        artistIds: ['david-paich'],
      });
    });

    it('events: none is stored as [], and matching comes back', async () => {
      mount('/console/table/events/evt-live-aid', { input: withLiveAid() });
      const artists = panel().querySelector<HTMLElement>(
        '[data-field~="artistIds"]',
      )!;
      fireEvent.click(within(artists).getByRole('button', { name: 'None' }));
      expect(artists.textContent).toContain('Reviewed: no artists.');
      fireEvent.click(saveButton('Save'));
      expect((await sent()).body).toStrictEqual({
        ...EVENTS[0],
        artistIds: [],
      });
      fireEvent.click(
        within(artists).getByRole('button', { name: 'Back to matching' }),
      );
      fireEvent.click(saveButton('Save'));
      expect((await sent(2)).body).toStrictEqual(EVENTS[0]);
      // Its city matches no place: it says so.
      expect(
        panel().querySelector('[data-field~="placeId"]')?.textContent,
      ).toContain('Its city “Gary” matches no place: pick one.');
    });

    it('events: below the event body v2 the ids are shown, not edited', () => {
      caps.levels.globe_event = 1;
      mount('/console/table/events/evt-live-aid', { input: withLiveAid() });
      const artists = panel().querySelector<HTMLElement>(
        '[data-field~="artistIds"]',
      )!;
      expect(
        within(artists).getByRole('button', { name: 'None' }),
      ).toBeDisabled();
      expect(panel().textContent).toContain(
        'Saved once the server takes the event body v2',
      );
    });
  });
});

describe('a long list', () => {
  it(`shows ${LIST_LIMIT}, then the rest on asking`, () => {
    const entries = Array.from({ length: LIST_LIMIT + 5 }, (_, i) => ({
      node: `song:s${i}` as EntityId,
      label: `Song ${i}`,
      style: 'solid' as const,
      weight: 1,
      muted: false,
    }));
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <ColumnList
              column={{
                total: entries.length,
                parts: [{ id: 'songs', label: 'songs', role: 'fact', entries }],
              }}
            />
          ),
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(LIST_LIMIT);
    fireEvent.click(
      screen.getByRole('button', { name: `Show all ${LIST_LIMIT + 5}` }),
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(LIST_LIMIT + 5);
  });
});

describe('the draft’s own connections, before it is saved', () => {
  const all = () =>
    within(panel()).getByRole('region', { name: /All connections/ });
  /** The row's edges the draft changes, as "label · mark". */
  const drafted = () =>
    [...all().querySelectorAll<HTMLElement>('[data-draft]')].map(
      (line) =>
        `${line.querySelector('[data-style] a')?.textContent} · ${line.dataset.draft}`,
    );

  it('lays the draft over what is saved, marking what the save changes', async () => {
    mount('/console/table/artists/jeff-porcaro', { input: withPorcaro() });
    // Nothing unsaved: the graph's edges, as saved.
    expect(drafted()).toEqual([]);
    expect(all().querySelector('[data-draft-summary]')).toBeNull();

    await pick(
      within(panel()).getByRole('button', { name: 'City' }),
      'Los Angeles',
      /Los Angeles/,
    );
    fireEvent.change(within(panel()).getByLabelText('Date of birth'), {
      target: { value: '1955-04-01' },
    });
    await waitFor(() =>
      expect(drafted().sort()).toEqual([
        '1954 · removed',
        '1955 · added',
        'Los Angeles · added',
      ]),
    );
    expect(all().querySelector('[data-draft-summary]')?.textContent).toBe(
      'Saving adds 2 connections and removes 1.',
    );
    // Said in words too, not only in colour.
    const city = within(all()).getByRole('region', { name: 'based in' });
    expect(city.textContent).toContain('your unsaved changes add it');
    // The columns above walk the graph as saved.
    expect(
      within(
        within(panel()).getByRole('region', { name: 'Connections' }),
      ).getByText('As saved'),
    ).toBeDefined();

    // Discarded: back to what is saved.
    fireEvent.click(within(saveBar()).getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(drafted()).toEqual([]));
    expect(all().querySelector('[data-draft-summary]')).toBeNull();
  });

  it('shows an event’s guesses stored or dropped as the draft decides', async () => {
    // Matched from its tags: Toto (one word: in doubt) and David Paich.
    const graph = assembleGraph(
      [...fixtureGraph().nodes.values()],
      [
        ...EDGES,
        {
          from: 'event:evt-live-aid',
          kind: 'about',
          to: 'artist:david-paich',
          via: { item: 'event:evt-live-aid', path: 'tags[]' },
          inferred: true,
        },
      ],
    );
    mount('/console/table/events/evt-live-aid', {
      input: withItems(
        [['event:evt-live-aid', 'db-live-aid', EVENTS[0] as unknown as Body]],
        fixtureInput({ graph }),
      ),
    });
    const line = (name: string) =>
      within(all()).getByRole('link', { name }).closest('li')!;
    const style = (name: string) =>
      line(name).querySelector('[data-style]')?.getAttribute('data-style');
    expect(style('David Paich')).toBe('dotted');

    fireEvent.click(
      within(
        panel().querySelector<HTMLElement>('[data-field~="artistIds"]')!,
      ).getByRole('button', { name: 'Keep the sure match' }),
    );
    // The sure one stored, so solid; the one in doubt not, so gone.
    await waitFor(() =>
      expect(drafted().sort()).toEqual([
        'David Paich · restyled',
        'Toto · removed',
      ]),
    );
    expect(style('David Paich')).toBe('solid');
    expect(line('David Paich').textContent).toContain('was guessed');
    expect(all().querySelector('[data-draft-summary]')?.textContent).toBe(
      'Saving removes 1 connection and changes how sure 1 is.',
    );
  });
});
