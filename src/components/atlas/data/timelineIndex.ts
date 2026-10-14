import type { HistoricalEvent, RegionId } from '@/components/atlas/types';
import { nearestRegion } from '@/components/atlas/utils/deriveEventCities';
import { matchCity } from '@/components/atlas/utils/resolveEventRegion';
import { contentGeneration, MUSIC_HISTORY } from '@/content/contentStore';
import type { StreamId } from './streamIds';
import { primaryStream, streamsOf } from './streams';

/**
 * Every event as the timeline places it: in year order, with the stream it is
 * drawn in, the region and city it belongs to — worked out once per content
 * load rather than on every frame of a gesture.
 */
export interface TimelineEvent {
  event: HistoricalEvent;
  year: number;
  /** The lane it is drawn in. */
  stream: StreamId;
  /** Every stream its genres touch (a stream filter keeps it for any). */
  streams: StreamId[];
  regionId: RegionId;
  /** Its music city or town (lookups.getCityById), when it has one. */
  cityId: string | null;
}

let index: TimelineEvent[] | null = null;
let byId: Map<string, TimelineEvent> | null = null;
let builtFor = '';

function build(): TimelineEvent[] {
  // MUSIC_HISTORY fills in place when content hydrates (contentStore.ts), so
  // the index rebuilds when the generation moves — or the length, which
  // catches tests that push into it.
  const key = `${contentGeneration}:${MUSIC_HISTORY.length}`;
  if (index && builtFor === key) return index;
  index = MUSIC_HISTORY.map((event) => {
    const city = matchCity(event);
    return {
      event,
      year: event.year,
      stream: primaryStream(event),
      streams: streamsOf(event),
      regionId:
        city?.region ?? nearestRegion(event.location.lat, event.location.lng),
      cityId: city?.id ?? null,
    };
  }).sort((a, b) => a.year - b.year || a.event.id.localeCompare(b.event.id));
  byId = new Map(index.map((t) => [t.event.id, t]));
  builtFor = key;
  return index;
}

/** The events in year order, as the timeline places them. Empty before content loads. */
export function getTimelineIndex(): readonly TimelineEvent[] {
  return build();
}

export function getTimelineEvent(id: string): TimelineEvent | undefined {
  build();
  return byId?.get(id);
}

/**
 * The first index in `sorted` whose year is at least `year`: where a window
 * starting there begins. `sorted` is in year order, as the index is.
 */
export function lowerBound(
  sorted: readonly { year: number }[],
  year: number,
): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].year < year) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
