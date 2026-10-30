// @vitest-environment jsdom
/**
 * The Layers panel, in the Inspector: real switches whose choice the store and
 * the viewer's browser keep.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
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
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, onClose };
}

describe('the Layers panel', () => {
  it('switches a layer off', () => {
    const store = createAtlasStore();
    setup(store);
    expect(screen.getByRole('region', { name: 'Layers' })).toBeInTheDocument();

    const cities = screen.getByRole('switch', { name: 'Music cities' });
    expect(cities).toHaveAttribute('aria-checked', 'true');
    act(() => cities.click());
    expect(store.api.getState().layers.cities).toBe(false);
    expect(cities).toHaveAttribute('aria-checked', 'false');
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
    act(() => screen.getByRole('switch', { name: 'Connections' }).click());
    expect(
      JSON.parse(window.localStorage.getItem(LAYERS_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ arcs: false, cities: true });

    cleanup();
    setup();
    expect(screen.getByRole('switch', { name: 'Connections' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('colours the land as the viewer picks', () => {
    const store = createAtlasStore();
    setup(store);
    const group = screen.getByRole('radiogroup', { name: 'Color the land by' });
    const music = screen.getByRole('radio', { name: 'Music' });
    expect(music).toHaveAttribute('aria-checked', 'true');
    act(() => screen.getByRole('radio', { name: 'Continent' }).click());
    expect(store.api.getState().layers.landColor).toBe('continent');
    // Arrow keys move along the choices.
    act(() => {
      fireEvent.keyDown(group, { key: 'ArrowRight' });
    });
    expect(store.api.getState().layers.landColor).toBe('plain');
    expect(screen.getByRole('radio', { name: 'Plain' })).toHaveFocus();
  });

  it('closes from its own button', () => {
    const { onClose } = setup();
    act(() => screen.getAllByRole('button', { name: 'Close' })[0].click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
