// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { useWindowSync } from '@/components/atlas/navigation/useWindowSync';
import { AtlasStoreProvider } from '@/components/atlas/state/atlasStore';
import { TimeCameraProvider } from '@/components/atlas/timeline/TimeCamera';
import { EraRail } from './EraRail';

afterEach(cleanup);

/** The URL's years into the store, as the page's URL sync does. */
function Sync() {
  const [params] = useSearchParams();
  useWindowSync(params);
  return null;
}

function setup(path = '/globe?view=timeline') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AtlasStoreProvider>
        <AtlasNavigationProvider>
          <TimeCameraProvider>
            <Sync />
            <EraRail />
          </TimeCameraProvider>
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
}

describe('EraRail', () => {
  it('holds the years in view between two sliders', () => {
    setup();
    const [from, to] = screen.getAllByRole('slider');
    expect(from).toHaveAccessibleName('First year shown');
    expect(from.getAttribute('aria-valuenow')).toBe('1900');
    expect(to).toHaveAccessibleName('Last year shown');
  });

  it('names every era, and flies to one when it is picked', async () => {
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Postwar & Revolution' }),
    );
    const [from, to] = screen.getAllByRole('slider');
    await waitFor(
      () => expect(from.getAttribute('aria-valuenow')).toBe('1946'),
      {
        timeout: 2000,
      },
    );
    expect(to.getAttribute('aria-valuenow')).toBe('1979');
  });

  it('moves one end with the arrow keys', async () => {
    setup();
    const [from] = screen.getAllByRole('slider');
    fireEvent.keyDown(from, { key: 'ArrowRight', shiftKey: true });
    // Drawn on the next frame.
    await waitFor(() =>
      expect(from.getAttribute('aria-valuenow')).toBe('1910'),
    );
  });

  it('lets all of time back in on the globe', () => {
    setup('/globe?from=1946&to=1979');
    fireEvent.click(screen.getByRole('button', { name: 'Show all years' }));
    expect(screen.queryByRole('button', { name: 'Show all years' })).toBeNull();
  });
});
