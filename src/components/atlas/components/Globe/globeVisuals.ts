import type { Feature } from 'geojson';
import { MeshPhongMaterial, MeshLambertMaterial, DoubleSide } from 'three';
import { getCountryColor } from '@/components/atlas/data/continentColors';

// Shared visual building blocks for the globe (ocean material, country-polygon
// materials, atmosphere) so BaseGlobe and the decorative HeroGlobe render the
// same planet. Materials are per-instance and disposed by their owner — these
// are factories/pure functions, never shared singletons.

export const ICE_COUNTRIES = new Set(['ATA', 'GRL']);

// Atmosphere halo settings used by both globes.
export const ATMOSPHERE = { color: '#ffffff', altitude: 0.18 } as const;

// Natural Earth uses -99 for some countries (France, Norway, disputed territories).
// Prefer ISO_A3_EH, then ADM0_A3, then ISO_A3.
export function resolveIso(feat: Feature): string {
  const p = feat.properties;
  const a3 = p?.ISO_A3 ?? p?.iso_a3 ?? '';
  if (a3 !== '-99') return a3;
  return p?.ISO_A3_EH !== '-99' && p?.ISO_A3_EH
    ? p.ISO_A3_EH
    : (p?.ADM0_A3 ?? '');
}

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
 */
export function makePolygonMaterialAccessors(
  capCache: Map<string, MeshLambertMaterial>,
  sideCache: Map<string, MeshLambertMaterial>,
) {
  // Polygon cap materials — light-responsive for day/night shading
  const polygonCapMaterial = (polygon: object): MeshLambertMaterial => {
    const feat = polygon as Feature;
    let colorHex: string;
    if (feat.properties?._layer === 'state') {
      const parentIso = feat.properties?.iso_a2 === 'CA' ? 'CAN' : 'USA';
      colorHex = getCountryColor(parentIso);
    } else {
      const iso = resolveIso(feat);
      colorHex = ICE_COUNTRIES.has(iso) ? '#ffffff' : getCountryColor(iso);
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
      colorHex = getCountryColor(parentIso);
    } else {
      const iso = resolveIso(feat);
      colorHex = ICE_COUNTRIES.has(iso) ? '#dcdcdc' : getCountryColor(iso);
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
