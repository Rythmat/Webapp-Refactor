import { useReducedMotion } from 'framer-motion';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';
import {
  createRenderer,
  DEPTH_BINS,
  END_S,
  LOGO,
  MORPH_S,
  sleepProgress,
  VIEW,
  wakeProgress,
  weightScale,
  type Curve,
} from './lissajous';
import { useInView } from './useInView';

type Rgb = readonly [number, number, number];

const INK: Rgb = [255, 255, 255];
/** The landing surface. The halos and depth shading assume a flat #101012 behind the mark. */
const BG: Rgb = [0x10, 0x10, 0x12];
const BG_HEX = '#101012';

/** Logo.tsx's line (about 6 of its 129 units) in this 64-unit box. */
const LOGO_WEIGHT = (VIEW * 6) / 129;
const LIVE_WEIGHT = 1.45;
/** Dark margin cut either side of a strand where it crosses one well behind it. */
const GAP = 0.45;
/**
 * A halo cuts only strands at least this many bins behind its own, so it never
 * notches the neighbouring stretch of the same strand.
 */
const HALO_SKIP = 3;
/** Caps a frame's step so a hidden tab or an offscreen pause never jumps. */
const MAX_DT_S = 0.1;

const BINS = Array.from({ length: DEPTH_BINS }, (_, b) => b);
const hasHalo = (b: number) => b >= 1 && b <= DEPTH_BINS - HALO_SKIP;
const depthOf = (b: number) => (b + 0.5) / DEPTH_BINS;
const lumOf = (b: number) => 0.3 + 0.7 * depthOf(b) ** 1.2;
const widthOf = (b: number) => 0.85 + 0.3 * depthOf(b);
const round2 = (v: number) => String(Math.round(v * 100) / 100);

/** Opaque mix from the page color to white, so strands never double-brighten where they overlap. */
const ink = (l: number) =>
  `rgb(${BG.map((c, i) => Math.round(c + (INK[i] - c) * l)).join(',')})`;

type MarkProps = {
  className?: string;
  /** The curve to show. A change takes effect with the next `cue`. */
  curve?: Curve;
  /**
   * Each new value moves the mark from the curve it rests on to `curve`. A cue
   * that arrives mid-move is dropped.
   */
  cue?: number;
  /** Called when the pointer comes onto the mark while it rests. */
  onHover?: () => void;
  /**
   * Called as each move lands on its new curve, or `landLead` seconds before,
   * so a caller's own transition can finish exactly as the curve lands.
   */
  onLand?: () => void;
  landLead?: number;
  /** Called whenever the mark is at rest: after each move, and on mount. */
  onRest?: () => void;
};

/**
 * The live mark: one inline SVG whose paths a single rAF loop rewrites. At rest
 * it draws its curve in the logo's solid white line. While it moves, the curve
 * splits into depth bins painted back to front, shaded darker and thinner
 * toward the back. From md up, background-colored "halo" copies also cut a
 * small gap where a strand crosses one at least `HALO_SKIP` bins behind it, so
 * crossings read as over/under. (On phones the 3:4 strands sit too close for
 * gaps.) The loop runs only during a move, and only while the mark is on
 * screen.
 *
 * The svg's JSX props never change, so React never overwrites what the loop
 * writes. The move lives in a ref, so it survives StrictMode and offscreen
 * pauses.
 */
const LiveMark = ({
  className,
  curve = LOGO,
  cue = 0,
  onHover,
  onLand,
  landLead = 0,
  onRest,
}: MarkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  /** The first curve at rest, for the first paint. */
  const [restPaths] = useState(() => [
    ...createRenderer()(0, curve, curve).paths,
  ]);
  /** Seconds into the current move (at rest once past END_S), and its ends. */
  const move = useRef({ time: END_S, from: curve, to: curve, landed: true });
  /** Starts the loop if it is idle. Set only while the mark is on screen. */
  const kick = useRef<(() => void) | null>(null);
  const lastCue = useRef(cue);
  const latest = useRef({ curve, onHover, onLand, landLead, onRest });
  const inView = useInView(svgRef);

  useEffect(() => {
    latest.current = { curve, onHover, onLand, landLead, onRest };
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!inView || !svg) return;
    const bins = [...svg.querySelectorAll<SVGPathElement>('[data-bin]')];
    // Halo i shadows bin i + HALO_SKIP (see the JSX order).
    const halos = [...svg.querySelectorAll<SVGPathElement>('[data-halo]')];
    const render = createRenderer();
    const m = move.current;
    let last: number | null = null;
    let lastK = -1;
    let raf = 0;

    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_DT_S);
      last = now;
      m.time += dt;
      // How awake the mark looks: 0 is the solid white logo line.
      const k = wakeProgress(m.time) * (1 - sleepProgress(m.time));
      const { pose, paths } = render(m.time, m.from, m.to);
      const scale = weightScale(pose);
      bins.forEach((el, b) => {
        el.setAttribute('d', paths[b]);
        el.setAttribute(
          'stroke-width',
          round2(
            scale *
              (LOGO_WEIGHT + (LIVE_WEIGHT * widthOf(b) - LOGO_WEIGHT) * k),
          ),
        );
        if (k !== lastK) el.setAttribute('stroke', ink(1 - k * (1 - lumOf(b))));
      });
      halos.forEach((el, i) => {
        const b = i + HALO_SKIP;
        el.setAttribute('d', paths[b]);
        el.setAttribute(
          'stroke-width',
          round2(k * (scale * LIVE_WEIGHT * widthOf(b) + 2 * GAP)),
        );
      });
      // Colors only change while waking up or falling asleep.
      lastK = k;
      if (!m.landed && m.time >= MORPH_S - latest.current.landLead) {
        m.landed = true;
        latest.current.onLand?.();
      }
      if (m.time < END_S) {
        raf = requestAnimationFrame(tick);
      } else {
        // At rest on the new curve: stop until the next cue.
        raf = 0;
        latest.current.onRest?.();
      }
    };
    const start = () => {
      if (raf) return;
      last = null;
      raf = requestAnimationFrame(tick);
    };
    const onEnter = () => {
      if (m.time >= END_S) latest.current.onHover?.();
    };

    kick.current = start;
    svg.addEventListener('pointerenter', onEnter);
    if (m.time < END_S) start();
    else latest.current.onRest?.();
    return () => {
      cancelAnimationFrame(raf);
      kick.current = null;
      svg.removeEventListener('pointerenter', onEnter);
    };
  }, [inView]);

  // A new cue moves to the current curve, unless a move is under way.
  // Offscreen, it starts once the mark scrolls back into view.
  useEffect(() => {
    if (cue === lastCue.current) return;
    lastCue.current = cue;
    const m = move.current;
    if (m.time < END_S) return;
    m.from = m.to;
    m.to = latest.current.curve;
    m.time = 0;
    m.landed = false;
    kick.current?.();
  }, [cue]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn('size-8 overflow-visible', className)}
    >
      {BINS.map((b) => (
        <Fragment key={b}>
          {/* Bin b + HALO_SKIP − 1's halo: over bins < b, under bin b and up. */}
          {hasHalo(b) && (
            <path
              data-halo
              d={restPaths[b + HALO_SKIP - 1]}
              stroke={BG_HEX}
              strokeWidth={0}
              strokeLinecap="butt"
              className="hidden md:inline"
            />
          )}
          <path
            data-bin
            d={restPaths[b]}
            stroke={ink(1)}
            strokeWidth={round2(LOGO_WEIGHT)}
          />
        </Fragment>
      ))}
    </svg>
  );
};

/**
 * The hero's Music Atlas mark, alive. It rests on a Lissajous curve drawn like
 * the logo, and on each `cue` it turns about its horizontal axis while it
 * morphs into the next `curve` (see `lissajous.ts`), with the live depth
 * shading showing only during the move. It opens at rest on its first curve.
 *
 * Decorative (`aria-hidden`). Under reduced motion it is the static `Logo`, with
 * no animation loop.
 */
export const LissajousMark = (props: MarkProps) => {
  const reduce = useReducedMotion();
  return reduce ? (
    <Logo className={props.className} />
  ) : (
    <LiveMark {...props} />
  );
};
