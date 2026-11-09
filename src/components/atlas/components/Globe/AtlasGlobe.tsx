import { Suspense, lazy } from 'react';
import { GlobeStatus } from './GlobeStatus';

/**
 * The Globe page's map: MapLibre GL's globe (docs/globe-ui/ENGINE.md),
 * loaded lazily, so MapLibre is never in the route's static imports
 * (scripts/verifyProdBundle.mjs checks).
 */
const Engine = lazy(() => import('./MapLibreGlobe'));

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
