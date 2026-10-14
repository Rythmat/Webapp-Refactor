import { useEffect, useRef } from 'react';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import {
  roundWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import { windowFromSearchParams } from './atlasFrame';
import { useAtlasNavigate } from './useAtlasNavigate';

/** How long the window must sit still before the URL is rewritten. */
export const WINDOW_COMMIT_MS = 250;

const keyOf = (w: TimeWindow | null): string => {
  if (!w) return '';
  const { from, to } = roundWindow(w);
  return `${from}:${to}`;
};

/**
 * Keep the store's time window and the URL's `from`/`to` in step.
 *
 * The URL is applied to the store when it changes from outside — a link, a
 * bookmark, Back. The store is written to the URL (with `replace`) once a
 * gesture has rested for {@link WINDOW_COMMIT_MS}, so dragging the timeline
 * never floods history, and the address bar always holds a link to what is
 * on screen.
 *
 * `written` remembers the last window either side handed the other. The URL
 * this hook wrote is not applied back to the store: by the time the router
 * reports it, the next gesture may have moved the window on, and applying the
 * stale write would snap it back.
 *
 * `?era=<id>` is read as that era's years and rewritten as `from`/`to`.
 */
export function useWindowSync(params: URLSearchParams): void {
  const dispatch = useAtlasDispatch();
  const navigate = useAtlasNavigate();
  const storeWindow = useAtlasSelector((s) => s.timeWindow);
  const written = useRef<string | null>(null);
  const latestParams = useRef(params);
  latestParams.current = params;

  const fromRaw = params.get('from');
  const toRaw = params.get('to');
  const eraRaw = params.get('era');

  // URL → store.
  useEffect(() => {
    const urlWindow = windowFromSearchParams(params);
    const key = keyOf(urlWindow);
    if (eraRaw !== null) {
      // An era link: state it as years, so the URL has one way to say it.
      written.current = key;
      navigate.setFrame({ window: urlWindow });
      dispatch({ type: 'SET_WINDOW', payload: urlWindow });
      return;
    }
    if (key === written.current) return;
    written.current = key;
    dispatch({ type: 'SET_WINDOW', payload: urlWindow });
    // Only when the window's own params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromRaw, toRaw, eraRaw]);

  // Store → URL, once the window rests.
  useEffect(() => {
    const key = keyOf(storeWindow);
    if (key === keyOf(windowFromSearchParams(latestParams.current))) return;
    const timer = window.setTimeout(() => {
      written.current = key;
      navigate.setFrame({ window: storeWindow });
    }, WINDOW_COMMIT_MS);
    return () => window.clearTimeout(timer);
  }, [storeWindow, navigate]);
}
