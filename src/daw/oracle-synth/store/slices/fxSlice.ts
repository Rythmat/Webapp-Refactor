import { StateCreator } from 'zustand';
import type {
  FXParams,
  FXRoute,
  FXType,
  ChorusParams,
  DelayParams,
  PhaserParams,
  CompressorParams,
  DriveParams,
  ReverbParams,
} from '../../audio/types';

export interface FXSlice {
  fx: FXParams;
  fxRoutes: FXRoute[];
  setChorusParam: <K extends keyof ChorusParams>(
    key: K,
    value: ChorusParams[K],
  ) => void;
  setDelayParam: <K extends keyof DelayParams>(
    key: K,
    value: DelayParams[K],
  ) => void;
  setPhaserParam: <K extends keyof PhaserParams>(
    key: K,
    value: PhaserParams[K],
  ) => void;
  setCompressorParam: <K extends keyof CompressorParams>(
    key: K,
    value: CompressorParams[K],
  ) => void;
  setDriveParam: <K extends keyof DriveParams>(
    key: K,
    value: DriveParams[K],
  ) => void;
  setReverbParam: <K extends keyof ReverbParams>(
    key: K,
    value: ReverbParams[K],
  ) => void;
  setFXParams: (fx: FXParams) => void;
  addFXRoute: () => void;
  /** The id of `type`'s route, adding one (its effect left as it is) if none. */
  ensureFXRoute: (type: FXType) => string;
  removeFXRoute: (id: string) => void;
  updateFXRoute: (id: string, updates: Partial<FXRoute>) => void;
  setFXRoutes: (routes: FXRoute[]) => void;
}

export const DEFAULT_FX: FXParams = {
  chorus: { enabled: false, rate: 1.5, depth: 0.5, mix: 0.5 },
  delay: { enabled: false, time: 0.3, feedback: 0.3, mix: 0.3 },
  phaser: { enabled: false, rate: 0.5, depth: 0.5, mix: 0.5 },
  compressor: {
    enabled: false,
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
  },
  drive: { enabled: false, amount: 0.3, mix: 0.5 },
  reverb: { enabled: false, size: 0.5, decay: 0.5, damping: 0.3, mix: 0.3 },
};

const FX_TYPES: FXType[] = [
  'drive',
  'chorus',
  'phaser',
  'delay',
  'reverb',
  'compressor',
];

let fxRouteId = 0;

// Loaded patches carry their own `fx-<n>` ids, so a new id skips any the
// patch already uses.
function newRouteId(routes: readonly FXRoute[]): string {
  let id = `fx-${++fxRouteId}`;
  while (routes.some((r) => r.id === id)) id = `fx-${++fxRouteId}`;
  return id;
}

export const createFXSlice: StateCreator<FXSlice, [], [], FXSlice> = (
  set,
  get,
) => ({
  fx: structuredClone(DEFAULT_FX),
  fxRoutes: [],

  setChorusParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, chorus: { ...state.fx.chorus, [key]: value } },
    })),

  setDelayParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, delay: { ...state.fx.delay, [key]: value } },
    })),

  setPhaserParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, phaser: { ...state.fx.phaser, [key]: value } },
    })),

  setCompressorParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, compressor: { ...state.fx.compressor, [key]: value } },
    })),

  setDriveParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, drive: { ...state.fx.drive, [key]: value } },
    })),

  setReverbParam: (key, value) =>
    set((state) => ({
      fx: { ...state.fx, reverb: { ...state.fx.reverb, [key]: value } },
    })),

  setFXParams: (fx) => set({ fx: structuredClone(fx) }),

  addFXRoute: () => {
    const state = get();
    // An effect that is on already shows in the panel, routed or not, so a
    // new slot never "adds" one the student can already hear.
    const usedTypes = new Set(state.fxRoutes.map((r) => r.type));
    const availableType = FX_TYPES.find(
      (t) => !usedTypes.has(t) && !state.fx[t].enabled,
    );
    if (!availableType) return; // all 6 types in use
    const id = newRouteId(state.fxRoutes);
    const newRoute: FXRoute = { id, type: availableType, target: 'master' };
    set((s) => ({
      fxRoutes: [...s.fxRoutes, newRoute],
      fx: {
        ...s.fx,
        [availableType]: { ...s.fx[availableType], enabled: true },
      },
    }));
  },

  ensureFXRoute: (type) => {
    const { fxRoutes } = get();
    const existing = fxRoutes.find((r) => r.type === type);
    if (existing) return existing.id;
    const id = newRouteId(fxRoutes);
    set((s) => ({ fxRoutes: [...s.fxRoutes, { id, type, target: 'master' }] }));
    return id;
  },

  removeFXRoute: (id) => {
    const state = get();
    const route = state.fxRoutes.find((r) => r.id === id);
    if (!route) return;
    set((s) => ({
      fxRoutes: s.fxRoutes.filter((r) => r.id !== id),
      fx: { ...s.fx, [route.type]: { ...s.fx[route.type], enabled: false } },
    }));
  },

  updateFXRoute: (id, updates) => {
    const state = get();
    const route = state.fxRoutes.find((r) => r.id === id);
    if (!route) return;

    // If type is changing, disable old effect and enable new one
    if (updates.type && updates.type !== route.type) {
      const oldType = route.type;
      const newType = updates.type;
      set((s) => ({
        fxRoutes: s.fxRoutes.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
        fx: {
          ...s.fx,
          [oldType]: { ...s.fx[oldType], enabled: false },
          [newType]: { ...s.fx[newType], enabled: true },
        },
      }));
    } else {
      set((s) => ({
        fxRoutes: s.fxRoutes.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
      }));
    }
  },

  setFXRoutes: (routes) => set({ fxRoutes: routes }),
});
