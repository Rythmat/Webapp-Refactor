import {
  MUSIC_HISTORY,
  type GuidedTour,
  type ResolvedTourStop,
} from '@/components/atlas/data';
import type { HistoricalEvent } from '@/components/atlas/types';
import { getEventsForLocation } from './getEventsForLocation';

/**
 * Which HistoricalEvent to pin (and fully expand) at a Guided Tour stop:
 *  - an authored `stop.eventId` always wins;
 *  - otherwise the stop's city events, sorted by year: **city tours** walk that
 *    city's timeline by step index; **region tours** pin the city's origin
 *    (earliest) event;
 *  - region-overview stops (no `cityId`) pin nothing.
 */
export function resolveStopEvent(
  tour: GuidedTour,
  stop: ResolvedTourStop,
  index: number,
): HistoricalEvent | null {
  if (stop.eventId) {
    return MUSIC_HISTORY.find((e) => e.id === stop.eventId) ?? null;
  }
  if (!stop.cityId) return null;
  const cityEvents = getEventsForLocation({ type: 'city', id: stop.cityId });
  if (cityEvents.length === 0) return null;
  return tour.kind === 'city'
    ? cityEvents[Math.min(index, cityEvents.length - 1)]
    : cityEvents[0];
}
