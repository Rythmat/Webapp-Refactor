// @vitest-environment jsdom
/**
 * The Layers panel and the legend, in the Inspector: real switches whose
 * choice the store and the viewer's browser keep, and a legend that drops
 * what Layers hides.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  AtlasStoreProvider,
  createAtlasStore,
  type AtlasStore,
} from '@/components/atlas/state/atlasStore';
import { LAYERS_STORAGE_KEY } from '@/components/atlas/state/layersStorage';
import LayersPanel from './LayersPanel';
import LegendPanel from './LegendPanel';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

// Without a store of its own the provider makes the page's, which keeps the
// layers in the viewer's browser.
function setup(store?: AtlasStore, onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/globe']}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <LayersPanel onClose={onClose} />
          <LegendPanel onClose={onClose} />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, onClose };
}

const legend = () => screen.getByRole('region', { name: 'Legend' });

describe('the Layers panel', () => {
  it('explains the marks in words, and switches a layer off in both', () => {
    const store = createAtlasStore();
    setup(store);
    expect(screen.getByRole('region', { name: 'Layers' })).toBeInTheDocument();
    expect(
      legend().querySelector('[data-legend-entry="cities"]'),
    ).toBeInTheDocument();
    expect(screen.getByText('Countries by continent')).toBeInTheDocument();

    const cities = screen.getByRole('switch', { name: 'Music cities' });
    expect(cities).toHaveAttribute('aria-checked', 'true');
    act(() => cities.click());
    expect(store.api.getState().layers.cities).toBe(false);
    expect(cities).toHaveAttribute('aria-checked', 'false');
    expect(
      legend().querySelector('[data-legend-entry="cities"]'),
    ).not.toBeInTheDocument();
  });

  it("disables the arc directions until there is an event's arcs to filter", () => {
    setup();
    expect(
      screen.getByRole('switch', { name: 'Influenced by' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Open an event to choose which of its arcs show.'),
    ).toBeInTheDocument();
  });

  it("keeps the viewer's layers in their browser, and reads them back", () => {
    setup();
    act(() => screen.getByRole('switch', { name: 'Influence arcs' }).click());
    expect(
      JSON.parse(window.localStorage.getItem(LAYERS_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ arcs: false, cities: true });

    cleanup();
    setup();
    expect(
      screen.getByRole('switch', { name: 'Influence arcs' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('closes from its own button', () => {
    const { onClose } = setup();
    act(() => screen.getAllByRole('button', { name: 'Close' })[0].click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
