import type {
  GlobeLayers,
  LandColor,
  LayerSwitch,
} from '@/components/atlas/types';
import { DEFAULT_LAYERS } from './appReducer';

/**
 * The viewer's Layers choices, kept in their browser so the globe looks the
 * way they left it. Never in the URL: a shared link or a lesson's deep link
 * opens the same stop for everyone, whatever layers they keep.
 */
export const LAYERS_STORAGE_KEY = 'atlas-layers-v1';

const LAND_COLORS: readonly LandColor[] = ['music', 'continent', 'plain'];
const SWITCHES: readonly LayerSwitch[] = [
  'states',
  'cities',
  'artistPoints',
  'arcs',
];

/** The stored choices over the defaults; the defaults when nothing usable is stored. */
export function loadLayers(): GlobeLayers {
  try {
    const raw = window.localStorage.getItem(LAYERS_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYERS;
    const stored = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const layers = { ...DEFAULT_LAYERS };
    for (const key of SWITCHES) {
      if (typeof stored[key] === 'boolean') layers[key] = stored[key];
    }
    if (LAND_COLORS.includes(stored.landColor as LandColor)) {
      layers.landColor = stored.landColor as LandColor;
    } else if (stored.countryColors === false) {
      // Before 2026-10-29 the land was continent colours or plain: someone
      // who had turned the colours off keeps plain land.
      layers.landColor = 'plain';
    }
    return layers;
  } catch {
    // Private windows and blocked storage throw; every layer stays on.
    return DEFAULT_LAYERS;
  }
}

export function saveLayers(layers: GlobeLayers): void {
  try {
    window.localStorage.setItem(LAYERS_STORAGE_KEY, JSON.stringify(layers));
  } catch {
    /* storage unavailable: the choice lasts as long as the page */
  }
}
