import { getEventsForArtist } from '@/components/atlas/data/artists';
import { getEventById } from '@/components/atlas/data/lookups';
import {
  getTimelineEvent,
  type TimelineEvent,
} from '@/components/atlas/data/timelineIndex';
import {
  stopKey,
  type AtlasStop,
} from '@/components/atlas/navigation/atlasStop';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import type {
  HistoricalEvent,
  SelectedLocation,
} from '@/components/atlas/types';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';
import { matchCity } from '@/components/atlas/utils/resolveEventRegion';

/**
 * What a stop is about, for what summarises it (the cards, the map's links):
 * its events, in year order, and its name. An event's stop is about its
 * city, with the event itself pinned there. The world, a search, a tour or
 * a pathway has none: the world's cards and the journeys speak for those.
 */
export interface StopScope {
  kind: 'place' | 'artist' | 'event';
  /** stopKey: the same stop, the same key. */
  key: string;
  title: string;
  subtitle: string;
  events: readonly TimelineEvent[];
  eventIds: ReadonlySet<string>;
  /** The place the stop is (an event's: its city), when it is one. */
  place: SelectedLocation | null;
  /** An event stop's own event. */
  pinned: TimelineEvent | null;
}

const timeline = (events: readonly HistoricalEvent[]): TimelineEvent[] =>
  events
    .map((e) => getTimelineEvent(e.id))
    .filter((t): t is TimelineEvent => !!t)
    .sort((a, b) => a.year - b.year);

function scopeOf(
  kind: StopScope['kind'],
  key: string,
  events: TimelineEvent[],
  presented: { title: string; subtitle: string },
  place: SelectedLocation | null,
  pinned: TimelineEvent | null = null,
): StopScope {
  return {
    kind,
    key,
    title: presented.title,
    subtitle: presented.subtitle,
    events,
    eventIds: new Set(events.map((t) => t.event.id)),
    place,
    pinned,
  };
}

export function stopScope(stop: AtlasStop): StopScope | null {
  const key = stopKey(stop);
  switch (stop.kind) {
    case 'place':
      return scopeOf(
        'place',
        key,
        timeline(getEventsForLocation(stop.place)),
        describeStop(stop),
        stop.place,
      );
    case 'artist':
      return scopeOf(
        'artist',
        key,
        timeline(getEventsForArtist(stop.artist)),
        describeStop(stop),
        null,
      );
    case 'event': {
      const event = getEventById(stop.eventId);
      const pinned = event ? (getTimelineEvent(event.id) ?? null) : null;
      if (!event || !pinned) return null;
      const city = matchCity(event);
      if (!city) {
        return scopeOf(
          'event',
          key,
          [pinned],
          describeStop(stop),
          null,
          pinned,
        );
      }
      const place: SelectedLocation = { type: 'city', id: city.id };
      return scopeOf(
        'event',
        key,
        timeline(getEventsForLocation(place)),
        describeStop({ kind: 'place', place }),
        place,
        pinned,
      );
    }
    default:
      return null;
  }
}
