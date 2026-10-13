import { Suspense, lazy } from 'react';
import { GlobeStatus } from './GlobeStatus';

/**
 * The Globe page's map, drawn by one of two engines (docs/globe-ui/ENGINE.md):
 *
 * - `maplibre` (the default): MapLibre GL's globe over a Protomaps vector
 *   basemap, from the whole planet down to street level;
 * - `three`: the earlier three.js globe (react-globe.gl), kept so the switch
 *   can be rolled back with `VITE_ATLAS_ENGINE=three` and a rebuild.
 *
 * The flag is read at build time, so a build carries only its engine's
 * import, and either engine loads lazily: neither three.js nor MapLibre is
 * in the route's static imports (scripts/verifyProdBundle.mjs checks).
 */
export type GlobeEngine = 'maplibre' | 'three';

export const GLOBE_ENGINE: GlobeEngine =
  import.meta.env.VITE_ATLAS_ENGINE === 'three' ? 'three' : 'maplibre';

const Engine =
  GLOBE_ENGINE === 'three'
    ? lazy(() => import('./BaseGlobe').then((m) => ({ default: m.BaseGlobe })))
    : lazy(() => import('./MapLibreGlobe'));

export function AtlasGlobe() {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 bg-atlas-canvas">
          <GlobeStatus />
        </div>
      }
    >
      <Engine />
    </Suspense>
  );
}
