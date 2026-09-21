import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import {
  applyStopToSearchParams,
  stopFromSearchParams,
  type AtlasStop,
} from './atlasStop';

/** The stop the current URL addresses. */
export function useAtlasStop(): AtlasStop {
  const [params] = useSearchParams();
  return useMemo(() => stopFromSearchParams(params), [params]);
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
 */
export function useAtlasNavigate() {
  const [, setSearchParams] = useSearchParams();

  return useMemo(() => {
    const go = (stop: AtlasStop, options?: { replace?: boolean }) =>
      setSearchParams((prev) => applyStopToSearchParams(prev, stop), {
        replace: options?.replace,
      });

    return {
      go,
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
  }, [setSearchParams]);
}

export type AtlasNavigate = ReturnType<typeof useAtlasNavigate>;
