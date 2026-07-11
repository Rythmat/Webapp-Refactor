import { useEffect, useMemo, useRef, useState } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import type { MeshLambertMaterial } from 'three';
import {
  ATMOSPHERE,
  createOceanMaterial,
  makePolygonMaterialAccessors,
} from '@/components/atlas/components/Globe/globeVisuals';
import { useGeoData, useGlobeLighting } from '@/components/atlas/hooks';

// ── Framing (tune against the reference image) ────────────────────────────
// The globe renders in an oversized SQUARE canvas that is offset downward so
// only the Northern-Hemisphere cap shows, cropped by the hero card. The three
// knobs to tune are VIEW_ALTITUDE (sphere size), VIEW_LAT (which latitudes face
// us) and LIMB_FROM_TOP (where the top limb/atmosphere sits). The vertical
// offset is DERIVED from react-globe.gl's actual camera (radius 100, distance
// 100·(1+altitude), default 50° FOV), so the limb lands at LIMB_FROM_TOP·height
// regardless of the hero's size.
const OVERSIZE_H = 2.6; // globe square ≈ this × the hero height (so we see a big cap)
const MAX_CANVAS = 2000; // perf clamp on canvas pixels
const VIEW_LAT = 25; // Northern-Hemisphere framing
const VIEW_ALTITUDE = 1.8; // camera distance (smaller = bigger sphere)
const LIMB_FROM_TOP = 0.1; // top limb/atmosphere sits ~10% down the hero
const ROTATE_SPEED = 0.35;
const CAMERA_FOV_DEG = 50; // react-globe.gl's PerspectiveCamera default

// Projected globe radius as a fraction of the square canvas at VIEW_ALTITUDE.
const GLOBE_RADIUS_FRAC =
  (0.5 * Math.tan(Math.asin(1 / (1 + VIEW_ALTITUDE)))) /
  Math.tan((CAMERA_FOV_DEG * Math.PI) / 360);

// react-globe.gl types `controls()` loosely; these are the OrbitControls fields
// we set to keep the globe spinning but non-interactive.
interface HeroControls {
  enabled: boolean;
  enableZoom: boolean;
  enableRotate: boolean;
  enablePan: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  className?: string;
}

/**
 * Decorative, non-interactive globe for the Globe dashboard hero. Reuses the
 * app globe's ocean/country materials, atmosphere and lighting (via
 * globeVisuals), but drops all interactivity, hexes, arcs and AppContext — it
 * auto-rotates and is rendered oversized in a square canvas offset downward so
 * only the Northern-Hemisphere cap shows, cropped by the hero's rounded card.
 */
export function HeroGlobe({ className }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [GlobeModule, setGlobeModule] = useState<
    typeof import('react-globe.gl').default | null
  >(null);
  const [globeReady, setGlobeReady] = useState(false);
  const { countries, loading, error } = useGeoData();

  // Day/night lighting (camera-attached warm "sun" + ambient)
  useGlobeLighting(globeRef);

  // Ocean material + country polygon materials — same look as BaseGlobe.
  const globeMaterial = useMemo(() => createOceanMaterial(), []);
  const capCache = useRef(new Map<string, MeshLambertMaterial>());
  const sideCache = useRef(new Map<string, MeshLambertMaterial>());
  const { polygonCapMaterial, polygonSideMaterial } = useMemo(
    () => makePolygonMaterialAccessors(capCache.current, sideCache.current),
    [],
  );

  // Dispose GL materials on unmount so tab switches don't leak memory.
  useEffect(() => {
    const caps = capCache.current;
    const sides = sideCache.current;
    return () => {
      caps.forEach((m) => m.dispose());
      sides.forEach((m) => m.dispose());
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lazy-load react-globe.gl (heavy; keeps it off the dashboard's critical path)
  useEffect(() => {
    let cancelled = false;
    import('react-globe.gl')
      .then((mod) => {
        if (!cancelled) setGlobeModule(() => mod.default);
      })
      .catch(() => {
        /* leave the hero on its dark background if the globe can't load */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pause the render loop while the hero is scrolled out of view.
  useEffect(() => {
    const el = containerRef.current;
    const globe = globeRef.current as
      | (GlobeMethods & {
          pauseAnimation: () => void;
          resumeAnimation: () => void;
        })
      | undefined;
    if (!globeReady || !el || !globe) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [globeReady]);

  const handleReady = () => {
    const globe = globeRef.current;
    if (!globe) return;
    // Clamp devicePixelRatio — the oversized square is expensive on Retina.
    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    // Spin, but no user interaction. NB: keep controls.enabled = true — react-
    // globe.gl only ticks controls.update() (which drives autoRotate) while
    // enabled; disabling it would freeze the spin.
    const controls = globe.controls() as unknown as HeroControls;
    controls.enabled = true;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.autoRotate = !prefersReducedMotion();
    controls.autoRotateSpeed = ROTATE_SPEED;
    // Frame the Northern Hemisphere once, instantly (a tween would fight autoRotate).
    globe.pointOfView({ lat: VIEW_LAT, lng: 0, altitude: VIEW_ALTITUDE }, 0);
    setGlobeReady(true);
  };

  const Globe = GlobeModule;
  const { width: W, height: H } = size;
  const ready = Globe && !loading && !error && W > 0 && H > 0;

  // Oversized square canvas, centred horizontally and offset downward so only
  // the top cap (limb + Northern Hemisphere) shows through the hero card. It is
  // ~OVERSIZE_H × the hero height, but never narrower than the hero width, so
  // the globe always bleeds off the left/right edges (space shows only at top).
  // Rounded to a 20px step so minor layout jitter doesn't re-init the renderer.
  const S = Math.min(
    MAX_CANVAS,
    Math.max(20, W, Math.round((H * OVERSIZE_H) / 20) * 20),
  );
  const left = Math.round((W - S) / 2);
  // Place the globe centre so its top limb lands at LIMB_FROM_TOP·H.
  const top = Math.round(LIMB_FROM_TOP * H + GLOBE_RADIUS_FRAC * S - S / 2);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: 'hidden', background: '#05060a' }}
    >
      {ready && (
        <div style={{ position: 'absolute', width: S, height: S, left, top }}>
          <Globe
            ref={globeRef}
            width={S}
            height={S}
            animateIn={false}
            backgroundColor="rgba(0,0,0,0)"
            enablePointerInteraction={false}
            globeImageUrl=""
            globeMaterial={globeMaterial}
            showAtmosphere
            atmosphereColor={ATMOSPHERE.color}
            atmosphereAltitude={ATMOSPHERE.altitude}
            polygonsData={countries?.features ?? []}
            polygonGeoJsonGeometry="geometry"
            polygonAltitude={0.008}
            polygonCapMaterial={polygonCapMaterial}
            polygonSideMaterial={polygonSideMaterial}
            polygonStrokeColor="rgba(90, 78, 58, 0.85)"
            onGlobeReady={handleReady}
          />
        </div>
      )}
    </div>
  );
}
