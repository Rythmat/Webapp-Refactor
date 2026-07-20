import {
  CITIES,
  HISTORICAL_MODULES,
  MUSIC_HISTORY,
  getTour,
} from '@/components/atlas/data';
import type { ModuleProgress, TourProgress } from '@/components/atlas/types';
import { sameCountry } from './country';

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
      const cityLower = ev.location.city.toLowerCase();
      const matches = CITIES.filter((c) => c.name.toLowerCase() === cityLower);
      const city =
        matches.find((c) => sameCountry(c.country, ev.location.country)) ??
        matches[0];
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
