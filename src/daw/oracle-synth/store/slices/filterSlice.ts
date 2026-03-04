import { StateCreator } from 'zustand';
import { FilterParams, FilterType } from '../../audio/types';

export interface FilterSlice {
  filters: [FilterParams, FilterParams];
  setFilterParam: <K extends keyof FilterParams>(
    index: 0 | 1,
    param: K,
    value: FilterParams[K]
  ) => void;
  setFilterType: (index: 0 | 1, type: FilterType) => void;
}

const defaultFilter = (enabled: boolean): FilterParams => ({
  type: 'lowpass',
  cutoff: 20000,
  resonance: 0,
  pan: 0,
  gain: 0,
  mix: 1,
  enabled,
});

export const createFilterSlice: StateCreator<
  FilterSlice,
  [],
  [],
  FilterSlice
> = (set) => ({
  filters: [defaultFilter(true), defaultFilter(false)],

  setFilterParam: (index, param, value) =>
    set((state) => {
      const newFilters = [...state.filters] as [FilterParams, FilterParams];
      newFilters[index] = { ...newFilters[index], [param]: value };
      return { filters: newFilters };
    }),

  setFilterType: (index, type) =>
    set((state) => {
      const newFilters = [...state.filters] as [FilterParams, FilterParams];
      newFilters[index] = { ...newFilters[index], type };
      return { filters: newFilters };
    }),
});
