// @vitest-environment jsdom
/**
 * The bottom rail: the views as the Studio's view tabs, the globe's spin, all
 * of time back in, and the map's credit in a place of its own.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { BottomRail } from './BottomRail';

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
          <BottomRail />
          <UrlSync />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, where };
}

const tab = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}$`) });

describe('the bottom rail', () => {
  it('names the view shown and switches views in place', () => {
    const { where } = setup('/globe?event=evt-1');
    const nav = screen.getByRole('navigation', { name: 'Globe sections' });
    expect(nav).toBeInTheDocument();
    expect(tab('Explore')).toHaveAttribute('aria-current', 'page');

    fireEvent.click(tab('Eras'));
    expect(where.search).toBe('?event=evt-1&view=timeline');
    expect(tab('Eras')).toHaveAttribute('aria-current', 'page');
    expect(tab('Explore')).not.toHaveAttribute('aria-current');
  });

  it('spins the globe and stops it, saying which in its name', () => {
    const { store } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Spin the globe' }));
    expect(store.api.getState().globeRotating).toBe(true);
    const stop = screen.getByRole('button', {
      name: 'Stop the globe spinning',
    });
    expect(stop).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets all of time back in on the map', () => {
    const { store } = setup('/globe?from=1946&to=1979');
    fireEvent.click(screen.getByRole('button', { name: 'Show all years' }));
    expect(store.api.getState().timeWindow).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show all years' })).toBeNull();
  });

  it('keeps the map’s controls to the map', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Spin the globe' })).toBeTruthy();
    cleanup();
    setup('/globe?view=timeline');
    expect(screen.queryByRole('button', { name: 'Spin the globe' })).toBeNull();
  });
});
