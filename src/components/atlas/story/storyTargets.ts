import { useCallback } from 'react';
import { getEventsForArtist } from '@/components/atlas/data/artists';
import { eventImage } from '@/components/atlas/data/eventImage';
import { getEventById } from '@/components/atlas/data/lookups';
import {
  stopKey,
  type AtlasStop,
} from '@/components/atlas/navigation/atlasStop';
import {
  describeStop,
  type StopPresentation,
} from '@/components/atlas/navigation/describeStop';
import { flyToFit, markFlown } from '@/components/atlas/navigation/focusEvent';
import {
  useAtlasNavigate,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import type { NetworkIndex } from '@/components/atlas/network/networkIndex';
import type { PlaceLink } from '@/components/atlas/network/types';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import type { HistoricalEvent } from '@/components/atlas/types';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import type { StoryLinkEnd, StoryTarget } from './storyTypes';

/** A link's name: "New Orleans → Chicago". */
export const linkTitle = (from: string, to: string) => `${from} → ${to}`;

/**
 * How a stop presents itself: as the trail does (describeStop), and a link
 * by its two places, with the Route glyph and an influence's picture.
 */
export function describeTarget(target: StoryTarget): StopPresentation {
  if (target.kind !== 'link') return describeStop(target);
  return {
    kind: 'pathway',
    title: linkTitle(target.from.label, target.to.label),
    subtitle: 'Connection',
    thumb: eventImage(getEventById(target.eventId), 'thumb'),
  };
}

/** The event a stop is about, for the tiles: an event's own, a link's. */
export function targetEvent(target: StoryTarget): HistoricalEvent | null {
  if (target.kind === 'event') return getEventById(target.eventId) ?? null;
  if (target.kind === 'link') return getEventById(target.eventId) ?? null;
  return null;
}

/** An event standing for a stop on a cover: its own, else its first. */
export function coverEvent(target: StoryTarget): HistoricalEvent | null {
  switch (target.kind) {
    case 'event':
    case 'link':
      return targetEvent(target);
    case 'artist':
      return getEventsForArtist(target.artist)[0] ?? null;
    case 'place':
      return getEventsForLocation(target.place)[0] ?? null;
  }
}

/** A link of the network as a stop, its ends kept as they are now. */
export function linkTarget(
  ix: NetworkIndex,
  link: PlaceLink,
): Extract<StoryTarget, { kind: 'link' }> | null {
  const end = (id: string): StoryLinkEnd | null => {
    const node = ix.node(id);
    return node
      ? { label: node.label, lat: node.lat, lng: node.lng, place: node.place }
      : null;
  };
  const from = end(link.from);
  const to = end(link.to);
  if (!from || !to) return null;
  return {
    kind: 'link',
    linkId: link.id,
    from,
    to,
    // The influenced event: the music arriving.
    eventId: link.sample[0]?.[1],
  };
}

/**
 * Show a Story's stop, its details in the Inspector (Story mode rides along
 * on the URL): an event, a place or an artist as Explore would; a link by
 * framing both its places, then opening the place it went to (or the world,
 * for a region) with the link lit on the map.
 */
export function useGoToStoryStop() {
  const navigate = useAtlasNavigate();
  const dispatch = useAtlasDispatch();
  const signals = useStageSignals();
  const here = stopKey(useAtlasStop());
  return useCallback(
    (target: StoryTarget) => {
      if (target.kind !== 'link') {
        signals.linkFocus.set(null);
        navigate.go(target);
        return;
      }
      const fly = flyToFit([target.from, target.to]);
      const stop: AtlasStop = target.to.place
        ? { kind: 'place', place: target.to.place }
        : { kind: 'home' };
      // The URL sync would fly to the place alone; this flight frames both.
      if (stop.kind === 'place' && stopKey(stop) !== here) {
        markFlown(stopKey(stop));
      }
      navigate.go(stop);
      if (fly) dispatch({ type: 'EXECUTE_SEARCH', payload: fly });
      signals.linkFocus.set(target.linkId);
    },
    [navigate, dispatch, signals, here],
  );
}
