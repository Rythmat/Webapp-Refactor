import { StateCreator } from 'zustand';
import type { RoutingConfig, SourceId } from '../../audio/types';

export const DEFAULT_ROUTING: RoutingConfig = {
  filterRouting: {
    filter1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    filter2Sources: [],
  },
  envelopeRouting: {
    env1Sources: ['osc1', 'osc2', 'sub', 'noise'],
    env2Sources: [],
  },
};

export interface RoutingSlice {
  routing: RoutingConfig;
  toggleFilterSource: (filterIndex: 0 | 1, source: SourceId) => void;
  toggleEnvSource: (envIndex: 0 | 1, source: SourceId) => void;
}

function toggleInArray(arr: SourceId[], item: SourceId): SourceId[] {
  return arr.includes(item) ? arr.filter((s) => s !== item) : [...arr, item];
}

export const createRoutingSlice: StateCreator<
  RoutingSlice,
  [],
  [],
  RoutingSlice
> = (set) => ({
  routing: structuredClone(DEFAULT_ROUTING),

  toggleFilterSource: (filterIndex, source) =>
    set((state) => {
      const fr = state.routing.filterRouting;
      if (filterIndex === 0) {
        return {
          routing: {
            ...state.routing,
            filterRouting: {
              ...fr,
              filter1Sources: toggleInArray(fr.filter1Sources, source),
            },
          },
        };
      } else {
        return {
          routing: {
            ...state.routing,
            filterRouting: {
              ...fr,
              filter2Sources: toggleInArray(fr.filter2Sources, source),
            },
          },
        };
      }
    }),

  toggleEnvSource: (envIndex, source) =>
    set((state) => {
      const er = state.routing.envelopeRouting;
      if (envIndex === 0) {
        return {
          routing: {
            ...state.routing,
            envelopeRouting: {
              ...er,
              env1Sources: toggleInArray(er.env1Sources, source),
            },
          },
        };
      } else {
        return {
          routing: {
            ...state.routing,
            envelopeRouting: {
              ...er,
              env2Sources: toggleInArray(er.env2Sources, source),
            },
          },
        };
      }
    }),
});
