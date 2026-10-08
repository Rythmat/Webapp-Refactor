// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MirrorBar } from '../MirrorBar';

/**
 * The content area's bar and the Table: Page | Table on a mirrored page goes
 * to where that page is in the Table — its row when it is about one thing —
 * "Edit event" opens the event's row, and the Records menu lists the Table
 * and the records that are in none of its categories.
 */

const auth = vi.hoisted(() => ({ role: 'admin' as string }));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ role: auth.role }),
}));
vi.mock('../../publishing/ChangesButton', () => ({
  ChangesButton: () => <button type="button">Changes</button>,
}));
// Which store the console saves to: the content API, or repo mode's files.
const capabilities = vi.hoisted(() => ({ store: 'api' as 'api' | 'repo' }));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({ store: capabilities.store }),
}));
// The items the store holds, by id: what an item's full editor has open.
const stored = vi.hoisted(
  () =>
    new Map<string, { slug: string }>([['db-evt', { slug: 'evt-live-aid' }]]),
);
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useContentItem: (id: string | undefined) => ({
    data: id ? stored.get(id) : undefined,
  }),
}));

afterEach(() => {
  cleanup();
  capabilities.store = 'api';
});

const renderAt = (path: string, role = 'admin') => {
  auth.role = role;
  render(
    <MemoryRouter initialEntries={[path]}>
      <MirrorBar />
    </MemoryRouter>,
  );
};

/** The Page | Table toggle's Table: its link, or null when it is current. */
const tableToggle = () => {
  const view = screen.queryByRole('group', { name: 'View' });
  if (!view) return undefined;
  const link = within(view).queryByRole('link', { name: 'Table' });
  return link ? link.getAttribute('href') : null;
};

const openRecords = () => {
  fireEvent.keyDown(screen.getByRole('button', { name: /Records/ }), {
    key: 'Enter',
  });
  return screen.getByRole('menu');
};

const menuLinks = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => [item.textContent, item.getAttribute('href')]);

describe('the bar’s way into the Table', () => {
  it.each([
    ['/console/content/songs/africa', '/console/table/songs/africa'],
    ['/console/content/songs/africa?edit=1', '/console/table/songs/africa'],
    ['/console/content/songs', '/console/table/songs'],
    ['/console/content/learn?tab=Songs', '/console/table/songs'],
    [
      '/console/content/atlas/globe?event=evt-woodstock',
      '/console/table/events/evt-woodstock',
    ],
    // A song's own globe event is the song.
    [
      '/console/content/atlas/globe?event=song-africa',
      '/console/table/songs/africa',
    ],
    [
      '/console/content/atlas/globe?artist=Marvin%20Gaye',
      '/console/table/artists/marvin-gaye',
    ],
    [
      '/console/content/atlas/globe?place=city%3Adetroit',
      '/console/table/locations/detroit',
    ],
    ['/console/content/atlas/globe', '/console/table/events'],
    // Lessons are in no category: their list is one of the other records.
    ['/console/content/curriculum', '/console/content/records/activity_flow'],
  ])('%s → %s', (path, table) => {
    renderAt(path);
    expect(tableToggle()).toBe(table);
  });

  it('has no Table for a page the Table does not hold', () => {
    renderAt('/console/content/home');
    expect(tableToggle()).toBeUndefined();
  });

  it('keeps Page on a list of the other records', () => {
    renderAt('/console/content/records/artist_location');
    const view = within(screen.getByRole('group', { name: 'View' }));
    expect(view.getByRole('link', { name: 'Page' })).toBeDefined();
    // The list itself is the table here.
    expect(tableToggle()).toBeNull();
  });

  it('takes an item’s full editor to its kind’s table, not calling itself one', () => {
    // Until the item has loaded (here, never), the kind's table.
    renderAt('/console/content/records/song/db-africa');
    expect(tableToggle()).toBe('/console/table/songs');
    expect(menuLinks(openRecords())[0]).toEqual([
      'Table',
      '/console/table/songs',
    ]);
    cleanup();
    // A new item has no row yet.
    renderAt('/console/content/records/globe_city/new');
    expect(tableToggle()).toBe('/console/table/locations');
    cleanup();
    // An other record's editor goes back to its list.
    renderAt('/console/content/records/artist_location/db-1');
    expect(tableToggle()).toBe('/console/content/records/artist_location');
  });

  it('takes an item’s full editor to its row, once the item has loaded', () => {
    renderAt('/console/content/records/globe_event/db-evt');
    expect(tableToggle()).toBe('/console/table/events/evt-live-aid');
    expect(menuLinks(openRecords())[0]).toEqual([
      'Table',
      '/console/table/events/evt-live-aid',
    ]);
  });

  it('opens an event’s row to edit it, and a song’s event on its page', () => {
    renderAt('/console/content/atlas/globe?event=evt-woodstock');
    expect(
      screen.getByRole('link', { name: 'Edit event' }).getAttribute('href'),
    ).toBe('/console/table/events/evt-woodstock');
    cleanup();
    renderAt('/console/content/atlas/globe?event=song-africa');
    expect(
      screen.getByRole('link', { name: 'Edit song' }).getAttribute('href'),
    ).toBe('/console/content/songs/africa?edit=1');
  });
});

describe('the Records menu', () => {
  it('lists the Table, the other records, then the vocabulary and import', () => {
    renderAt('/console/content/songs/africa');
    expect(menuLinks(openRecords())).toEqual([
      ['Table', '/console/table/songs/africa'],
      ['Lessons', '/console/content/records/activity_flow'],
      ['Fundamentals', '/console/content/records/fundamentals_flow'],
      ['Artist locations', '/console/content/records/artist_location'],
      ['Feels', '/console/content/records/feel_profile'],
      ['Vocabulary', '/console/content/records/vocabulary'],
      ['Import songs', '/console/content/publishing/import'],
      // Instrument content, in its own group.
      ['Parts Library', '/console/parts'],
      ['Drum Grooves', '/console/grooves'],
    ]);
    expect(
      within(screen.getByRole('menu')).getAllByRole('separator'),
    ).toHaveLength(2);
  });

  it('opens the first table from a page the Table does not hold', () => {
    // The bare /console/table opens Cortex's graph now, so the menu's Table
    // names a table: the first one, artists.
    renderAt('/console/content/curriculum', 'editor');
    const links = menuLinks(openRecords());
    expect(links[0]).toEqual(['Table', '/console/table/artists']);
    // The import writes the store: admins only.
    expect(links.map(([label]) => label)).not.toContain('Import songs');
  });

  it('offers no import in repo mode, where the repo is the store', () => {
    capabilities.store = 'repo';
    renderAt('/console/content/songs/africa');
    const labels = menuLinks(openRecords()).map(([label]) => label);
    expect(labels).toContain('Vocabulary');
    expect(labels).not.toContain('Import songs');
  });
});

describe('the bar’s way out to Cortex', () => {
  const cortexLink = () => screen.getByRole('link', { name: 'Cortex' });

  it('opens the page’s item in Cortex, and never claims the graph', () => {
    renderAt('/console/content/songs/africa');
    expect(cortexLink().getAttribute('href')).toBe(
      '/console/cortex?focus=song%3Aafrica',
    );
    // The graph is Cortex's page, not the content area's: never lit here.
    expect(cortexLink().getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Graph' })).toBeNull();
  });

  it('opens the whole Atlas from a page about no one item', () => {
    renderAt('/console/content/publishing', 'editor');
    expect(cortexLink().getAttribute('href')).toBe('/console/cortex');
  });
});
