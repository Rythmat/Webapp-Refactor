// @vitest-environment jsdom
/**
 * The time window travels both ways between the store and the URL — and a
 * write of its own never comes back to snap a moving timeline to where it was.
 */
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter, useLocation, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AtlasStoreProvider,
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { TimeWindow } from '@/components/atlas/timeline/timeWindow';
import type { AppAction } from '@/components/atlas/types';
import {
  AtlasNavigationProvider,
  useAtlasNavigate,
  type AtlasNavigate,
} from './useAtlasNavigate';
import { WINDOW_COMMIT_MS, useWindowSync } from './useWindowSync';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(initial: string) {
  const out = {
    window: null as TimeWindow | null,
    search: '',
    dispatch: (() => {}) as (action: AppAction) => void,
    navigate: null as AtlasNavigate | null,
  };
  const Sync = () => {
    const [params] = useSearchParams();
    useWindowSync(params);
    return null;
  };
  const Probe = () => {
    out.window = useAtlasSelector((s) => s.timeWindow);
    out.dispatch = useAtlasDispatch();
    out.navigate = useAtlasNavigate();
    out.search = useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={[initial]}>
      <AtlasStoreProvider>
        <AtlasNavigationProvider>
          <Sync />
          <Probe />
        </AtlasNavigationProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return out;
}

const rest = () =>
  act(() => {
    vi.advanceTimersByTime(WINDOW_COMMIT_MS + 10);
  });

describe('useWindowSync', () => {
  it('reads an era link as its years and rewrites it as them', () => {
    const page = setup('/globe?era=postwar&event=e1');
    expect(page.window).toEqual({ from: 1946, to: 1979 });
    expect(page.search).toBe('?event=e1&from=1946&to=1979');
  });

  it('reads from and to', () => {
    const page = setup('/globe?from=1950&to=1960');
    expect(page.window).toEqual({ from: 1950, to: 1960 });
  });

  it('leaves all of time unfiltered', () => {
    const page = setup('/globe');
    rest();
    expect(page.window).toBeNull();
    expect(page.search).toBe('');
  });

  it('writes a moved window to the URL once it rests', () => {
    const page = setup('/globe?place=city:memphis');
    act(() =>
      page.dispatch({
        type: 'SET_WINDOW',
        payload: { from: 1955, to: 1975.4 },
      }),
    );
    act(() => {
      vi.advanceTimersByTime(WINDOW_COMMIT_MS - 50);
    });
    expect(page.search).toBe('?place=city:memphis');
    rest();
    expect(page.search).toBe('?place=city%3Amemphis&from=1955&to=1975');
    // The store keeps its own (fractional) window.
    expect(page.window).toEqual({ from: 1955, to: 1975.4 });
  });

  it('never snaps a moving window back to its own last write', () => {
    const page = setup('/globe');
    act(() =>
      page.dispatch({ type: 'SET_WINDOW', payload: { from: 1950, to: 1970 } }),
    );
    rest();
    expect(page.search).toBe('?from=1950&to=1970');
    act(() =>
      page.dispatch({ type: 'SET_WINDOW', payload: { from: 1960, to: 1980 } }),
    );
    expect(page.window).toEqual({ from: 1960, to: 1980 });
    rest();
    expect(page.search).toBe('?from=1960&to=1980');
  });

  it('applies a window that arrives from outside, like Back', () => {
    const page = setup('/globe?from=1950&to=1970');
    act(() => page.navigate!.setFrame({ window: { from: 1990, to: 1999 } }));
    expect(page.window).toEqual({ from: 1990, to: 1999 });
    act(() => page.navigate!.setFrame({ window: null }));
    expect(page.window).toBeNull();
  });
});
