import { getCountryColor } from '@/components/atlas/data/continentColors';
import { GEOJSON_URLS } from '@/components/atlas/data/menuItems';

/**
 * Builds a colored equirectangular world-map texture where each country is
 * filled with its `getCountryColor` colour (alpha = land mask, ocean stays
 * transparent). Fed to the patched cobe (`mapTexture`) so the globe's land dots
 * render the same per-country palette as the main Atlas globe.
 *
 * Reuses the same Natural Earth GeoJSON + ISO→colour logic as `BaseGlobe`.
 */

// 2048×1024 = power-of-two (required for WebGL1 REPEAT wrap), equirectangular.
const TEX_W = 2048;
const TEX_H = 1024;

// Antarctica / Greenland render white on the main globe.
const ICE = new Set(['ATA', 'GRL']);

type Ring = [number, number][];
interface Feature {
  properties?: Record<string, unknown> | null;
  geometry?: { type: string; coordinates: unknown } | null;
}

/** Same precedence as BaseGlobe.resolveIso (ISO_A3 → ISO_A3_EH → ADM0_A3). */
function resolveIso(props: Record<string, unknown> | null | undefined): string {
  const p = props ?? {};
  const a3 = (p.ISO_A3 ?? p.iso_a3 ?? '') as string;
  if (a3 !== '-99') return a3;
  const eh = p.ISO_A3_EH as string | undefined;
  return eh && eh !== '-99' ? eh : ((p.ADM0_A3 as string) ?? '');
}

const projectX = (lng: number) => ((lng + 180) / 360) * TEX_W;
const projectY = (lat: number) => ((90 - lat) / 180) * TEX_H;

/** Trace one ring, breaking the path where longitude wraps the antimeridian. */
function traceRing(ctx: CanvasRenderingContext2D, ring: Ring): void {
  let prevX = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const x = projectX(lng);
    const y = projectY(lat);
    if (i === 0 || Math.abs(x - prevX) > TEX_W / 2) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    prevX = x;
  }
}

function drawFeature(ctx: CanvasRenderingContext2D, feat: Feature): void {
  const geom = feat.geometry;
  if (!geom) return;
  const iso = resolveIso(feat.properties);
  ctx.fillStyle = ICE.has(iso) ? '#ffffff' : getCountryColor(iso);

  const polygons: Ring[][] =
    geom.type === 'Polygon'
      ? [geom.coordinates as Ring[]]
      : geom.type === 'MultiPolygon'
        ? (geom.coordinates as Ring[][])
        : [];

  ctx.beginPath();
  for (const poly of polygons) for (const ring of poly) traceRing(ctx, ring);
  ctx.fill('evenodd'); // evenodd cuts holes (lakes) correctly
}

let cache: Promise<HTMLCanvasElement> | null = null;

export function buildCountryTexture(): Promise<HTMLCanvasElement> {
  if (cache) return cache;
  cache = (async () => {
    const res = await fetch(GEOJSON_URLS.countries);
    if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
    const data = (await res.json()) as { features?: Feature[] };

    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.clearRect(0, 0, TEX_W, TEX_H); // transparent ocean

    for (const feat of data.features ?? []) drawFeature(ctx, feat);
    return canvas;
  })();
  // Allow a later mount to retry if this attempt failed.
  cache.catch(() => {
    cache = null;
  });
  return cache;
}
