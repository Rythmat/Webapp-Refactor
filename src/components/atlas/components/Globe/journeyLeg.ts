import type { GuidedTour, ResolvedTourStop } from '@/components/atlas/data';
import { getCityById, getEventById } from '@/components/atlas/data/lookups';
import type {
  HistoricalEvent,
  HistoricalModule,
  ModuleProgress,
  TourProgress,
} from '@/components/atlas/types';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';

/** One end of a leg: where it is and what it is called. */
export interface LegEnd {
  lat: number;
  lng: number;
  label: string;
}

/**
 * The leg of a journey the map draws (owner, 2026-11-09): from the stop
 * shown to the next one, the only link while a tour or a pathway runs.
 */
export interface JourneyLeg {
  /** Which leg: a new one draws on afresh. */
  key: string;
  from: LegEnd;
  to: LegEnd;
  /** What the next stop is, for the line's hover card. */
  next: string;
}

/** What the legs are read from: the loaded tours and pathways. */
export interface LegGuides {
  getModuleById: (id: string) => HistoricalModule | undefined;
  getTour: (id: string) => GuidedTour | undefined;
  resolveTourStops: (tour: GuidedTour) => ResolvedTourStop[];
}

const eventEnd = (event: HistoricalEvent): LegEnd => ({
  lat: event.location.lat,
  lng: event.location.lng,
  label: eventPlaceName(event),
});

const stopEnd = (stop: ResolvedTourStop): LegEnd => ({
  lat: stop.lat,
  lng: stop.lng,
  label: (stop.cityId && getCityById(stop.cityId)?.name) || stop.title,
});

/**
 * The running journey's leg from its current stop to the next, or null: no
 * journey, its data not loaded, or the last stop (nowhere left to go).
 */
export function journeyLeg(
  guides: LegGuides | undefined,
  activeModule: ModuleProgress | null,
  activeTour: TourProgress | null,
): JourneyLeg | null {
  if (!guides) return null;
  if (activeTour) {
    const tour = guides.getTour(activeTour.tourId);
    if (!tour) return null;
    const stops = guides.resolveTourStops(tour);
    const step = activeTour.currentStep;
    const here = stops[step];
    const next = stops[step + 1];
    if (!here || !next) return null;
    return {
      key: `tour:${tour.id}:${step}`,
      from: stopEnd(here),
      to: stopEnd(next),
      next: next.title,
    };
  }
  if (activeModule) {
    const mod = guides.getModuleById(activeModule.moduleId);
    if (!mod) return null;
    const step = activeModule.currentStep;
    const here = getEventById(mod.eventIds[step]);
    const next = getEventById(mod.eventIds[step + 1]);
    if (!here || !next) return null;
    return {
      key: `pathway:${mod.id}:${step}`,
      from: eventEnd(here),
      to: eventEnd(next),
      next: next.title,
    };
  }
  return null;
}
