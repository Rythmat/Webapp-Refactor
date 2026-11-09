// @vitest-environment jsdom
/**
 * The Connections view: its places as buttons round the ring, moved round
 * with the keys, each opening its place while the view stays; too few
 * places, and it says so.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AtlasMapProvider } from '@/components/atlas/components/Globe/mapHandle';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import { ensureAtlasContent } from '@/content/contentStore';
import RingView from './RingView';

// jsdom lays nothing out: give the ring a box to draw in.
const sizes = [
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(900),
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800),
];
beforeAll(() => ensureAtlasContent(), 60_000);
afterAll(() => sizes.forEach((s) => s.mockRestore()));
afterEach(cleanup);

function UrlSync() {
  useAtlasUrlSync();
  return null;
}

function setup(path = '/globe?view=ring') {
  const store = createAtlasStore();
  const where = { search: '' };
  const Where = () => {
    where.search = useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <AtlasMapProvider>
            <StageSignalsProvider>
              <RingView active />
            </StageSignalsProvider>
          </AtlasMapProvider>
          <UrlSync />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, where };
}

const ring = () =>
  screen.findByRole(
    'group',
    { name: /^Connections between the \d+ busiest places, / },
    { timeout: 5000 },
  );

describe('the Connections ring', () => {
  it('seats the busiest places, each a button naming what it holds', async () => {
    setup();
    const group = await ring();
    expect(group).toHaveAccessibleName(
      'Connections between the 64 busiest places, all years',
    );
    const places = within(group).getAllByRole('button');
    expect(places).toHaveLength(64);
    expect(
      places.find((b) =>
        /^London: \d+ events, linked to \d+ places here$/.test(
          b.getAttribute('aria-label') ?? '',
        ),
      ),
    ).toBeTruthy();
    // One stop in the tab order; the keys move round from it.
    expect(places.filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });

  it('moves round with the keys', async () => {
    setup();
    const places = within(await ring()).getAllByRole('button');
    places[0].focus();
    fireEvent.keyDown(places[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(places[1]);
    fireEvent.keyDown(places[1], { key: 'End' });
    expect(document.activeElement).toBe(places.at(-1));
    expect(places.at(-1)!.tabIndex).toBe(0);
  });

  it('opens a place and stays on the ring, the place lit', async () => {
    const { where } = setup();
    const places = within(await ring()).getAllByRole('button');
    const london = places.find((b) =>
      b.getAttribute('aria-label')?.startsWith('London:'),
    )!;
    fireEvent.click(london);
    expect(where.search).toContain('place=city');
    expect(where.search).toContain('view=ring');
    const lit = within(await ring())
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-current') === 'true');
    expect(lit.map((b) => b.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/^London:/),
    ]);
  });

  it('says so when the years shown hold too few places', async () => {
    const { store } = setup('/globe?view=ring&from=-3000&to=-2990');
    const note = await screen.findByText(
      /Too few places with music in/,
      undefined,
      {
        timeout: 5000,
      },
    );
    fireEvent.click(
      within(note).getByRole('button', { name: 'Show all years' }),
    );
    expect(store.api.getState().timeWindow).toBeNull();
  });
});
