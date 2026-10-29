// @vitest-environment jsdom
/**
 * The stop's events on the era rail: each a mark on the rim at its year,
 * crowded ones a numbered mark that opens their list, a click on one opens
 * it, and a lone event in the years shown is pinned.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { initialAppState } from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { railSegments } from '@/components/atlas/timeline/timeWindow';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { RailEvents } from './RailEvents';

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

// Every era the same share of a 600 px rail.
const SEGMENTS = railSegments(MUSICAL_ERAS.map(() => 1));

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

function renderRail(events: HistoricalEvent[], path = '/globe') {
  MUSIC_HISTORY.push(...events);
  const store = createAtlasStore({
    ...initialAppState,
    selectedLocation: { type: 'country', name: COUNTRY, iso: 'TST' },
  });
  const where = { search: '' };
  const Where = () => {
    where.search = useLocation().search;
    return null;
  };
  const wrap = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>
      <AtlasNavigationProvider>
        <AtlasStoreProvider store={store}>
          {children}
          <Where />
        </AtlasStoreProvider>
      </AtlasNavigationProvider>
    </MemoryRouter>
  );
  const view = render(<RailEvents segments={SEGMENTS} />, { wrapper: wrap });
  return { ...view, store, where };
}

const clusters = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-cluster-size]'));

describe('the events on the era rail', () => {
  it('stands each event on the rim, and numbers a crowd', () => {
    const { container } = renderRail([
      event('a', 1900),
      event('b', 1950),
      event('c', 1951),
      event('d', 1952),
      event('e', 2010),
    ]);
    expect(screen.getByRole('group', { name: '5 events' })).toBeTruthy();
    const [cluster] = clusters(container);
    expect(clusters(container)).toHaveLength(1);
    expect(cluster.dataset.clusterSize).toBe('3');
    expect(cluster.textContent).toBe('3');
    expect(cluster.getAttribute('aria-label')).toBe('3 events, 1950–1952');
    expect(
      screen.getByRole('button', { name: 'Moment a (1900)' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Moment e (2010)' }),
    ).toBeTruthy();
  });

  it('opens an event from its mark', () => {
    const { where } = renderRail([event('a', 1900), event('e', 2010)]);
    act(() => screen.getByRole('button', { name: 'Moment a (1900)' }).click());
    expect(where.search).toBe('?event=a');
  });

  it("lists a crowd's events, and gives focus back on Escape", () => {
    const { container } = renderRail([
      event('a', 1900),
      event('b', 1964),
      event('c', 1964),
      event('d', 1964),
      event('e', 2010),
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

  it('pins a lone event in the years shown', () => {
    const { store } = renderRail([event('a', 1900)]);
    expect(store.api.getState().pinnedEvent?.id).toBe('a');
  });

  it('leaves the timeline view to the river', () => {
    renderRail([event('a', 1900), event('e', 2010)], '/globe?view=timeline');
    expect(screen.queryByRole('button', { name: /Moment/ })).toBeNull();
  });
});
