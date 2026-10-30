// @vitest-environment jsdom
/**
 * The one floating card: the strongest links between regions with nothing
 * chosen; at a stop, where its music came from and went to, each row leading
 * somewhere on the map.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
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

function setup(path = '/globe') {
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
            <StageCards />
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

describe('the floating card', () => {
  it('is the only one, and lists the world’s strongest links', async () => {
    setup();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    const list = await within(card('Strongest connections')).findByRole(
      'list',
      { name: 'The strongest links between regions' },
      { timeout: 5000 },
    );
    const rows = within(list).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    expect(rows[0].textContent).toContain('→');
  });

  it('says where a place’s music came from and went, and opens the far place', async () => {
    const { where } = setup('/globe?place=city:london');
    const links = card('Connections');
    const which = await within(links).findByRole(
      'group',
      { name: 'Which way' },
      { timeout: 5000 },
    );
    const went = within(which).getByRole('button', {
      name: /^Went to · \d+$/,
    });
    fireEvent.click(went);
    expect(went).toHaveAttribute('aria-pressed', 'true');
    const list = within(links).getByRole('list', {
      name: 'Where its music went',
    });
    const rows = within(list).getAllByRole('button');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    fireEvent.click(rows[0]);
    expect(where.search).toMatch(/place=city/);
    expect(where.search).not.toMatch(/london/);
  });

  it('shows an event’s own connections at an event', () => {
    setup('/globe?event=evt-blues-clarksdale-1903');
    expect(card('This event’s connections')).toBeTruthy();
  });

  it('says so when a place has no connections in the years shown', async () => {
    setup('/globe?place=city:london&from=1600&to=1610');
    expect(
      await within(card('Connections')).findByText(
        /No connections recorded for London in/,
        undefined,
        { timeout: 5000 },
      ),
    ).toBeTruthy();
  });
});
