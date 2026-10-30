// @vitest-environment jsdom
/**
 * The floating cards: the world's (how much music in the years shown, when,
 * the strongest links between regions, the busiest places) and a stop's
 * (a place's, an artist's, an event's), each leading somewhere on the map.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import { ensureAtlasContent } from '@/content/contentStore';
import StageCards from './StageCards';

beforeAll(() => ensureAtlasContent(), 60_000);
afterEach(cleanup);

function UrlSync() {
  useAtlasUrlSync();
  return null;
}

function setup({ path = '/globe', compact = false } = {}) {
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
          <StageSignalsProvider>
            <StageCards compact={compact} />
          </StageSignalsProvider>
          <UrlSync />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, where };
}

const card = (title: string | RegExp) =>
  screen.getByRole('region', { name: title });

describe('the world’s cards', () => {
  it('counts the music in the years shown, and splits it by era', () => {
    setup({ path: '/globe?from=1946&to=1979' });
    const header = card(/^The world · 1946/);
    expect(within(header).getByText('Music around the world')).toBeTruthy();
    for (const label of ['Events', 'Artists', 'Genres', 'Influences']) {
      expect(within(header).getByText(label)).toBeTruthy();
    }
    expect(
      within(header).getByRole('img', { name: /^Events by era: / }),
    ).toBeTruthy();
  });

  it('jumps the era rail to the years a reader picks on the chart', () => {
    const { store } = setup();
    const chart = within(card('Music over time')).getByRole('img', {
      name: /Events/,
    });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    fireEvent.keyDown(chart, { key: 'Enter' });
    const w = store.api.getState().timeWindow;
    expect(w).not.toBeNull();
    expect(w!.to).toBeGreaterThan(w!.from);
  });

  it('opens a busy place from its row', () => {
    const { where } = setup();
    const list = within(card('Busiest places')).getByRole('list', {
      name: 'The busiest places',
    });
    const rows = within(list).getAllByRole('button');
    expect(rows).toHaveLength(5);
    fireEvent.click(rows[0]);
    expect(where.search).toMatch(/place=/);
  });

  it('lists the strongest links between regions once they load', async () => {
    setup();
    const list = await screen.findByRole(
      'list',
      { name: 'The strongest links between regions' },
      { timeout: 5000 },
    );
    const rows = within(list).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(rows[0].textContent).toContain('→');
  });

  it('says so when the years shown hold no music, and lets all years back', () => {
    const { store } = setup({ path: '/globe?from=-3000&to=-2990' });
    const over = card('Music over time');
    expect(within(over).getByText(/No music in these years/)).toBeTruthy();
    fireEvent.click(
      within(over).getByRole('button', { name: 'Show all years' }),
    );
    expect(store.api.getState().timeWindow).toBeNull();
  });

  it('keeps the first two cards when compact', () => {
    setup({ compact: true });
    expect(screen.getAllByRole('region')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: 'Busiest places' })).toBeNull();
  });
});

describe('a stop’s cards', () => {
  it('names a place, counts its music and says where it came from and went', async () => {
    const { where } = setup({ path: '/globe?place=city:london' });
    const header = card(/^Place · All years/);
    expect(within(header).getByText('London')).toBeTruthy();
    const links = card('Connections');
    const which = await within(links).findByRole(
      'group',
      { name: 'Which way' },
      { timeout: 5000 },
    );
    const went = within(which).getByRole('button', { name: /^Went to · \d+$/ });
    fireEvent.click(went);
    expect(went).toHaveAttribute('aria-pressed', 'true');
    const list = within(links).getByRole('list', {
      name: 'Where its music went',
    });
    const rows = within(list).getAllByRole('button');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    fireEvent.click(rows[0]);
    expect(where.search).toMatch(/place=city%3A|place=city:/);
    expect(where.search).not.toMatch(/london/);
    expect(card('Top sounds')).toBeTruthy();
  });

  it('follows an artist’s career and the places they played', () => {
    setup({ path: '/globe?artist=louis-armstrong' });
    expect(within(card(/^Artist ·/)).getByText('Career')).toBeTruthy();
    expect(card('Career over time')).toBeTruthy();
    const played = within(card('Where they played')).getAllByRole('button');
    expect(played.length).toBeGreaterThan(1);
  });

  it('pins an event in its city’s header and marks its year', () => {
    // jsdom lays nothing out: give the chart a width to draw in.
    const width = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(240);
    setup({ path: '/globe?event=evt-blues-clarksdale-1903' });
    width.mockRestore();
    const header = card(/^Event ·/);
    expect(within(header).getByText('Pinned')).toBeTruthy();
    expect(within(header).getByText('1903')).toBeTruthy();
    expect(
      card('Music over time').querySelector('[data-mark="1903"]'),
    ).not.toBeNull();
    expect(card('This event’s connections')).toBeTruthy();
  });

  it('says so when a place has no connections in the years shown', async () => {
    setup({ path: '/globe?place=city:london&from=1600&to=1610' });
    const links = card('Connections');
    expect(
      await within(links).findByText(
        /No connections recorded for London in/,
        undefined,
        {
          timeout: 5000,
        },
      ),
    ).toBeTruthy();
  });
});
