// @vitest-environment jsdom
/**
 * Navigating writes the URL; a component that only navigates must not
 * re-render when the URL changes, and one that reads part of the stop
 * re-renders only when that part does.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AtlasNavigationProvider,
  useAtlasNavigate,
  useAtlasStop,
  useAtlasStopSelector,
  type AtlasNavigate,
} from './useAtlasNavigate';

afterEach(cleanup);

function setup(initial = '/atlas/globe?era=jazz-age') {
  const renders = { navigator: 0, artist: 0, stop: 0 };
  const navigates: AtlasNavigate[] = [];
  let search = '';

  const Navigator = () => {
    renders.navigator += 1;
    navigates.push(useAtlasNavigate());
    return null;
  };
  const Artist = () => {
    renders.artist += 1;
    const artist = useAtlasStopSelector((stop) =>
      stop.kind === 'artist' ? stop.artist : null,
    );
    return <span data-testid="artist">{artist ?? 'none'}</span>;
  };
  const Stop = () => {
    renders.stop += 1;
    return <span data-testid="stop">{useAtlasStop().kind}</span>;
  };
  const Where = () => {
    search = useLocation().search;
    return null;
  };

  render(
    <MemoryRouter initialEntries={[initial]}>
      <AtlasNavigationProvider>
        <Navigator />
        <Artist />
        <Stop />
      </AtlasNavigationProvider>
      <Where />
    </MemoryRouter>,
  );
  return { renders, navigate: () => navigates[0], search: () => search };
}

describe('useAtlasNavigate', () => {
  it('writes the stop to the URL and keeps the other params', () => {
    const { navigate, search } = setup();
    act(() => navigate().toEvent('evt-1'));
    expect(search()).toBe('?era=jazz-age&event=evt-1');
    act(() => navigate().toPlace({ type: 'city', id: 'new-orleans' }));
    expect(search()).toBe('?era=jazz-age&place=city%3Anew-orleans');
    expect(screen.getByTestId('stop')).toHaveTextContent('place');
  });

  it('never re-renders a component that only navigates', () => {
    const { renders, navigate } = setup();
    act(() => navigate().toEvent('evt-1'));
    act(() => navigate().toArtist('Ana Lux'));
    act(() => navigate().home());
    expect(renders.navigator).toBe(1);
  });

  it('re-renders a selector only when its value changes', () => {
    const { renders, navigate } = setup();
    expect(renders.artist).toBe(1);

    act(() => navigate().toEvent('evt-1'));
    // Still no artist, so no render.
    expect(renders.artist).toBe(1);

    act(() => navigate().toArtist('Ana Lux'));
    expect(screen.getByTestId('artist')).toHaveTextContent('Ana Lux');
    expect(renders.artist).toBe(2);
  });

  it('changes the frame in place, keeping the stop', () => {
    const { navigate, search } = setup('/atlas/globe?event=evt-1');
    act(() => navigate().toSection('regions'));
    expect(search()).toBe(
      '?event=evt-1&view=timeline&open=americas%2Ceurope%2Cafrica-me%2Casia-pacific',
    );
    act(() => navigate().toSection('pathways'));
    expect(search()).toBe(
      '?event=evt-1&view=timeline&open=americas%2Ceurope%2Cafrica-me%2Casia-pacific&lens=pathways',
    );
    act(() => navigate().toSection('eras'));
    expect(search()).toBe('?event=evt-1&view=timeline');
    act(() => navigate().toSection('explore'));
    expect(search()).toBe('?event=evt-1');
  });

  it('goes to a stop and a frame in one step', () => {
    const { navigate, search } = setup('/atlas/globe');
    act(() =>
      navigate().go(
        { kind: 'place', place: { type: 'city', id: 'memphis' } },
        { frame: { view: 'timeline' } },
      ),
    );
    expect(search()).toBe('?place=city%3Amemphis&view=timeline');
  });

  it('reads the latest URL when two navigations follow each other', () => {
    const { navigate, search } = setup();
    act(() => navigate().toEvent('evt-1'));
    act(() => navigate().toSearch('louis'));
    expect(search()).toBe('?era=jazz-age&q=louis');
  });
});
