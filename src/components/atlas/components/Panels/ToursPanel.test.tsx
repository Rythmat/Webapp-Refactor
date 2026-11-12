// @vitest-environment jsdom
/**
 * The Tours card: pathways and guided tours as one list, by kind, and a
 * running tour stepped from its head.
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
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { initialAppState } from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import ToursPanel, { type Journey } from './ToursPanel';

afterEach(cleanup);

function setup(journey: Journey | null, store = createAtlasStore()) {
  const where = { search: '' };
  const Where = () => {
    where.search = decodeURIComponent(useLocation().search);
    return null;
  };
  render(
    <MemoryRouter initialEntries={['/globe']}>
      <AtlasStoreProvider store={store}>
        <AtlasNavigationProvider>
          <ToursPanel journey={journey} onClose={() => undefined} />
          <Where />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return { store, where };
}

describe('the Tours card', () => {
  it('lists the genre tours under Learn’s genres, then regions and cities', async () => {
    const { where } = setup(null);
    expect(
      await screen.findByRole('button', { name: /Blues to Rock/ }),
    ).toBeTruthy();
    const blues = screen.getByRole('region', { name: 'Blues' });
    expect(
      within(blues).getByRole('button', { name: /Blues to Rock/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'City' }));
    expect(screen.queryByRole('button', { name: /Blues to Rock/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Memphis/ }));
    expect(where.search).toBe('?tour=city-memphis');
  });

  it('steps a running tour from its head, lifting the stop’s region', async () => {
    const store = createAtlasStore({
      ...initialAppState,
      activeTour: { tourId: 'city-memphis', currentStep: 0 },
    });
    setup({ kind: 'tour', id: 'city-memphis' }, store);
    const steps = await screen.findByRole('list', { name: 'Stops' });
    expect(within(steps).getAllByRole('button').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next stop' }));
    const state = store.api.getState();
    expect(state.activeTour?.currentStep).toBe(1);
    expect(state.searchFlyTarget?.frame).toMatchObject({
      kind: 'city',
      cityId: 'memphis',
    });
  });

  it('ends a tour on Learn & make: the course in Learn, a track in the Studio', async () => {
    const store = createAtlasStore({
      ...initialAppState,
      activeTour: { tourId: 'city-memphis', currentStep: 0 },
    });
    setup({ kind: 'tour', id: 'city-memphis' }, store);
    const steps = await screen.findByRole('list', { name: 'Stops' });
    fireEvent.click(
      within(steps).getByRole('button', { name: 'Learn & make' }),
    );
    expect(
      screen.getByRole('link', { name: /Learn Blues/ }).getAttribute('href'),
    ).toBe('/learn/keyboard/genre/blues');
    expect(
      screen.getByRole('link', { name: /Make Rock/ }).getAttribute('href'),
    ).toBe('/studio?template=project-rock');
  });
});
