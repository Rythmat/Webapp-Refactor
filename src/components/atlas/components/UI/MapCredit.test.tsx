// @vitest-environment jsdom
/**
 * The street map's credit: open when the map first appears, folded behind
 * its ⓘ button at the viewer's first touch on the map, and the viewer's to
 * open or close after that.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { MapCredit } from './MapCredit';

afterEach(cleanup);

function setup() {
  const store = createAtlasStore();
  render(
    <AtlasStoreProvider store={store}>
      <MapCredit streetMap />
    </AtlasStoreProvider>,
  );
  const button = screen.getByRole('button', { name: 'Map credits' });
  const credit = () => screen.queryByRole('link', { name: 'OpenStreetMap' });
  const touchMap = () => act(() => store.dispatch({ type: 'MAP_TOUCHED' }));
  return { button, credit, touchMap };
}

describe('the map credit', () => {
  it('is open when the map first appears, with links to each', () => {
    const { button, credit } = setup();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(credit()?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/copyright',
    );
    expect(
      screen.getByRole('link', { name: 'Protomaps' }).getAttribute('href'),
    ).toBe('https://protomaps.com');
    expect(screen.getByText(/©/).textContent).toBe(
      'Protomaps © OpenStreetMap',
    );
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBe(
      screen.getByText(/©/),
    );
  });

  it('folds behind its ⓘ at the first touch on the map', () => {
    const { button, credit, touchMap } = setup();
    touchMap();
    expect(credit()).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens again from the ⓘ, and stays open as the map is used', () => {
    const { button, credit, touchMap } = setup();
    touchMap();
    fireEvent.click(button);
    expect(credit()).toBeTruthy();
    touchMap();
    expect(credit()).toBeTruthy();
    fireEvent.click(button);
    expect(credit()).toBeNull();
  });

  it('stays closed if the viewer closes it before touching the map', () => {
    const { button, credit, touchMap } = setup();
    fireEvent.click(button);
    expect(credit()).toBeNull();
    touchMap();
    expect(credit()).toBeNull();
  });

  it('credits OpenStreetMap alone on the plain map without the street map', () => {
    render(
      <AtlasStoreProvider store={createAtlasStore()}>
        <MapCredit streetMap={false} />
      </AtlasStoreProvider>,
    );
    expect(screen.getByText(/©/).textContent).toBe('© OpenStreetMap');
    expect(screen.queryByRole('link', { name: 'Protomaps' })).toBeNull();
  });
});
