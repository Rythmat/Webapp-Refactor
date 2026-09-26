import {
  CITIES,
  HISTORICAL_MODULES,
  MUSIC_HISTORY,
  getTour,
} from '@/components/atlas/data';
import type { ModuleProgress, TourProgress } from '@/components/atlas/types';
import { matchCity } from './resolveEventRegion';

/**
 * The set of city ids the globe should show while a guided sequence is active —
 * the "focus" that simplifies the globe to only the selected content:
 *  - Pathway (`activeModule`): the cities of the pathway's events.
 *  - Region tour: every city in that region.
 *  - City tour: just that city.
 * Returns `null` when nothing is active (show all cities), and also falls back
 * to `null` if a pathway resolves to zero known cities (never blank the globe).
 */
export function resolveFocusCities(
  activeModule: ModuleProgress | null,
  activeTour: TourProgress | null,
): Set<string> | null {
  if (activeModule) {
    const mod = HISTORICAL_MODULES.find((m) => m.id === activeModule.moduleId);
    if (!mod) return null;
    const ids = new Set<string>();
    for (const eventId of mod.eventIds) {
      const ev = MUSIC_HISTORY.find((e) => e.id === eventId);
      if (!ev) continue;
      // Same matcher the panels use, so a pathway step lights the city its
      // event is actually in (Portland, Maine — not Portland, Oregon).
      const city = matchCity(ev);
      if (city) ids.add(city.id);
    }
    return ids.size > 0 ? ids : null;
  }

  if (activeTour) {
    const tour = getTour(activeTour.tourId);
    if (!tour) return null;
    if (tour.kind === 'city') return new Set([tour.placeId]);
    // Region tour → every city in the region.
    return new Set(
      CITIES.filter((c) => c.region === tour.placeId).map((c) => c.id),
    );
  }

  return null;
}
