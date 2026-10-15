// @vitest-environment jsdom
/**
 * The map controls: the legend starts closed on every screen and opens on
 * request; Layers is a popover of real switches whose choice the store and
 * the viewer's browser keep, and the legend drops what Layers hides.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  AtlasStoreProvider,
  createAtlasStore,
  type AtlasStore,
} from '@/components/atlas/state/atlasStore';
import { LAYERS_STORAGE_KEY } from '@/components/atlas/state/layersStorage';
import { MapControls } from './MapControls';

const originalMatchMedia = window.matchMedia;

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

function setup(store?: AtlasStore) {
  render(
    <MemoryRouter initialEntries={['/atlas/globe']}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <MapControls />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
}

/** A phone-sized screen, as far as useIsPhone can tell. */
function asPhone() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const legend = () => screen.queryByRole('complementary', { name: 'Legend' });

describe('map controls', () => {
  it('starts with the legend closed, and opens it explained in words', () => {
    setup();
    const toggle = screen.getByRole('button', { name: 'Legend' });
    expect(legend()).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(legend()).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Countries by continent')).toBeInTheDocument();
    expect(screen.getByText('Music cities')).toBeInTheDocument();
  });

  it('keeps the legend closed on phones too, until asked', () => {
    asPhone();
    setup();
    expect(legend()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(legend()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide the legend' }));
    expect(legend()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legend' })).toHaveFocus();
  });

  it('switches a layer off, in the store and the legend', async () => {
    const store = createAtlasStore();
    setup(store);
    fireEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(
      legend()?.querySelector('[data-legend-entry="cities"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
    const cities = await screen.findByRole('switch', { name: 'Music cities' });
    expect(cities).toHaveAttribute('aria-checked', 'true');
    act(() => cities.click());
    expect(store.api.getState().layers.cities).toBe(false);
    expect(cities).toHaveAttribute('aria-checked', 'false');
    expect(
      legend()?.querySelector('[data-legend-entry="cities"]'),
    ).not.toBeInTheDocument();
  });

  it('closes Layers on Escape, back to its button', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'Layers' });
    button.focus();
    fireEvent.click(button);
    const popover = await screen.findByRole('dialog', { name: 'Layers' });
    // jsdom reports no animations; a browser does, for every element
    // (src/index.css), and Radix would then keep the popover mounted.
    expect(popover).toHaveClass('animate-none');
    fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(button).toHaveFocus();
  });

  it("disables the arc directions until there is an event's arcs to filter", async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
    expect(
      await screen.findByRole('switch', { name: 'Influenced by' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Open an event to choose which of its arcs show.'),
    ).toBeInTheDocument();
  });

  it("keeps the viewer's layers in their browser, and reads them back", async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
    const arcs = await screen.findByRole('switch', { name: 'Influence arcs' });
    act(() => arcs.click());
    expect(
      JSON.parse(window.localStorage.getItem(LAYERS_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({ arcs: false, cities: true });

    cleanup();
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Layers' }));
    expect(
      await screen.findByRole('switch', { name: 'Influence arcs' }),
    ).toHaveAttribute('aria-checked', 'false');
  });
});
