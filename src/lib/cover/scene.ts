import { buildMesh } from './mesh';
import { buildMotif } from './motif';
import { buildNoodles } from './noodles';
import { buildRings } from './rings';
import { buildSubdivide } from './subdivide';
import { buildTruchet } from './truchet';
import type { CoverDetail, CoverScene, CoverSpec } from './types';

// ── A cover's scene, built once ────────────────────────────────────────────
// Pure in its spec and detail, so scenes are kept (the last 240) and a card
// that scrolls back into view, or a page that comes back, draws at once.

const CACHE_SIZE = 240;
const cache = new Map<string, CoverScene>();

function build(spec: CoverSpec, detail: CoverDetail): CoverScene {
  switch (spec.family) {
    case 'truchet':
      return buildTruchet(spec, detail);
    case 'mesh':
      return buildMesh(spec);
    case 'motif':
      return buildMotif(spec);
    case 'rings':
      return buildRings(spec);
    case 'noodles':
      return buildNoodles(spec);
    case 'subdivide':
      return buildSubdivide(spec, detail);
  }
}

export function buildCover(
  spec: CoverSpec,
  detail: CoverDetail = 'card',
): CoverScene {
  const key = `${detail}|${JSON.stringify(spec)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const scene = build(spec, detail);
  cache.set(key, scene);
  if (cache.size > CACHE_SIZE) {
    cache.delete(cache.keys().next().value as string);
  }
  return scene;
}

/** Tests only. */
export const clearCoverCache = () => cache.clear();
