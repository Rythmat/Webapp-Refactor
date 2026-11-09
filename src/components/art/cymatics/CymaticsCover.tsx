// ── CymaticsCover ──────────────────────────────────────────────────────────
// A Chladni figure drawn exactly (the GPU: cymaticsRenderer), morphing from
// one of its plate's resonances to the next (owner, 2026-10-28: "clean
// cymatic images … morph between different cymatic oscillations"). Its
// colour is CSS (`color`, var()s allowed, so it eases with the page's
// glow). Without WebGL (old browsers, tests) it is the SVG figure instead.

import { useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ArtCover } from '@/components/art/ArtCover';
import { cn } from '@/components/utilities';
import { cymaticSequence, type ChladniMode } from '@/lib/art';
import {
  canDrawCymatics,
  renderer,
  type CymaticTarget,
} from './cymaticsRenderer';

export interface CymaticsCoverProps {
  /** The figure's own mode: it starts and settles here. */
  mode: ChladniMode;
  /**
   * The figures it morphs through, its own first (a page that keeps every
   * card's figures apart hands them out: allocateFigures). Left out, its
   * mode and three near resonances.
   */
  modes?: readonly ChladniMode[];
  /** The line's colour (CSS; a var() eases with it). */
  color: string;
  layout?: 'plate' | 'banner';
  /** Line width, CSS pixels. */
  lineWidth?: number;
  /** Seconds into its sequence it starts. */
  phase?: number;
  /** For the SVG fallback's seed. */
  seed: string;
  className?: string;
  style?: CSSProperties;
}

export function CymaticsCover({
  mode,
  modes: given,
  color,
  layout = 'plate',
  lineWidth = 2,
  phase = 0,
  seed,
  className,
  style,
}: CymaticsCoverProps) {
  const reduce = useReducedMotion() ?? false;
  const [gpu] = useState(canDrawCymatics);
  const ref = useRef<HTMLCanvasElement>(null);
  const givenKey = given?.map((g) => `${g.n},${g.m},${g.sign}`).join('|');
  const modes = useMemo(
    () => (given?.length ? given : cymaticSequence(mode)),
    // The modes' fields stand for them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [givenKey, mode.n, mode.m, mode.sign],
  );
  const shown = modes[0] ?? mode;

  useEffect(() => {
    const canvas = ref.current;
    const r = gpu ? renderer() : null;
    if (!canvas || !r) return;
    const target: CymaticTarget = {
      canvas,
      modes,
      layout,
      lineWidth,
      phase,
      still: reduce,
      visible: false,
    };
    // Its pixels match its box at the screen's density.
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      r.request();
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(canvas);
    // Drawn only while on screen (or nearly).
    const seen = new IntersectionObserver(
      ([entry]) => {
        target.visible = entry.isIntersecting;
        if (target.visible) r.request();
      },
      { rootMargin: '120px' },
    );
    seen.observe(canvas);
    r.add(target);
    return () => {
      resize.disconnect();
      seen.disconnect();
      r.remove(target);
    };
  }, [gpu, modes, layout, lineWidth, phase, reduce]);

  if (!gpu) {
    return (
      <ArtCover
        seed={seed}
        kind="chladni"
        mode={shown}
        colors={[color]}
        density={layout === 'banner' ? 'hero' : 'tile'}
        aspect={layout === 'banner' ? 2.6 : 1}
        fade="none"
        className={className}
      />
    );
  }
  return (
    <canvas
      ref={ref}
      aria-hidden
      data-cymatics={modes.map((m) => `${m.n},${m.m},${m.sign}`).join(' ')}
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        className,
      )}
      style={{ ...style, color }}
    />
  );
}
