import type { Feature } from 'geojson';
import { MeshPhongMaterial, MeshLambertMaterial, DoubleSide } from 'three';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { ICE_COUNTRIES, landColor, resolveIso } from './globeLayers';

// Shared visual building blocks for the globe (ocean material, country-polygon
// materials, atmosphere), kept apart from BaseGlobe so they stay pure. Materials are per-instance and disposed by their owner — these
// are factories/pure functions, never shared singletons.

// Atmosphere halo settings.
export const ATMOSPHERE = {
  color: ATLAS_SCENE.atmosphere,
  altitude: 0.18,
} as const;

// Re-exported for the geo tests, which import them from here.
export { ICE_COUNTRIES, resolveIso };

// Ocean material — matte black so continents float on a dark sphere. One
// instance per globe; the caller owns disposal.
export function createOceanMaterial(): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: 0x000000,
    emissive: 0x33d6ff,
    specular: 0x000000,
    shininess: 0,
  });
}

/**
 * Build the polygon cap/side material accessors, bound to caller-owned caches
 * (keyed by colour) so materials aren't recreated every render. The caller is
 * responsible for disposing the cached materials on unmount.
 *
 * With `countryColors` off (the Layers control) every polygon takes the one
 * plain land colour.
 */
export function makePolygonMaterialAccessors(
  capCache: Map<string, MeshLambertMaterial>,
  sideCache: Map<string, MeshLambertMaterial>,
  countryColors = true,
) {
  // Polygon cap materials — light-responsive for day/night shading
  const polygonCapMaterial = (polygon: object): MeshLambertMaterial => {
    const feat = polygon as Feature;
    let colorHex: string;
    if (feat.properties?._layer === 'state') {
      const parentIso = feat.properties?.iso_a2 === 'CA' ? 'CAN' : 'USA';
      colorHex = landColor(parentIso, countryColors);
    } else {
      const iso = resolveIso(feat);
      colorHex =
        countryColors && ICE_COUNTRIES.has(iso)
          ? '#ffffff'
          : landColor(iso, countryColors);
    }
    let mat = capCache.get(colorHex);
    if (!mat) {
      mat = new MeshLambertMaterial({
        color: colorHex,
        emissive: 0x1a1410,
        transparent: true,
        opacity: 0.86,
        side: DoubleSide,
        depthWrite: true,
      });
      capCache.set(colorHex, mat);
    }
    return mat;
  };

  // Polygon side materials
  const polygonSideMaterial = (polygon: object): MeshLambertMaterial => {
    const feat = polygon as Feature;
    let colorHex: string;
    if (feat.properties?._layer === 'state') {
      const parentIso = feat.properties?.iso_a2 === 'CA' ? 'CAN' : 'USA';
      colorHex = landColor(parentIso, countryColors);
    } else {
      const iso = resolveIso(feat);
      colorHex =
        countryColors && ICE_COUNTRIES.has(iso)
          ? '#dcdcdc'
          : landColor(iso, countryColors);
    }
    const key = colorHex + '_s';
    let mat = sideCache.get(key);
    if (!mat) {
      mat = new MeshLambertMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide,
        depthWrite: true,
      });
      sideCache.set(key, mat);
    }
    return mat;
  };

  return { polygonCapMaterial, polygonSideMaterial };
}
