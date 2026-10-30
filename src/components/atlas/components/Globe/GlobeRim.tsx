import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { globeDisc, rimOpacity } from './globeGeometry';

/**
 * The globe's rainbow rim, after the map-dashboard reference's globe and the
 * landing page's arc: a thin ring of the twelve key colours round the
 * globe's limb, with a soft bloom, turning as the globe turns. MapLibre's
 * own atmosphere can't take colour, so this is a 2-D canvas under the map's
 * (clear round the globe), redrawn as the camera moves; it fades as the
 * globe fills the view. `progress` (0–1) draws it on, for the intro.
 */
const RIM_GONE_AT_PITCH = 12;

export function GlobeRim({
  map,
  progress = 1,
}: {
  map: MapLibreMap;
  progress?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const center = map.getCenter();
      const pad = map.getPadding();
      const disc = globeDisc({
        width,
        height,
        padding: {
          top: pad.top ?? 0,
          right: pad.right ?? 0,
          bottom: pad.bottom ?? 0,
          left: pad.left ?? 0,
        },
        zoom: map.getZoom(),
        centerLat: center.lat,
        fovDeg: map.getVerticalFieldOfView(),
      });
      // Its circle assumes the globe seen straight on: gone when tilted.
      const alpha =
        rimOpacity(disc.r, width, height) *
        Math.max(0, 1 - map.getPitch() / RIM_GONE_AT_PITCH);
      const sweep = Math.max(0, Math.min(1, progressRef.current));
      if (alpha <= 0 || sweep <= 0) return;
      // The rainbow turns with the globe: its start follows the longitude.
      const start = (-center.lng * Math.PI) / 180 - Math.PI / 2;
      const gradient = ctx.createConicGradient(start, disc.cx, disc.cy);
      KEY_RAINBOW_COLORS.forEach((color, i) =>
        gradient.addColorStop(i / KEY_RAINBOW_COLORS.length, color),
      );
      gradient.addColorStop(1, KEY_RAINBOW_COLORS[0]);
      ctx.strokeStyle = gradient;
      const arc = (r: number, lineWidth: number, a: number) => {
        ctx.globalAlpha = a * alpha;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(disc.cx, disc.cy, r, start, start + sweep * Math.PI * 2);
        ctx.stroke();
      };
      // A soft bloom, then the line itself.
      arc(disc.r + 4, 9, 0.05);
      arc(disc.r + 2.5, 5, 0.09);
      arc(disc.r + 1.5, 2.5, 0.18);
      arc(disc.r + 0.75, 1.25, 0.9);
      ctx.globalAlpha = 1;
    };
    draw();
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    redraw.current = schedule;
    map.on('move', schedule);
    map.on('resize', schedule);
    return () => {
      map.off('move', schedule);
      map.off('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, [map]);

  // A new progress is drawn on the next frame (the intro steps it).
  useEffect(() => {
    redraw.current();
  }, [progress]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
