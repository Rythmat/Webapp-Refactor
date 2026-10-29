// @vitest-environment jsdom
/**
 * A place with hundreds of events renders only the cards in view, and the
 * keyboard still reaches the last of them. Enlarge mode shows one card and
 * unmounts the rest — without moving the one it keeps, whose video would
 * reload if its element were reparented.
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
import { DetailsCard } from './DetailsCard';

const COUNTRY = 'Testland';

const makeEvents = (n: number): HistoricalEvent[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `test-${String(i).padStart(3, '0')}`,
    year: 1900 + i,
    location: { lat: 0, lng: 0, city: 'Testville', country: COUNTRY },
    genre: [],
    title: `Moment ${i}`,
    description: '',
    tags: [],
  }));

// jsdom has no layout: give the card's list a viewport and each card a
// height, which is all the virtualizer reads.
let restore: () => void;
beforeAll(() => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight',
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.hasAttribute('data-event-id')) return 66;
      if (this.classList.contains('overflow-y-auto')) return 500;
      return 0;
    },
  });
  const scrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = () => {};
  restore = () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original);
    }
    Element.prototype.scrollIntoView = scrollIntoView;
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

function renderCard(events: HistoricalEvent[]) {
  MUSIC_HISTORY.push(...events);
  const store = createAtlasStore({
    ...initialAppState,
    selectedLocation: { type: 'country', name: COUNTRY, iso: 'TST' },
  });
  const wrap = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/globe']}>
      <AtlasNavigationProvider>
        <AtlasStoreProvider store={store}>{children}</AtlasStoreProvider>
      </AtlasNavigationProvider>
    </MemoryRouter>
  );
  const view = render(<DetailsCard />, { wrapper: wrap });
  const cards = () =>
    Array.from(view.container.querySelectorAll<HTMLElement>('[data-event-id]'));
  return { ...view, store, cards };
}

describe('DetailsCard', () => {
  it('renders only the cards in view for a place with hundreds of events', () => {
    const { cards } = renderCard(makeEvents(300));
    expect(screen.getByText('300 events')).toBeTruthy();
    expect(cards().length).toBeGreaterThan(0);
    expect(cards().length).toBeLessThan(40);
  });

  it('lets the keyboard reach the last event', async () => {
    const { cards } = renderCard(makeEvents(300));
    const focusedCard = () =>
      document.activeElement
        ?.closest('[data-event-id]')
        ?.getAttribute('data-event-id');
    cards()[0].querySelector<HTMLElement>('[data-row-control]')!.focus();
    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'End' });
    });
    expect(focusedCard()).toBe('test-299');
    await act(async () => {
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    });
    expect(focusedCard()).toBe('test-298');
    expect(cards().length).toBeLessThan(60);
  });

  it('unmounts the other cards in Enlarge mode, keeping the shown one in place', () => {
    const events = makeEvents(5);
    const { cards, store } = renderCard(events);
    act(() => store.dispatch({ type: 'PIN_EVENT', payload: events[2] }));
    const shown = cards()[2];
    expect(shown.dataset.eventId).toBe('test-002');

    fireEvent.click(
      Array.from(shown.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Enlarge',
      )!,
    );
    expect(cards()).toEqual([shown]);

    fireEvent.click(screen.getByRole('button', { name: 'Shrink' }));
    expect(cards()).toHaveLength(5);
    expect(cards()[2]).toBe(shown);
  });

  it('nests no control inside another: each row has one toggle beside its buttons', () => {
    const { cards } = renderCard(makeEvents(3));
    for (const card of cards()) {
      expect(card.getAttribute('role')).toBeNull();
      expect(card.tabIndex).toBe(-1);
      const toggle = card.querySelector('[data-row-control]')!;
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.querySelector('button')).toBeNull();
    }
  });

  it('leaves Enlarge on Escape before anything closes', () => {
    const events = makeEvents(3);
    const { cards, store } = renderCard(events);
    act(() => store.dispatch({ type: 'PIN_EVENT', payload: events[1] }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Enlarge' })[1]);
    expect(cards()).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(cards()).toHaveLength(3);
  });
});
