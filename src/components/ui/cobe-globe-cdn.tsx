'use client';

import { useCallback, useEffect, useRef } from 'react';
import createGlobe from '@/lib/cobe';
import { buildCountryTexture } from './globe-country-texture';
import { locationToAngles, shortestTurn } from './globeMath';

export interface GlobeMarker {
  /**
   * Only needed for a marker that shows a label: cobe creates one positioned
   * DOM anchor per id and rewrites its inline styles every frame, so an id on a
   * silent dot is pure cost (see src/lib/cobe/index.js — `if (!e) continue`).
   */
  id?: string;
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
  /**
   * Stops the render loop (e.g. an inactive tab). The loop also stops on its own
   * while the canvas is scrolled offscreen, and resumes when visible again.
   */
  paused?: boolean;
  /**
   * Face `[lat, lng]`: the globe flies there (the shortest way round) and holds
   * it, auto-rotation stopped. `null` / omitted lets go: rotation resumes and
   * the tilt eases back. Dragging also lets go until `focus` changes.
   */
  focus?: [number, number] | null;
  /** When `focus` changes, start the flight from here instead of the current view. */
  focusFrom?: [number, number];
  /** Flight time in ms; 0 jumps. Defaults to 1000. */
  focusMs?: number;
}

/** A flight to a focus: view angles from → to over `ms` (from null = current view). */
interface Flight {
  from: [number, number] | null;
  to: [number, number];
  t0: number | null;
  ms: number;
  done: boolean;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
    ...(m.id ? { id: m.id } : {}),
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

// Built once and shared across mounts, but only from the first mount: at module
// scope this fired the 839 KB GeoJSON fetch plus a 2048x1024 raster the moment
// the chunk evaluated, even on pages where no globe ever rendered.
let countryTexturePromise: Promise<HTMLCanvasElement | null> | null = null;
const getCountryTexture = () => {
  countryTexturePromise ??= buildCountryTexture().catch(() => null);
  return countryTexturePromise;
};

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = '',
  speed = 0.003,
  arcAnimationMs = 3500,
  arcHeight = 0.28,
  onRotationComplete,
  paused = false,
  focus = null,
  focusFrom,
  focusMs = 1000,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  // Render loop also halts for the `paused` prop (e.g. an inactive tab).
  const pausedPropRef = useRef(paused);
  pausedPropRef.current = paused;
  const syncRunningRef = useRef<(() => void) | null>(null);

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

  // Focus: the current flight, extra tilt it adds, and whether a drag let go.
  const flightRef = useRef<Flight | null>(null);
  const thetaExtraRef = useRef(0);
  const focusReleasedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    // A drag takes over from a focus until the next one.
    if (flightRef.current) focusReleasedRef.current = true;
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
    let animationId: number | null = null;
    let phi = 0;
    let disposed = false;
    // The globe is usually below the fold on Home and the landing page, where
    // it used to keep running its full-canvas fragment shader forever.
    let onScreen = true;
    let running = false;
    let lastTs: number | null = null;
    let io: IntersectionObserver | null = null;
    let syncRunning: (() => void) | null = null;

    async function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globeRef.current) return;
      // Land dots take their colour from this per-country map (null → fallback).
      const mapTexture = (await getCountryTexture()) ?? undefined;
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
        // Advance by elapsed time, not per callback: a fixed step ran twice as
        // fast on a 120Hz display and stalled the featured-event cadence
        // whenever the browser throttled frames. `speed` stays in the same
        // units (radians per 60Hz frame) so callers need no change.
        const dt =
          lastTs === null ? 1 : Math.min(3, (t - lastTs) / (1000 / 60));
        lastTs = t;

        const flight = focusReleasedRef.current ? null : flightRef.current;
        if (flight) {
          // Fly to the focus and hold it: the view angles are eased, then
          // written back as `phi` / extra tilt so a later drag or release
          // carries on from here.
          flight.t0 ??= t;
          flight.from ??= [
            phi + phiOffsetRef.current,
            0.2 + thetaOffsetRef.current + thetaExtraRef.current,
          ];
          const p =
            flight.ms > 0 ? Math.min(1, (t - flight.t0) / flight.ms) : 1;
          const e = easeInOutCubic(p);
          const viewPhi =
            flight.from[0] + shortestTurn(flight.from[0], flight.to[0]) * e;
          const viewTheta =
            flight.from[1] + (flight.to[1] - flight.from[1]) * e;
          phi = viewPhi - phiOffsetRef.current;
          thetaExtraRef.current = viewTheta - 0.2 - thetaOffsetRef.current;
          if (p >= 1) flight.done = true;
        } else {
          // No focus: the tilt eases back to the default.
          thetaExtraRef.current *= Math.pow(0.92, dt);
          // Auto-rotate unless the user is dragging the globe.
          if (!isPausedRef.current) {
            const step = speedRef.current * dt;
            phi += step;
            rotationAccumRef.current += step;
            if (rotationAccumRef.current >= TWO_PI) {
              rotationAccumRef.current -= TWO_PI;
              onRotationCompleteRef.current?.();
            }
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
          theta:
            0.2 +
            thetaOffsetRef.current +
            thetaExtraRef.current +
            dragOffset.current.theta,
          ...(arcsUpdate ? { arcs: arcsUpdate } : {}),
        });
        // Guarded: a frame already queued when stop() ran would otherwise
        // re-arm the loop and defeat the pause.
        animationId = running ? requestAnimationFrame(animate) : null;
      }
      setTimeout(() => canvas && (canvas.style.opacity = '1'));

      function start() {
        if (running || disposed) return;
        running = true;
        lastTs = null; // don't integrate the gap we spent paused
        // Same reason: an arc grow-in interrupted by the pause would otherwise
        // measure against a stale timestamp and snap straight to finished.
        if (arcAnimatingRef.current) arcAnimStartRef.current = null;
        // …and a flight cut short restarts its clock from where it was aimed.
        if (flightRef.current && !flightRef.current.done)
          flightRef.current.t0 = null;
        animationId = requestAnimationFrame(animate);
      }

      function stop() {
        running = false;
        if (animationId !== null) cancelAnimationFrame(animationId);
        animationId = null;
      }

      syncRunning = () => {
        if (onScreen && !document.hidden && !pausedPropRef.current) start();
        else stop();
      };
      syncRunningRef.current = syncRunning;
      syncRunning();

      io = new IntersectionObserver(([entry]) => {
        onScreen = !!entry?.isIntersecting;
        syncRunning?.();
      });
      io.observe(canvas);
      document.addEventListener('visibilitychange', syncRunning);
    }

    // Kept for the component's lifetime: the drawing buffer is sized once at
    // creation, so without this a layout change left the canvas CSS-stretched.
    let lastWidth = 0;
    const ro = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width === 0) return;
      if (!globeRef.current) {
        void init();
        return;
      }
      if (width !== lastWidth) {
        lastWidth = width;
        globeRef.current.update({ width, height: width });
      }
    });
    ro.observe(canvas);
    if (canvas.offsetWidth > 0) {
      lastWidth = Math.round(canvas.offsetWidth);
      void init();
    }

    return () => {
      disposed = true;
      ro.disconnect();
      io?.disconnect();
      syncRunningRef.current = null;
      if (syncRunning) {
        document.removeEventListener('visibilitychange', syncRunning);
      }
      if (animationId !== null) cancelAnimationFrame(animationId);
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    syncRunningRef.current?.();
  }, [paused]);

  // A new focus arms a flight (from `focusFrom`, else from the current view);
  // no focus lets go.
  const [focusLat, focusLng] = focus ?? [];
  const [fromLat, fromLng] = focusFrom ?? [];
  useEffect(() => {
    focusReleasedRef.current = false;
    if (focusLat === undefined || focusLng === undefined) {
      flightRef.current = null;
      return;
    }
    flightRef.current = {
      from:
        fromLat === undefined || fromLng === undefined
          ? null
          : locationToAngles(fromLat, fromLng),
      to: locationToAngles(focusLat, focusLng),
      t0: null,
      ms: focusMs,
      done: false,
    };
  }, [focusLat, focusLng, fromLat, fromLng, focusMs]);

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
        .filter((m) => m.label && m.id)
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
