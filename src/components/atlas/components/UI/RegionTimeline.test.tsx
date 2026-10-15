// @vitest-environment jsdom
/**
 * Dense timeline dots become numbered clusters, and every event stays
 * reachable: a cluster that zooming can pull apart zooms in, and one that it
 * cannot (all one year) opens as a list.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { initialAppState } from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { RegionTimeline } from './RegionTimeline';

const COUNTRY = 'Testland';

const event = (id: string, year: number): HistoricalEvent => ({
  id,
  year,
  location: { lat: 0, lng: 0, city: 'Testville', country: COUNTRY },
  genre: [],
  title: `Moment ${id}`,
  description: '',
  tags: [],
});

// A 600 px track: 1900–2000 puts a year at 6 px, so dots within 5 years of
// each other overlap.
let restore: () => void;
beforeAll(() => {
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    return { ...rect.call(this), width: 600 } as DOMRect;
  };
  restore = () => {
    Element.prototype.getBoundingClientRect = rect;
  };
});
afterAll(() => restore());

beforeEach(() => {
  MUSIC_HISTORY.length = 0;
});
afterEach(() => {
  cleanup();
  MUSIC_HISTORY.length = 0;
});

function renderTimeline(events: HistoricalEvent[]) {
  MUSIC_HISTORY.push(...events);
  const store = createAtlasStore({
    ...initialAppState,
    selectedLocation: { type: 'country', name: COUNTRY, iso: 'TST' },
  });
  const wrap = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/atlas/globe']}>
      <AtlasNavigationProvider>
        <AtlasStoreProvider store={store}>{children}</AtlasStoreProvider>
      </AtlasNavigationProvider>
    </MemoryRouter>
  );
  return render(<RegionTimeline />, { wrapper: wrap });
}

const clusters = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-cluster-size]'));

describe('RegionTimeline clusters', () => {
  it('draws one numbered cluster where dots crowd, and plain dots elsewhere', () => {
    const { container } = renderTimeline([
      event('a', 1900),
      event('b', 1950),
      event('c', 1951),
      event('d', 1952),
      event('e', 2000),
    ]);
    const [cluster] = clusters(container);
    expect(clusters(container)).toHaveLength(1);
    expect(cluster.dataset.clusterSize).toBe('3');
    expect(cluster.textContent).toBe('3');
    expect(cluster.getAttribute('aria-label')).toBe(
      '3 events, 1950–1952 — zoom in',
    );
    expect(
      screen.getByRole('button', { name: 'Moment a (1900)' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Moment e (2000)' }),
    ).toBeTruthy();
  });

  it('zooms in on a cluster until its events are separate dots', () => {
    const { container } = renderTimeline([
      event('a', 1900),
      event('b', 1950),
      event('c', 1951),
      event('d', 1952),
      event('e', 2000),
    ]);
    act(() => clusters(container)[0].click());
    expect(clusters(container)).toHaveLength(0);
    for (const id of ['b', 'c', 'd']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`Moment ${id} `) }),
      ).toBeTruthy();
    }
  });

  it('lists a same-year cluster, since zooming cannot separate it', () => {
    const { container } = renderTimeline([
      event('a', 1900),
      event('b', 1964),
      event('c', 1964),
      event('d', 1964),
      event('e', 2000),
    ]);
    const [cluster] = clusters(container);
    expect(cluster.getAttribute('aria-label')).toBe('3 events, 1964');
    expect(cluster.getAttribute('aria-expanded')).toBe('false');

    act(() => cluster.click());
    const list = screen.getByRole('list', { name: '3 events' });
    expect(list.querySelectorAll('button')).toHaveLength(3);
    expect(document.activeElement).toBe(list.querySelector('button'));

    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.queryByRole('list', { name: '3 events' })).toBeNull();
    expect(document.activeElement).toBe(clusters(container)[0]);
  });
});
