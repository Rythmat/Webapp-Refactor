import { Suspense, lazy } from 'react';
import { GlobeStatus } from './GlobeStatus';
import { GLOBE_ENGINE } from './engine';

/**
 * The Globe page's map, drawn by the engine the build chose (engine.ts).
 * The flag is read at build time and either engine loads lazily: neither
 * three.js nor MapLibre is in the route's static imports
 * (scripts/verifyProdBundle.mjs checks).
 */
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
