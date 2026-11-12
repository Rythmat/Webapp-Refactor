import { echoRandom } from '@/curriculum/engine/echo/random';
import { shade } from './color';
import type { CoverScene, CoverSpec } from './types';

// ── A genre's colour field (Suno Explore's "Best Of" tiles) ────────────────
// Soft blobs of the genre's two colours melting into each other, drawn as
// layered CSS radial gradients (no filters, so forty of them stay cheap).
// The blobs sit where the genre's groove hits round its bar, as a rhythm
// necklace would place them: a backbeat and a clave make different fields.

const pct = (v: number) => `${Math.round(v * 10) / 10}%`;

export function buildMesh(
  spec: Extract<CoverSpec, { family: 'mesh' }>,
): CoverScene {
  const rng = echoRandom(`cover:mesh:${spec.seed}`);
  const [a, b] = spec.colors;
  const tones = [
    a,
    b,
    shade(a, 0.1),
    shade(b, -0.12),
    shade(b, 0.08),
    shade(a, -0.18),
  ];
  // Minimal: the bar's first few hits only, so the field stays calm.
  const hits = spec.groove.hits.slice(0, 4);
  const layers = hits.map((hit, i) => {
    // Round the bar from the top, as a drummer counts it.
    const angle = (hit / spec.groove.steps) * Math.PI * 2 - Math.PI / 2;
    const reach = 22 + rng() * 16;
    const x = 50 + Math.cos(angle) * reach;
    const y = 50 + Math.sin(angle) * reach;
    const size = 48 + rng() * 18;
    return `radial-gradient(circle at ${pct(x)} ${pct(y)}, ${tones[i % tones.length]} 0%, transparent ${pct(size)})`;
  });
  // Never a mix of the two: far-apart keys (Reggae's red and green) would
  // meet in mud. Each blob is one key's colour, lighter or darker.
  const base = shade(a, -0.2);
  return {
    kind: 'mesh',
    base,
    layers,
    bytes: layers.join(',').length,
  };
}
