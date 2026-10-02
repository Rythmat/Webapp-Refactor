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
import { useSyncExternalStore } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  useParams,
  useSearchParams,
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
import { assembleGraph } from '@/content/graph/deriveGraph';
import { resetSessionEntitiesForTests } from '@/features/admin/content/entities/sessionEntities';
import { GuardOutlet } from '@/features/admin/content/mirror/UnsavedChangesGuard';
import { ContentApiError } from '@/hooks/data/admin/useAdminContent';
import { NEW_PARAM } from '../grid/tableQuery';
import {
  getTableModel,
  type TableInput,
  type TableItem,
} from '../model/buildTableModel';
import { NewItemPanel } from '../panel/NewItemPanel';
import type { TableId } from '../tableIds';
import { api, caps, resetPanelApi } from './panelApi';
import { EDGES, fixtureGraph, fixtureInput } from './tableFixtures';

/**
 * "New …" in the row panel: the kind's editor over a new body, its id from
 * its name, made create-only — an admin's as a draft, an editor's as a
 * proposal — after looking at what the table already has; then its row.
 */

const auth = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role, token: null }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) =>
  (await import('./panelApi')).fakeItemHooks(await importOriginal<object>()),
);
vi.mock('@/hooks/data/admin/useCapabilities', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCapabilities: (await import('./panelApi')).fakeCapabilities,
}));

beforeAll(() => {
  // cmdk scrolls the active option into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  auth.role = 'admin';
  resetPanelApi();
  caps.create = true;
  table.set(fixtureInput());
  window.matchMedia = ((query: string) => ({
    matches: query === '(min-width: 1280px)',
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

/** The table's rows as a little store: a save's rebuild lands by `set`. */
const table = {
  input: fixtureInput(),
  listeners: new Set<() => void>(),
  set(next: TableInput) {
    this.input = next;
    for (const listener of this.listeners) listener();
  },
};
const subscribe = (listener: () => void) => {
  table.listeners.add(listener);
  return () => table.listeners.delete(listener);
};

const Harness = () => {
  const { table: id, row } = useParams();
  const [params] = useSearchParams();
  const input = useSyncExternalStore(subscribe, () => table.input);
  const model = getTableModel(input, id as TableId);
  const name = params.get(NEW_PARAM);
  if (row) return <p>Row {row}</p>;
  return name === null ? null : (
    <NewItemPanel model={model} name={name} mode="working" />
  );
};

const mount = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <GuardOutlet />,
        children: [
          { path: '/console/table/:table/:row?', element: <Harness /> },
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

const panel = () => screen.getByRole('complementary');
const saveBar = () =>
  within(panel()).getByRole('contentinfo', { name: 'Save' });
const makeButton = (name: RegExp | string = /^(Create|Submit for review)$/) =>
  within(saveBar()).getByRole('button', { name });
const statusLine = () => within(saveBar()).getByRole('status').textContent;

const sent = async (count = 1) => {
  await waitFor(() => expect(api.saves).toHaveLength(count));
  return api.saves[count - 1];
};

describe('New … in the panel', () => {
  it('makes an admin’s artist as a draft, create-only, named from the search, then opens its row', async () => {
    const router = mount('/console/table/artists?q=Stevie&new=Stevie%20Wonder');
    expect(
      within(panel()).getByRole('heading', { name: 'New artist' }),
    ).toBeDefined();
    // The editor's own Name, ready to type in, and the id it makes.
    const name = within(panel()).getByRole('textbox', { name: /^Name/ });
    expect((name as HTMLInputElement).value).toBe('Stevie Wonder');
    expect(document.activeElement).toBe(name);
    expect(panel().textContent).toContain('Id: artist:stevie-wonder');

    fireEvent.click(makeButton('Create'));
    const save = await sent();
    // No note from an admin: the revision says what the body does.
    expect(save).toEqual({
      kind: 'artist',
      slug: 'stevie-wonder',
      body: { slug: 'stevie-wonder', name: 'Stevie Wonder' },
      status: 'draft',
      create: true,
    });

    // Once the table has it, its row opens, the search kept.
    const items = new Map<string, TableItem>(table.input.items);
    items.set('artist:stevie-wonder', {
      id: 'db-new-stevie-wonder',
      status: 'draft',
      editState: null,
      body: save.body as Record<string, unknown>,
    });
    const graph = assembleGraph(
      [
        ...fixtureGraph().nodes.values(),
        {
          id: 'artist:stevie-wonder',
          kind: 'artist',
          label: 'Stevie Wonder',
          status: 'draft',
          origin: 'api',
        },
      ],
      EDGES,
    );
    act(() =>
      table.set(fixtureInput({ items: items as TableInput['items'], graph })),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/console/table/artists/stevie-wonder',
      ),
    );
    expect(router.state.location.search).toBe('?q=Stevie');
  });

  it('once made, keeps its id and saves it, rather than making another', async () => {
    mount('/console/table/artists?new=Stevie%20Wonder');
    fireEvent.click(makeButton('Create'));
    await sent();
    // Made, and the table has not caught up yet: no Create any more.
    await waitFor(() =>
      expect(
        within(saveBar()).queryByRole('button', { name: 'Create' }),
      ).toBeNull(),
    );
    expect(makeButton('Save')).toBeDisabled();
    fireEvent.change(within(panel()).getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Stevland Morris' },
    });
    fireEvent.click(makeButton('Save'));
    const again = await sent(2);
    // The same item, by its id; never a second create.
    expect(again.slug).toBe('stevie-wonder');
    expect(again.create).toBeUndefined();
    expect(again.body).toMatchObject({
      slug: 'stevie-wonder',
      name: 'Stevland Morris',
    });
  });

  it('sends an editor’s as a proposal, with a note', async () => {
    auth.role = 'editor';
    mount('/console/table/labels?new=Motown');
    expect(
      within(saveBar()).queryByRole('combobox', { name: 'Status' }),
    ).toBeNull();
    fireEvent.change(within(saveBar()).getByLabelText('What changed'), {
      target: { value: 'Tamla’s parent' },
    });
    fireEvent.click(makeButton('Submit for review'));
    const save = await sent();
    expect(save).toStrictEqual({
      kind: 'label',
      slug: 'motown',
      body: { slug: 'motown', name: 'Motown' },
      status: undefined,
      note: 'Tamla’s parent',
      create: true,
    });
  });

  it('opens the row an id is taken by, rather than making it again, and names the near ones', () => {
    mount('/console/table/artists?new=Toto');
    expect(panel().textContent).toContain(
      'Toto already has the id “toto”. Open it',
    );
    expect(
      within(panel())
        .getByRole('link', { name: 'Open it' })
        .getAttribute('href'),
    ).toBe('/console/table/artists/toto');
    expect(makeButton('Create')).toBeDisabled();
    expect(statusLine()).toBe('Toto already has this id.');
    cleanup();

    // One letter off: probably the same act.
    mount('/console/table/artists?new=Totto');
    const near = within(panel()).getByText(
      'Is it one of these?',
    ).parentElement!;
    expect(within(near).getByRole('link', { name: 'Toto' })).toBeDefined();
    expect(makeButton('Create')).toBeEnabled();
  });

  it('waits for what the kind needs: a record’s billed artist and format', () => {
    mount('/console/table/records?new=Toto%20IV');
    expect(makeButton('Create')).toBeDisabled();
    expect(statusLine()).toBe('Needs the billed artist, a format.');
    fireEvent.change(
      within(panel()).getByRole('combobox', { name: 'Format' }),
      {
        target: { value: 'album' },
      },
    );
    expect(statusLine()).toBe('Needs the billed artist.');
  });

  it('numbers a progression from the high-water mark, from the chords typed', async () => {
    // Ids are never reused (UNISON stores them), so a new progression takes
    // the next id above PROGRESSION_ID_HIGH_WATER (698), not one past the
    // highest the fixture holds (2).
    mount('/console/table/progressions?new=');
    expect(panel().textContent).toContain('Id: 699');
    // The chord chips take a whole line typed or pasted into Add a chord.
    fireEvent.click(within(panel()).getByRole('button', { name: 'Add chord' }));
    const box = within(panel()).getByRole('combobox', { name: 'Add a chord' });
    fireEvent.change(box, {
      target: { value: '1 major7 - 4 major7 - 5 dominant7' },
    });
    fireEvent.keyDown(box, { key: 'Enter' });
    // Its complexity is the author's to say, not a default.
    expect(statusLine()).toBe('Needs a complexity.');
    fireEvent.change(
      within(panel()).getByRole('combobox', { name: 'Complexity' }),
      { target: { value: '7th' } },
    );
    fireEvent.click(makeButton('Create'));
    const save = await sent();
    expect(save.slug).toBe('699');
    expect(save.body).toMatchObject({
      id: 699,
      progression: '1 major7 - 4 major7 - 5 dominant7',
      chords: ['1 major7', '4 major7', '5 dominant7'],
      chordCount: 3,
      startingChord: '1 major7',
      startingDegree: '1',
      complexity: '7th',
    });
  });

  it('makes a song with its billing and key, the chart left to its page', async () => {
    mount('/console/table/songs?new=Hold%20On');
    expect(panel().textContent).toContain('Id: hold_on');
    // One Title: the new song's own, not the song details' as well.
    expect(within(panel()).getAllByLabelText('Title')).toHaveLength(1);
    expect(panel().querySelectorAll('[data-field="title"]')).toHaveLength(1);
    // No key chosen for it: the chart's every chord is a degree of it.
    expect(statusLine()).toBe('Needs the artist it is by, the key.');
    fireEvent.change(within(panel()).getByRole('textbox', { name: 'Artist' }), {
      target: { value: 'Wilson Phillips' },
    });
    fireEvent.change(
      within(panel()).getByRole('combobox', { name: 'Key root' }),
      {
        target: { value: '5' },
      },
    );
    expect(statusLine()).toBe('Needs the key.');
    fireEvent.change(within(panel()).getByRole('combobox', { name: 'Mode' }), {
      target: { value: 'major' },
    });
    fireEvent.click(makeButton('Create'));
    const save = await sent();
    expect(save.slug).toBe('hold_on');
    expect(save.body).toMatchObject({
      id: 'hold_on',
      title: 'Hold On',
      artist: 'Wilson Phillips',
      key: 'F major',
      keyRoot: 65,
      mode: 'major',
    });
    // A chart to start from, as the page editor's New makes one.
    expect((save.body as { sections: unknown[] }).sections).toHaveLength(1);
  });

  it('waits for where an event happened', () => {
    mount('/console/table/events?new=Summer%20of%20Love');
    expect(panel().textContent).toContain('Id: evt-summer-of-love');
    // Not this year by default: the author says when.
    expect(statusLine()).toBe('Needs the year, where it happened.');
  });

  it('says so when someone made the id meanwhile', async () => {
    api.saveError = new ContentApiError(409, {
      error: 'A studio with the slug "sunset-sound-2" exists.',
      code: 'SLUG_TAKEN',
    });
    mount('/console/table/studios?new=Sunset%20Sound%202');
    fireEvent.click(within(panel()).getByRole('button', { name: 'City' }));
    const search = await screen.findByPlaceholderText(/^Find /);
    fireEvent.change(search, { target: { value: 'Los Angeles' } });
    await screen.findAllByRole('option', { name: /Los Angeles/ });
    fireEvent.keyDown(search, { key: 'Tab' });
    await waitFor(() => expect(makeButton('Create')).toBeEnabled());
    fireEvent.click(makeButton('Create'));
    expect(
      await within(panel()).findByText(/Someone made “sunset-sound-2”/),
    ).toBeDefined();
  });

  it('asks before closing over what was typed', async () => {
    const router = mount('/console/table/labels?new=');
    fireEvent.change(within(panel()).getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Stax' },
    });
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    const ask = await screen.findByRole('alertdialog', {
      name: 'Leave without saving?',
    });
    fireEvent.click(within(ask).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.search).toBe('?new=');
    // Esc is Stay too.
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(
      await screen.findByRole('alertdialog', { name: 'Leave without saving?' }),
      { key: 'Escape' },
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(router.state.location.search).toBe('?new=');
    fireEvent.click(within(panel()).getByRole('button', { name: 'Close' }));
    fireEvent.click(
      within(
        await screen.findByRole('alertdialog', {
          name: 'Leave without saving?',
        }),
      ).getByRole('button', { name: 'Leave' }),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('makes nothing of a kind the API does not store, and says why', () => {
    caps.served = caps.served.filter((kind) => kind !== 'studio');
    mount('/console/table/studios?new=Room');
    expect(panel().textContent).toContain(
      'The content API does not store studios yet',
    );
    expect(
      within(panel()).queryByRole('contentinfo', { name: 'Save' }),
    ).toBeNull();
  });

  it('refuses a studio, label or record on a server without create-only', () => {
    caps.create = false;
    mount('/console/table/labels?new=Motown');
    expect(panel().textContent).toContain('it has no create-only save');
  });
});
