import type { HistoricalModule } from '@/components/atlas/types';
import { HISTORICAL_MODULES } from './historicalModules';

/**
 * The Globe's guided sequences, Guided Tours and Pathways, as one lazily
 * loaded chunk (`guidesData` in loaders.ts). Neither is needed to draw the
 * globe; they load when a tour or pathway starts, a trail entry names one, or
 * the command palette lists them.
 */
export { GUIDED_TOURS, getTour, resolveTourStops } from './guidedTours';
export { HISTORICAL_MODULES };

let modules: Map<string, HistoricalModule> | null = null;

export function getModuleById(
  id: string | null | undefined,
): HistoricalModule | undefined {
  if (!id) return undefined;
  modules ??= new Map(HISTORICAL_MODULES.map((m) => [m.id, m]));
  return modules.get(id);
}
