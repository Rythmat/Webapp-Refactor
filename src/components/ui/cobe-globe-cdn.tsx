'use client';

import { useCallback, useEffect, useRef } from 'react';
import createGlobe from '@/lib/cobe';
import { buildCountryTexture } from './globe-country-texture';

export interface GlobeMarker {
  id: string;
  location: [number, number];
  /** Shown as a floating pill only when non-empty. */
  label: string;
  /** Per-marker RGB in 0–1 range. Falls back to the global markerColor. */
  color?: [number, number, number];
  /** Dot size (cobe units). Defaults to 0.03. */
  size?: number;
}

export interface GlobeArc {
  /** Optional; omit to skip cobe's per-arc DOM anchor. */
  id?: string;
  from: [number, number];
  to: [number, number];
  /** Per-arc RGB in 0–1 range. Falls back to the global arcColor. */
  color?: [number, number, number];
}

interface GlobeCdnProps {
  markers?: GlobeMarker[];
  arcs?: GlobeArc[];
  className?: string;
  speed?: number;
  /** Time (ms) for arcs to grow from origin to destination when they change. */
  arcAnimationMs?: number;
  /** Global arc altitude. Raise it so long, far-reaching arcs clear the globe. */
  arcHeight?: number;
  /** Fires once each time the globe completes a full auto-rotation (2π). */
  onRotationComplete?: () => void;
}

const defaultMarkers: GlobeMarker[] = [
  { id: 'globe-nola', location: [29.9511, -90.0715], label: 'New Orleans' },
  { id: 'globe-london', location: [51.5074, -0.1278], label: 'London' },
];

const defaultArcs: GlobeArc[] = [
  { from: [29.9511, -90.0715], to: [51.5074, -0.1278] },
];

/** Map our marker/arc props to cobe's expected shapes. */
const toCobeMarkers = (markers: GlobeMarker[]) =>
  markers.map((m) => ({
    location: m.location,
    size: m.size ?? 0.03,
    id: m.id,
    ...(m.color ? { color: m.color } : {}),
  }));

const toCobeArcs = (arcs: GlobeArc[]) =>
  arcs.map((a) => ({
    from: a.from,
    to: a.to,
    ...(a.id ? { id: a.id } : {}),
    ...(a.color ? { color: a.color } : {}),
  }));

const TWO_PI = Math.PI * 2;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const lerpPoint = (
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Build the colored country map once (shared across mounts). Resolves to null
// on failure, so the globe falls back to the default single-colour land.
const countryTexturePromise = buildCountryTexture().catch(() => null);

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = '',
  speed = 0.003,
  arcAnimationMs = 3500,
  arcHeight = 0.28,
  onRotationComplete,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  // Latest mapped data + tunables, read by the (deferred) init and rAF loop.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const durationRef = useRef(arcAnimationMs);
  durationRef.current = arcAnimationMs;
  const arcHeightRef = useRef(arcHeight);
  arcHeightRef.current = arcHeight;
  const onRotationCompleteRef = useRef(onRotationComplete);
  onRotationCompleteRef.current = onRotationComplete;
  const markersRef = useRef(toCobeMarkers(markers));
  const targetArcsRef = useRef(toCobeArcs(arcs));

  // Arc grow-in animation state.
  const arcAnimStartRef = useRef<number | null>(null);
  const arcAnimatingRef = useRef(true);
  // Accumulated auto-rotation (radians) since the last completed turn.
  const rotationAccumRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  // Create the globe ONCE. Arcs are drawn by the rAF loop (grow-in animation),
  // so the globe starts with none and the animation reveals them.
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let animationId: number;
    let phi = 0;
    let disposed = false;

    async function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globeRef.current) return;
      // Land dots take their colour from this per-country map (null → fallback).
      const mapTexture = (await countryTexturePromise) ?? undefined;
      if (disposed || globeRef.current || canvas.offsetWidth === 0) return;

      // Dark-theme palette — echoes the Atlas globe's warm, low-key base while
      // the bright per-marker / per-arc country colours carry the accent.
      globeRef.current = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        // Zoom the globe out within the canvas so tall, far-reaching arcs have
        // headroom. The canvas itself bleeds past its layout box (see
        // GlobeSection) to give those arcs room without shrinking the globe.
        scale: 0.9,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        // Colored map needs a low brightness so country colours read true;
        // the fallback solid land wants the original brighter value.
        mapBrightness: mapTexture ? 1.4 : 5,
        baseColor: [0.3, 0.28, 0.24],
        markerColor: [1, 0.75, 0.35],
        glowColor: [0.12, 0.1, 0.08],
        markerElevation: 0.01,
        mapTexture,
        markers: markersRef.current,
        arcs: [],
        arcColor: [1, 0.85, 0.55],
        arcWidth: 0.4,
        arcHeight: arcHeightRef.current,
      });

      function animate(t: number) {
        // Auto-rotate unless the user is dragging the globe.
        if (!isPausedRef.current) {
          phi += speedRef.current;
          rotationAccumRef.current += speedRef.current;
          if (rotationAccumRef.current >= TWO_PI) {
            rotationAccumRef.current -= TWO_PI;
            onRotationCompleteRef.current?.();
          }
        }

        // Grow arcs from origin toward destination over durationRef.current.
        let arcsUpdate: ReturnType<typeof toCobeArcs> | undefined;
        if (arcAnimatingRef.current) {
          if (arcAnimStartRef.current == null) arcAnimStartRef.current = t;
          const d = durationRef.current;
          const p = d > 0 ? Math.min(1, (t - arcAnimStartRef.current) / d) : 1;
          const e = easeOutCubic(p);
          arcsUpdate = targetArcsRef.current.map((a) => ({
            ...a,
            to: lerpPoint(a.from, a.to, e),
          }));
          if (p >= 1) arcAnimatingRef.current = false;
        }

        globeRef.current!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
          ...(arcsUpdate ? { arcs: arcsUpdate } : {}),
        });
        animationId = requestAnimationFrame(animate);
      }
      animationId = requestAnimationFrame(animate);
      setTimeout(() => canvas && (canvas.style.opacity = '1'));
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      disposed = true;
      if (animationId) cancelAnimationFrame(animationId);
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, []);

  // On data change: markers + arc altitude update immediately; arcs restart
  // their grow-in (which re-uploads them, baking in the new arcHeight).
  useEffect(() => {
    markersRef.current = toCobeMarkers(markers);
    targetArcsRef.current = toCobeArcs(arcs);
    arcAnimStartRef.current = null;
    arcAnimatingRef.current = true;
    globeRef.current?.update({ markers: markersRef.current, arcHeight });
  }, [markers, arcs, arcHeight]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          touchAction: 'none',
        }}
      />
      {markers
        .filter((m) => m.label)
        .map((m) => (
          <div
            key={m.id}
            style={{
              position: 'absolute',
              // @ts-expect-error CSS Anchor Positioning (cobe exposes --cobe-<id>)
              positionAnchor: `--cobe-${m.id}`,
              bottom: 'anchor(top)',
              left: 'anchor(center)',
              translate: '-50% 0',
              pointerEvents: 'none',
              opacity: `var(--cobe-visible-${m.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
              transition: 'opacity 0.3s, filter 0.3s',
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.55rem',
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
              }}
            >
              {m.label}
            </span>
          </div>
        ))}
    </div>
  );
}
