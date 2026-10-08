import { StateCreator } from 'zustand';
import { ModRoute, ModTarget } from '../../audio/types';

export interface ModulationSlice {
  modRoutes: ModRoute[];
  addModRoute: () => void;
  removeModRoute: (id: string) => void;
  updateModRoute: (id: string, updates: Partial<ModRoute>) => void;
}

let routeCounter = 0;

/** N in a `route-N` id, the form addModRoute mints; 0 for any other id. */
function routeNumber(id: string): number {
  const match = /^route-(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

/**
 * Move the route id counter past every `route-N` id in `routes`. The counter
 * starts again at 0 on each page load, while a patch restored from a saved
 * project, a kept session or another track keeps its route ids. Without this,
 * the first route added after a reload repeated one already in the patch, and
 * editing or removing either route changed both (synth-store-06).
 */
function reserveModRouteIds(routes: readonly { id: string }[]): void {
  for (const route of routes) {
    routeCounter = Math.max(routeCounter, routeNumber(route.id));
  }
}

/**
 * `routes` with no id used twice. Patches saved while the counter could
 * repeat an id (drafts, cloud projects, user presets) can hold two routes
 * with one id, and editing or removing either changed both. The first route
 * with an id keeps it; each later one gets the next `route-N` past the
 * highest in the patch, so the same patch is repaired the same way on every
 * load. Returns `routes` itself when every id is already unique.
 */
export function withUniqueModRouteIds<R extends { id: string }>(
  routes: R[],
): R[] {
  if (new Set(routes.map((route) => route.id)).size === routes.length) {
    return routes;
  }
  let highest = 0;
  for (const route of routes) {
    highest = Math.max(highest, routeNumber(route.id));
  }
  const used = new Set<string>();
  return routes.map((route) => {
    if (!used.has(route.id)) {
      used.add(route.id);
      return route;
    }
    const id = `route-${++highest}`;
    used.add(id);
    return { ...route, id };
  });
}

export const createModulationSlice: StateCreator<
  ModulationSlice,
  [],
  [],
  ModulationSlice
> = (set) => ({
  modRoutes: [],

  addModRoute: () =>
    set((state) => {
      // Reserve the patch's own ids first, however they arrived: restored by
      // the synth panel for a track, or loaded from a preset or a pack.
      reserveModRouteIds(state.modRoutes);
      return {
        modRoutes: [
          ...state.modRoutes,
          {
            id: `route-${++routeCounter}`,
            source: { type: 'lfo', index: 0 },
            target: { source: 'flt1', param: 'cutoff' } as ModTarget,
            amount: 0.5,
            polarity: 'unipolar',
            curve: 'linear',
            enabled: true,
          } satisfies ModRoute,
        ],
      };
    }),

  removeModRoute: (id) =>
    set((state) => ({
      modRoutes: state.modRoutes.filter((r) => r.id !== id),
    })),

  updateModRoute: (id, updates) =>
    set((state) => ({
      modRoutes: state.modRoutes.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),
});
