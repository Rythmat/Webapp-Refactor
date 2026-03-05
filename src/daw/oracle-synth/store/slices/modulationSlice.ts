import { StateCreator } from 'zustand';
import { ModRoute, ModTarget } from '../../audio/types';

export interface ModulationSlice {
  modRoutes: ModRoute[];
  addModRoute: () => void;
  removeModRoute: (id: string) => void;
  updateModRoute: (id: string, updates: Partial<ModRoute>) => void;
}

let routeCounter = 0;

export const createModulationSlice: StateCreator<
  ModulationSlice,
  [],
  [],
  ModulationSlice
> = (set) => ({
  modRoutes: [],

  addModRoute: () =>
    set((state) => ({
      modRoutes: [
        ...state.modRoutes,
        {
          id: `route-${++routeCounter}`,
          lfoIndex: 0,
          target: { source: 'flt1', param: 'cutoff' } as ModTarget,
          depthMin: 0,
          depthMax: 0.5,
          enabled: true,
        },
      ],
    })),

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
