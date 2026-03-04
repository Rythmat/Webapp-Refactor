import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Markers Slice ──────────────────────────────────────────────────────
// Named markers on the timeline ruler (e.g. Intro, Verse, Chorus).

export interface Marker {
  id: string;
  tick: number;
  name: string;
  color: string;
}

export interface MarkersSlice {
  markers: Marker[];
  addMarker: (tick: number, name: string, color?: string) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, updates: Partial<Omit<Marker, 'id'>>) => void;
}

const DEFAULT_MARKER_COLOR = '#f59e0b';

export const createMarkersSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  MarkersSlice
> = (set) => ({
  markers: [],

  addMarker: (tick, name, color) =>
    set((state) => ({
      markers: [
        ...state.markers,
        {
          id: `marker-${crypto.randomUUID().slice(0, 8)}`,
          tick: Math.max(0, tick),
          name,
          color: color ?? DEFAULT_MARKER_COLOR,
        },
      ],
    })),

  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
    })),

  updateMarker: (id, updates) =>
    set((state) => ({
      markers: state.markers.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
});
