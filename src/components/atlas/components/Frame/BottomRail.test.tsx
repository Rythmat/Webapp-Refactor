// @vitest-environment jsdom
/**
 * The bottom rail: the views as the Studio's view tabs, the globe's spin, all
 * of time back in, the panels' icons (the Globe has no side rail) and the
 * floating cards' switch.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { InspectorProvider } from '@/components/atlas/layout/useInspector';
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
          <InspectorProvider>
            <BottomRail />
          </InspectorProvider>
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

  it('opens the ring of connections as a view, keeping the cards', () => {
    const { where } = setup('/globe?place=city:london');
    const nav = screen.getByRole('navigation', { name: 'Globe sections' });
    expect(
      within(nav)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Explore', 'Connections', 'Eras', 'Regions & Cities']);
    fireEvent.click(tab('Connections'));
    expect(where.search).toBe('?place=city%3Alondon&view=ring');
    // The map's own controls stand down; the cards' switch stays.
    expect(screen.queryByRole('button', { name: 'Spin the globe' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hide the cards' })).toBeTruthy();
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

  it('opens a panel from its icon, and closes it on the same icon', () => {
    const { where } = setup();
    const layers = screen.getByRole('button', { name: 'Layers' });
    expect(layers).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(layers);
    expect(where.search).toBe('?panel=layers');
    expect(layers).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(layers);
    expect(where.search).toBe('?panel=none');
    expect(layers).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the panels that apply, and only those', () => {
    setup();
    // No stop, no details; no lesson, no mind map.
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mind map' })).toBeNull();
    // The legend is a card over the map.
    expect(screen.queryByRole('button', { name: 'Legend' })).toBeNull();
    cleanup();
    setup('/globe?view=timeline');
    expect(screen.getByRole('button', { name: 'Layers' })).toBeDisabled();
    cleanup();
    setup('/globe?mindmap=1');
    expect(screen.getByRole('button', { name: 'Mind map' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('hides and shows the floating cards, for good', () => {
    const { store } = setup();
    const hide = screen.getByRole('button', { name: 'Hide the cards' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(hide);
    expect(store.api.getState().cards.hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show the cards' }));
    expect(store.api.getState().cards.hidden).toBe(false);
  });

  it('keeps the map’s controls to the map', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Spin the globe' })).toBeTruthy();
    cleanup();
    setup('/globe?view=timeline');
    expect(screen.queryByRole('button', { name: 'Spin the globe' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hide the cards' })).toBeNull();
  });
});
