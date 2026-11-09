import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { isTimelineView } from '@/components/atlas/navigation/atlasFrame';
import {
  useAtlasFrame,
  useAtlasNavigate,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';

/** A turn of the globe every this many seconds. */
const TURN_SECONDS = 24;

/**
 * The small turning globe in the timeline's bottom-left corner, after
 * Dorot's: press it to see the same years on the map. Drawn with the cobe
 * globe the landing page uses, loaded when the button first shows; it stands
 * still under reduced motion and while the tab is hidden.
 */
export function GlobeCornerButton() {
  const timeline = useAtlasFrame(isTimelineView);
  const navigate = useAtlasNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!timeline) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let globe: {
      update: (s: { phi: number }) => void;
      destroy: () => void;
    } | null = null;
    // Opening on Europe and Africa.
    let phi = 5;
    let last: number | null = null;

    void import('@/lib/cobe').then(({ default: createGlobe }) => {
      if (disposed || canvas.offsetWidth === 0) return;
      const width = canvas.offsetWidth;
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi,
        theta: 0.25,
        // The landing globe's lighting (components/ui/cobe-globe-cdn.tsx),
        // with brighter land: a light globe on the dark page, like Dorot's.
        dark: 1,
        diffuse: 1.2,
        mapSamples: 9000,
        mapBrightness: 6,
        baseColor: [0.8, 0.8, 0.85],
        markerColor: [1, 1, 1],
        glowColor: [0.25, 0.25, 0.3],
        markers: [],
        scale: 1,
      });
      // cobe decodes its map after the first frame, so it is drawn every
      // frame; under reduced motion it stands still, drawn for a moment.
      const started = performance.now();
      const tick = (now: number) => {
        if (reducedMotion && now - started > 2000) return;
        raf = requestAnimationFrame(tick);
        if (document.hidden) {
          last = null;
          return;
        }
        const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!reducedMotion) phi += (dt * Math.PI * 2) / TURN_SECONDS;
        globe?.update({ phi });
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      globe?.destroy();
    };
  }, [timeline, reducedMotion]);

  if (!timeline) return null;
  return (
    <button
      aria-label="See these years on the globe"
      className={cn(
        ATLAS_Z.bars,
        'group absolute bottom-12 left-4 flex size-14 items-center justify-center rounded-full border border-white/10 bg-atlas-panel/80 shadow-2xl transition-[scale,border-color] duration-200 [transition-timing-function:var(--ease-out)] hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95',
      )}
      title="See these years on the globe"
      type="button"
      onClick={() => navigate.setFrame({ view: 'map' })}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="size-12 transition-[scale] duration-200 [transition-timing-function:var(--ease-out)] group-hover:scale-105"
      />
    </button>
  );
}
