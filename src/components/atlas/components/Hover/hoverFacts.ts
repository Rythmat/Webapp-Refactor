import { getCityById, getEventById } from '@/components/atlas/data/lookups';
import type { EraId } from '@/components/atlas/data/musicalEras';
import { regionLabel } from '@/components/atlas/data/placeTree';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import type { HoverTarget } from '@/components/atlas/state/stageSignals';
import { eraSplit } from '@/components/atlas/stats/eraSplit';
import { eventsIn } from '@/components/atlas/stats/musicWeights';
import {
  inWindow,
  type TimeWindow,
} from '@/components/atlas/timeline/timeWindow';
import { getEventsForLocation } from '@/components/atlas/utils/getEventsForLocation';

/** What the hover card says about what the pointer is on. */
export interface HoverFacts {
  title: string;
  subtitle: string;
  /** Its events in the years shown, and how they fall across the eras. */
  events?: number;
  eras?: { id: EraId; count: number }[];
  /** For an event: its year and place. */
  detail?: string;
}

/** The facts for a hover target, in the years shown (null: all of time). */
export function hoverFacts(
  target: HoverTarget,
  w: TimeWindow | null,
): HoverFacts | null {
  if (target.kind === 'place') {
    const city = getCityById(target.id);
    if (!city) return null;
    const years = eventsIn(getTimelineIndex(), w)
      .filter((t) => t.cityId === target.id)
      .map((t) => t.year);
    return {
      title: city.name,
      subtitle: regionLabel(city.region),
      events: years.length,
      eras: eraSplit(years),
    };
  }
  if (target.kind === 'region') {
    const years = getEventsForLocation(target.place)
      .map((e) => e.year)
      .filter((y) => inWindow(w, y));
    const place = target.place;
    return {
      title:
        place.type === 'city'
          ? (getCityById(place.id)?.name ?? '')
          : place.name,
      subtitle:
        place.type === 'state'
          ? `State · ${place.country ?? 'United States'}`
          : 'Country',
      events: years.length,
      eras: eraSplit(years),
    };
  }
  if (target.kind === 'link') {
    return {
      title: target.title,
      subtitle: 'Connection',
      detail: target.detail,
    };
  }
  if (target.kind === 'event') {
    const event = getEventById(target.eventId);
    if (!event) return null;
    return {
      title: event.title,
      subtitle: 'Event',
      detail: [event.year, event.location.city].filter(Boolean).join(' · '),
    };
  }
  return null;
}
