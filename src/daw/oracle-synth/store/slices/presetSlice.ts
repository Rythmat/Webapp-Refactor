import { StateCreator } from 'zustand';
import {
  PresetData,
  PRESET_VERSION,
  StoredPreset,
} from '../presets/PresetData';
import { FACTORY_PRESETS, INITIALIZE } from '../presets/factoryPresets';
import { DEFAULT_FX } from './fxSlice';
import { DEFAULT_ROUTING } from './routingSlice';
import { DEFAULT_ARP } from './arpSlice';
import { defaultMacros } from './macroSlice';
import { DEFAULT_KEYSCALE } from './keyScaleSlice';
import { withUniqueModRouteIds } from './modulationSlice';
import { migrateModRoute } from '../../audio/modMath';
import type { SynthStore } from '../storeTypes';
import {
  getLocalStoreUserKey,
  onLocalStoreUserChange,
  type UserKey,
} from '@/lib/local-store/userScope';

// ── The student's own presets, per user ─────────────────────────────────────
//
// Saved presets follow the student, not a project or a device: on a shared
// Chromebook each user keeps theirs under their own key
// (`oracle-synth-presets:<userKey>`, userScope.ts). The pre-1.4 list was one
// per device (LEGACY_PRESETS_KEY); a user's first load copies it into their
// own key, so nobody loses a preset they could see before. The device list
// itself is never written or deleted (an older tab may still use it).
//
// Following userScope.ts: nothing is read or written while the device's user
// is unknown (auth hasn't answered yet); the list is empty then, and a preset
// saved meanwhile joins the user's list once they are known. A signed-out
// session keeps its own under 'anon'. The store reloads the list whenever
// the user changes.

/** The pre-1.4 device-wide list: read once per user, never written. */
export const LEGACY_PRESETS_KEY = 'oracle-synth-presets';

/** Where a user's own presets live. */
export function userPresetsKey(userKey: UserKey): string {
  return `${LEGACY_PRESETS_KEY}:${userKey}`;
}

function readPresetList(key: string): StoredPreset[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredPreset[]) : [];
  } catch {
    return [];
  }
}

function writePresetList(key: string, presets: StoredPreset[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(presets));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

/**
 * The current user's saved presets: their own list, or on their first load
 * a copy of the device list (written to their key at once when it holds
 * anything, so later changes to the device list by an older tab don't leak
 * in; an empty copy writes nothing, so merely opening the synth doesn't make
 * someone count as another user of the device). Empty while the user is
 * unknown.
 */
export function loadUserPresets(): StoredPreset[] {
  const userKey = getLocalStoreUserKey();
  if (userKey === null) return [];
  const key = userPresetsKey(userKey);
  const own = readPresetList(key);
  if (own !== null) return own;
  const device = readPresetList(LEGACY_PRESETS_KEY) ?? [];
  if (device.length > 0) writePresetList(key, device);
  return device;
}

function saveUserPresets(presets: StoredPreset[]): void {
  const userKey = getLocalStoreUserKey();
  if (userKey === null) return;
  writePresetList(userPresetsKey(userKey), presets);
}

/** Extract serializable preset data from current store state */
function extractPresetData(state: SynthStore, name: string): PresetData {
  return {
    name,
    version: PRESET_VERSION,
    oscillators: structuredClone(state.oscillators),
    subOscillator: structuredClone(state.subOscillator),
    noise: structuredClone(state.noise),
    filters: structuredClone(state.filters),
    envelopes: structuredClone(state.envelopes),
    lfos: structuredClone(state.lfos),
    modRoutes: structuredClone(state.modRoutes),
    voiceMode: state.voiceMode,
    voiceCount: state.voiceCount,
    glide: state.glide,
    spread: state.spread,
    masterVolume: state.masterVolume,
    fx: structuredClone(state.fx),
    fxRoutes: structuredClone(state.fxRoutes),
    routing: structuredClone(state.routing),
    arp: structuredClone(state.arp),
    macros: structuredClone(state.macros),
    keyScale: structuredClone(state.keyScale),
  };
}

/** Apply preset data to store (returns partial state for set()) */
export function applyPresetData(data: PresetData): Partial<SynthStore> {
  // Migrate LFO data: old presets may lack the `smooths` field
  const lfos = structuredClone(data.lfos);
  for (const lfo of lfos) {
    if (!lfo.smooths) {
      lfo.smooths = [0, 0, 0, 0];
    }
    // Migrate rateDivs: old presets have flat [RateDiv, RateDiv, RateDiv, RateDiv]
    // New format is nested [[RateDiv x4], [RateDiv x4], [RateDiv x4], [RateDiv x4]]
    if (lfo.rateDivs && typeof lfo.rateDivs[0] === 'string') {
      const flat = lfo.rateDivs as unknown as string[];
      lfo.rateDivs = flat.map((r) => [r, r, r, r]) as typeof lfo.rateDivs;
    }
    // Migrate rateModifiers: old presets may lack this field
    if (!lfo.rateModifiers) {
      lfo.rateModifiers = ['normal', 'normal', 'normal', 'normal'];
    }
  }

  // Migrate oscillators: pre-v3 presets lack warpMode/warpAmount. Backfill
  // an inert warp so they sound identical (a set key must not remain
  // undefined, which would trip the engine's `!== undefined` guards).
  const oscillators = structuredClone(data.oscillators);
  for (const o of oscillators) {
    if (o.warpMode === undefined) o.warpMode = 'none';
    if (o.warpAmount === undefined) o.warpAmount = 0;
  }

  // Migrate FX data: old presets may lack the `fx` field entirely, and v2
  // presets have `fx` but no `reverb` slot — merge per-field so the reverb
  // default is injected while any present effects are preserved.
  const fx = structuredClone({ ...DEFAULT_FX, ...(data.fx ?? {}) });

  // Migrate FX routes: old presets may lack the `fxRoutes` field
  const fxRoutes = data.fxRoutes ? structuredClone(data.fxRoutes) : [];

  // Migrate routing: old presets may lack the `routing` field
  const routing = data.routing
    ? structuredClone(data.routing)
    : structuredClone(DEFAULT_ROUTING);

  // Migrate arp: old presets may lack the `arp` field
  const arp = data.arp
    ? structuredClone(data.arp)
    : structuredClone(DEFAULT_ARP);

  // Migrate mod routes: v1 routes carry {lfoIndex, depthMin, depthMax}. A
  // user preset saved while route ids could repeat gets unique ones.
  const modRoutes = withUniqueModRouteIds(
    structuredClone(data.modRoutes).map(migrateModRoute),
  );

  // v2 fields: default when loading v1 presets
  const macros = data.macros ? structuredClone(data.macros) : defaultMacros();
  const keyScale = data.keyScale
    ? structuredClone(data.keyScale)
    : structuredClone(DEFAULT_KEYSCALE);

  return {
    presetName: data.name,
    isDirty: false,
    oscillators,
    subOscillator: structuredClone(data.subOscillator),
    noise: structuredClone(data.noise),
    filters: structuredClone(data.filters),
    envelopes: structuredClone(data.envelopes),
    lfos,
    modRoutes,
    voiceMode: data.voiceMode,
    voiceCount: data.voiceCount,
    glide: data.glide,
    spread: data.spread,
    masterVolume: data.masterVolume,
    fx,
    fxRoutes,
    routing,
    arp,
    macros,
    keyScale,
  };
}

export interface PackPreset {
  name: string;
  data: PresetData;
  category: string;
}

export interface PresetSlice {
  presetName: string;
  isDirty: boolean;
  userPresets: StoredPreset[];
  /** Runtime-loaded factory extension packs (e.g. the Serum pack). */
  packPresets: PackPreset[];
  packDisplayName: string | null;
  registerPackPresets: (displayName: string, presets: PackPreset[]) => void;
  setPresetName: (name: string) => void;
  markDirty: () => void;
  loadPreset: (name: string) => void;
  savePreset: (name: string) => void;
  deletePreset: (name: string) => void;
  exportPreset: () => string;
  importPreset: (json: string) => boolean;
  initPreset: () => void;
  getPresetList: () => {
    name: string;
    isFactory: boolean;
    isPack?: boolean;
  }[];
}

export const createPresetSlice: StateCreator<
  SynthStore,
  [],
  [],
  PresetSlice
> = (set, get) => {
  // Another user on this page (a sign-in, a sign-out, a switch of account
  // without a reload): show theirs. Presets saved while the user was still
  // unknown were never written: they join the newly known user's list. The
  // synth store is a page singleton, so this subscription lasts as long as
  // the page.
  let loadedFor: UserKey | null = getLocalStoreUserKey();
  onLocalStoreUserChange(() => {
    const userKey = getLocalStoreUserKey();
    const previous = loadedFor;
    loadedFor = userKey;
    if (userKey === previous) return;
    const loaded = loadUserPresets();
    const unsaved =
      previous === null && userKey !== null
        ? get().userPresets.filter(
            (p) => !loaded.some((l) => l.name === p.name),
          )
        : [];
    if (unsaved.length === 0) {
      set({ userPresets: loaded });
      return;
    }
    const merged = [...loaded, ...unsaved];
    saveUserPresets(merged);
    set({ userPresets: merged });
  });
  return {
    presetName: 'INITIALIZE',
    isDirty: false,
    userPresets: loadUserPresets(),
    packPresets: [],
    packDisplayName: null,

    registerPackPresets: (displayName, presets) =>
      set({ packDisplayName: displayName, packPresets: presets }),

    setPresetName: (name) => set({ presetName: name }),
    markDirty: () => set({ isDirty: true }),

    loadPreset: (name) => {
      // Check factory presets first
      const factory = FACTORY_PRESETS.find((p) => p.name === name);
      if (factory) {
        set(applyPresetData(factory) as Partial<SynthStore>);
        return;
      }
      const state = get();
      // Then extension-pack presets
      const pack = state.packPresets.find((p) => p.name === name);
      if (pack) {
        set(applyPresetData(pack.data) as Partial<SynthStore>);
        return;
      }
      // Then user presets
      const user = state.userPresets.find((p) => p.name === name);
      if (user) {
        set(applyPresetData(user.data) as Partial<SynthStore>);
      }
    },

    savePreset: (name) => {
      const state = get();
      const data = extractPresetData(state, name);
      const stored: StoredPreset = { name, data, isFactory: false };

      const existing = state.userPresets.filter((p) => p.name !== name);
      const updated = [...existing, stored];
      saveUserPresets(updated);
      set({ userPresets: updated, presetName: name, isDirty: false });
    },

    deletePreset: (name) => {
      const state = get();
      const updated = state.userPresets.filter((p) => p.name !== name);
      saveUserPresets(updated);
      set({ userPresets: updated });
    },

    exportPreset: () => {
      const state = get();
      const data = extractPresetData(state, state.presetName);
      return JSON.stringify(data, null, 2);
    },

    importPreset: (json) => {
      try {
        const data = JSON.parse(json) as PresetData;
        if (!data.name || !data.version || !data.oscillators) return false;
        set(applyPresetData(data) as Partial<SynthStore>);
        return true;
      } catch {
        return false;
      }
    },

    initPreset: () => {
      set(applyPresetData(INITIALIZE) as Partial<SynthStore>);
    },

    getPresetList: () => {
      const state = get();
      const factory = FACTORY_PRESETS.map((p) => ({
        name: p.name,
        isFactory: true,
      }));
      const pack = state.packPresets.map((p) => ({
        name: p.name,
        isFactory: true,
        isPack: true,
      }));
      const user = state.userPresets.map((p) => ({
        name: p.name,
        isFactory: false,
      }));
      return [...factory, ...pack, ...user];
    },
  };
};
