import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import {
  applyFrameToSearchParams,
  frameFromSearchParams,
  type AtlasFrame,
} from './atlasFrame';
import {
  applyStopToSearchParams,
  stopFromSearchParams,
  type AtlasStop,
} from './atlasStop';
import { sectionFrame, type AtlasSectionId } from './sections';

type SetSearchParams = ReturnType<typeof useSearchParams>[1];

function buildNavigate(setSearchParams: SetSearchParams) {
  /** Go to a stop (a step of its own), optionally changing the frame too. */
  const go = (
    stop: AtlasStop,
    options?: { replace?: boolean; frame?: Partial<AtlasFrame> },
  ) =>
    setSearchParams(
      (prev) => {
        const next = applyStopToSearchParams(prev, stop);
        return options?.frame
          ? applyFrameToSearchParams(next, options.frame)
          : next;
      },
      { replace: options?.replace },
    );

  /**
   * Change how the page looks at the stop — view, lens, years, streams —
   * without adding a step to Back or the trail.
   */
  const setFrame = (patch: Partial<AtlasFrame>) =>
    setSearchParams((prev) => applyFrameToSearchParams(prev, patch), {
      replace: true,
    });

  return {
    go,
    setFrame,
    /** Open one of the five sections (navigation/sections.ts). */
    toSection: (id: AtlasSectionId) => setFrame(sectionFrame(id)),
    toEvent: (event: HistoricalEvent | string) =>
      go({
        kind: 'event',
        eventId: typeof event === 'string' ? event : event.id,
      }),
    toArtist: (artist: string) => go({ kind: 'artist', artist }),
    toPlace: (place: SelectedLocation) => go({ kind: 'place', place }),
    toSearch: (query: string) => go({ kind: 'search', query }),
    toPathway: (pathwayId: string) => go({ kind: 'pathway', pathwayId }),
    toTour: (tourId: string) => go({ kind: 'tour', tourId }),
    home: () => go({ kind: 'home' }),
  };
}

export type AtlasNavigate = ReturnType<typeof buildNavigate>;

/**
 * The URL as the Globe page sees it, held outside React so a component can
 * subscribe to just the part it reads.
 *
 * `useSearchParams` re-renders its caller on every URL change, and so does any
 * hook built on it — so a component that only ever *called* navigate re-ran on
 * every click anywhere on the page. The provider is now the one subscriber; it
 * passes a navigate that never changes identity and publishes the params to
 * components that select from them.
 */
interface AtlasUrl {
  navigate: AtlasNavigate;
  getParams: () => URLSearchParams;
  subscribe: (listener: () => void) => () => void;
}

interface AtlasUrlChannel extends AtlasUrl {
  notify: () => void;
}

const AtlasUrlContext = createContext<AtlasUrl | null>(null);

export function AtlasNavigationProvider({ children }: { children: ReactNode }) {
  const [params, setSearchParams] = useSearchParams();
  // react-router's setter closes over the params of its render, and its
  // functional update reads them, so calls go through the latest one.
  const latestSet = useRef(setSearchParams);
  const latestParams = useRef(params);
  const [url] = useState<AtlasUrlChannel>(() => {
    const listeners = new Set<() => void>();
    return {
      navigate: buildNavigate((next, options) =>
        latestSet.current(next, options),
      ),
      getParams: () => latestParams.current,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      notify: () => listeners.forEach((l) => l()),
    };
  });

  // Published in a layout effect, so subscribers re-render in the same tick,
  // before paint, and the URL-sync effects of this commit have already run.
  useLayoutEffect(() => {
    latestSet.current = setSearchParams;
    if (latestParams.current === params) return;
    latestParams.current = params;
    url.notify();
  }, [params, setSearchParams, url]);

  return createElement(AtlasUrlContext.Provider, { value: url }, children);
}

function useAtlasUrl(): AtlasUrl {
  const url = useContext(AtlasUrlContext);
  if (!url) {
    throw new Error(
      'Atlas navigation is used outside <AtlasNavigationProvider>.',
    );
  }
  return url;
}

/**
 * Select from the Globe's URL params. Re-renders only when the selected value
 * changes by `equality` (`Object.is` unless given).
 */
export function useAtlasParams<T>(
  selector: (params: URLSearchParams) => T,
  equality: (a: T, b: T) => boolean = Object.is,
): T {
  const { getParams, subscribe } = useAtlasUrl();
  const memo = useRef<{
    params: URLSearchParams;
    selector: (params: URLSearchParams) => T;
    value: T;
  } | null>(null);
  const getSnapshot = (): T => {
    const params = getParams();
    const last = memo.current;
    if (last && last.params === params && last.selector === selector) {
      return last.value;
    }
    const next = selector(params);
    const value = last && equality(last.value, next) ? last.value : next;
    memo.current = { params, selector, value };
    return value;
  };
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const stopSearch = (stop: AtlasStop) =>
  applyStopToSearchParams(new URLSearchParams(), stop).toString();

const sameStop = (a: AtlasStop, b: AtlasStop) =>
  a.kind === b.kind && stopSearch(a) === stopSearch(b);

/** The stop the current URL addresses. Re-renders only when it changes. */
export function useAtlasStop(): AtlasStop {
  return useAtlasParams(stopFromSearchParams, sameStop);
}

/**
 * One value derived from the frame (navigation/atlasFrame.ts): the view, the
 * lens, the years. Re-renders only when that value changes.
 */
export function useAtlasFrame<T>(
  select: (frame: AtlasFrame) => T,
  equality?: (a: T, b: T) => boolean,
): T {
  return useAtlasParams(
    (params) => select(frameFromSearchParams(params)),
    equality,
  );
}

/** One value derived from the current stop, e.g. the artist on an artist stop. */
export function useAtlasStopSelector<T>(select: (stop: AtlasStop) => T): T {
  return useAtlasParams((params) => select(stopFromSearchParams(params)));
}

/**
 * Move the globe to a new stop by writing it to the URL.
 *
 * This is the ONLY way UI should change what the globe is showing. The URL is
 * the source of truth and useAtlasUrlSync turns it into reducer state, so every
 * click is automatically a history entry — bookmarkable, shareable into a
 * lesson, and reachable with Back / Forward and the trail strip.
 *
 * `replace` is for corrections that should not become a step of their own
 * (normalizing a malformed deep-link, say); ordinary clicks push.
 *
 * The returned object never changes identity and calling this hook never
 * re-renders the caller on a URL change.
 */
export function useAtlasNavigate(): AtlasNavigate {
  return useAtlasUrl().navigate;
}
