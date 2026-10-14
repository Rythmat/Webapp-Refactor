import { memo, useId, useLayoutEffect, useRef } from 'react';
import { easeInOut, easeOut } from '@/components/atlas/theme/motion';
import { RIVER } from '@/components/atlas/theme/river';
import {
  laneAt,
  lanePaths,
  mix,
  type FanLayout,
  type LaneGeometry,
} from './placeLayout';

/** Where a lane is drawn this frame. */
interface Drawn {
  stops: number[];
  thickness: number;
  /** How far its run has grown: 0 hidden, 1 to the right edge. */
  reveal: number;
}

interface LaneNodes {
  fan: SVGPathElement | null;
  run: SVGPathElement | null;
  strand: SVGPathElement | null;
  dots: (SVGCircleElement | null)[];
}

/** The fan's dots per lane, at most: events from before the years shown. */
const FAN_DOTS = 5;

/**
 * A run: flat where it leaves the fan, round at its growing end — Dorot's
 * bands grow in with a round head.
 */
function runPath(x: number, y: number, width: number, thickness: number) {
  if (width <= 0) return '';
  const r = Math.min(thickness / 2, width / 2);
  const top = y - thickness / 2;
  const bottom = y + thickness / 2;
  const end = x + width;
  return `M${x},${top}L${end - r},${top}A${r},${r} 0 0 1 ${end - r},${bottom}L${x},${bottom}Z`;
}

/** The lane a new lane was split from, or one that merged, if drawn. */
function startOf(
  lane: LaneGeometry,
  ancestors: ReadonlyMap<string, readonly string[]>,
  drawn: ReadonlyMap<string, Drawn>,
): Drawn | null {
  const own = drawn.get(lane.id);
  if (own) return own;
  // Split: start as the place it came out of.
  for (const a of [...(ancestors.get(lane.id) ?? [])].reverse()) {
    const parent = drawn.get(a);
    if (parent) return parent;
  }
  // Merged: start where the lanes it gathers were, between them.
  const parts = [...drawn].filter(([id]) =>
    (ancestors.get(id) ?? []).includes(lane.id),
  );
  if (!parts.length) return null;
  const ys = parts.map(([, d]) => d.stops[d.stops.length - 1]);
  const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
  return {
    stops: [lane.stops[0], mid, mid, mid],
    thickness: parts[0][1].thickness,
    reveal: Math.min(...parts.map(([, d]) => d.reveal)),
  };
}

/**
 * The place river's water, Dorot's way: thick bands fanning from one bright
 * source at the left, each shading from its parent's colour into its own at
 * its split and blending with its siblings where they still overlap, then
 * running straight to the right edge in its own two colours. Along the fan,
 * faint dots stand for the lane's events from before the years shown — the
 * earlier history the source gathers up.
 *
 * Moves are animated straight on the DOM: a lane splitting grows its parts
 * out of it, a merge gathers them back, and the bands grow in from the
 * left with round ends when the timeline opens — and draw back when it
 * closes for the globe.
 */
export const PlaceBands = memo(function PlaceBands({
  layout,
  ancestors,
  plotLeft,
  plotRight,
  right,
  top,
  earlier,
  active,
  reducedMotion,
}: {
  layout: FanLayout;
  /** Each lane's ancestors, continent first. */
  ancestors: ReadonlyMap<string, readonly string[]>;
  /** Where the years run: each band's colours span them. */
  plotLeft: number;
  plotRight: number;
  /** Where the runs end: past the right edge, so their round ends hide. */
  right: number;
  top: number;
  /** Each lane's events from before the years shown. */
  earlier: ReadonlyMap<string, number>;
  /** Shown (grown in) or not (drawn back). */
  active: boolean;
  reducedMotion: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const nodes = useRef(new Map<string, LaneNodes>());
  const drawn = useRef(new Map<string, Drawn>());
  const raf = useRef(0);
  const share = RIVER.sourceShare;
  const earlierRef = useRef(earlier);
  earlierRef.current = earlier;

  const node = (id: string): LaneNodes => {
    let n = nodes.current.get(id);
    if (!n) {
      n = { fan: null, run: null, strand: null, dots: [] };
      nodes.current.set(id, n);
    }
    return n;
  };

  const paint = (lane: LaneGeometry, d: Drawn) => {
    const n = nodes.current.get(lane.id);
    if (!n) return;
    const paths = lanePaths(
      { stops: d.stops, depth: lane.depth, thickness: d.thickness },
      layout.stages,
      share,
      right,
    );
    const end = layout.stages[lane.depth];
    const y = d.stops[d.stops.length - 1];
    const runWidth = Math.max(0, d.reveal * (right - end + d.thickness));
    n.fan?.setAttribute('d', paths.fan);
    n.fan?.setAttribute('opacity', String(Math.min(1, d.reveal * 4)));
    n.strand?.setAttribute('d', paths.strand);
    n.strand?.setAttribute('opacity', String(d.reveal));
    // The run starts a pixel inside the fan, so no seam shows between them.
    n.run?.setAttribute('d', runPath(end - 1, y, runWidth, d.thickness));
    // The earlier events, spread along the fan from the source outward.
    const count = earlierRef.current.get(lane.id) ?? 0;
    const shown = Math.min(FAN_DOTS, count);
    n.dots.forEach((dot, i) => {
      if (!dot) return;
      if (i >= shown) {
        dot.setAttribute('r', '0');
        return;
      }
      const x = end * (0.18 + (0.7 * (i + 1)) / (shown + 1));
      const at = laneAt(
        d.stops,
        layout.stages,
        lane.depth,
        d.thickness,
        share,
        x,
      );
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(at.y));
      dot.setAttribute(
        'r',
        String(Math.min(6, 1.8 + Math.log2(1 + count / shown)) * d.reveal),
      );
    });
    drawn.current.set(lane.id, d);
  };

  // Split, merge, resize, grow in, draw back: one tween from what is drawn
  // to the layout, each lane's reveal staggered top to bottom.
  useLayoutEffect(() => {
    cancelAnimationFrame(raf.current);
    const lanes = layout.lanes;
    const from = new Map<string, Drawn>();
    for (const lane of lanes) {
      const start = startOf(lane, ancestors, drawn.current);
      from.set(
        lane.id,
        start ?? {
          stops: [layout.sourceY, ...lane.stops.slice(1)],
          thickness: lane.thickness,
          reveal: 0,
        },
      );
    }
    // Lanes no longer drawn are forgotten.
    for (const id of [...drawn.current.keys()]) {
      if (!lanes.some((l) => l.id === id)) drawn.current.delete(id);
    }
    const target = (lane: LaneGeometry): Drawn => ({
      stops: lane.stops,
      thickness: lane.thickness,
      reveal: active ? 1 : 0,
    });
    // Growing in or drawing back is an entrance or an exit (ease-out,
    // staggered top to bottom, back the way it came); a split or a merge is
    // a change of shape on screen (ease-in-out).
    const growing = lanes.some(
      (l) => (from.get(l.id)?.reveal ?? 0) !== (active ? 1 : 0),
    );
    const duration = reducedMotion
      ? 0
      : growing
        ? active
          ? RIVER.growMs
          : RIVER.drawBackMs
        : RIVER.splitMs;
    const stagger = reducedMotion || !growing ? 0 : active ? 60 : 30;
    const ease = growing ? easeOut : easeInOut;
    const order = active ? lanes : [...lanes].reverse();
    const t0 = performance.now();
    const step = (now: number) => {
      let running = false;
      order.forEach((lane, i) => {
        const a = from.get(lane.id)!;
        const b = target(lane);
        const local = duration
          ? Math.min(1, Math.max(0, (now - t0 - i * stagger) / duration))
          : 1;
        if (local < 1) running = true;
        const k = ease(local);
        paint(lane, {
          stops: mix(a.stops, b.stops, k),
          thickness: a.thickness + (b.thickness - a.thickness) * k,
          reveal: a.reveal + (b.reveal - a.reveal) * k,
        });
      });
      if (running) raf.current = requestAnimationFrame(step);
    };
    step(t0);
    return () => cancelAnimationFrame(raf.current);
    // `paint` reads the layout it was made with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, active, right, reducedMotion]);

  // New counts of earlier events redraw the dots where the lanes are.
  useLayoutEffect(() => {
    for (const lane of layout.lanes) {
      const d = drawn.current.get(lane.id);
      if (d) paint(lane, d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earlier]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset={0} stopColor="white" stopOpacity={0.85} />
          <stop offset={0.35} stopColor="white" stopOpacity={0.25} />
          <stop offset={1} stopColor="white" stopOpacity={0} />
        </radialGradient>
        {layout.lanes.map((lane, i) => (
          <linearGradient
            key={`fan-${lane.id}`}
            gradientUnits="userSpaceOnUse"
            id={`${uid}-fan-${i}`}
            x1={layout.stages[lane.depth - 1]}
            x2={layout.stages[lane.depth]}
            y1={0}
            y2={0}
          >
            <stop offset={0} stopColor={lane.parentColor} />
            <stop offset={1} stopColor={lane.color} />
          </linearGradient>
        ))}
        {layout.lanes.map((lane, i) => (
          <linearGradient
            key={`run-${lane.id}`}
            gradientUnits="userSpaceOnUse"
            id={`${uid}-run-${i}`}
            x1={plotLeft}
            x2={plotRight}
            y1={0}
            y2={0}
          >
            <stop offset={0} stopColor={lane.color} />
            <stop offset={1} stopColor={lane.colorEnd} />
          </linearGradient>
        ))}
      </defs>
      <g transform={`translate(0 ${top})`}>
        {layout.lanes.map((lane, i) => (
          <g key={lane.id} style={{ mixBlendMode: 'screen' }}>
            <path
              ref={(el) => {
                node(lane.id).fan = el;
              }}
              fill={`url(#${uid}-fan-${i})`}
              fillOpacity={RIVER.fanOpacity}
            />
            <path
              ref={(el) => {
                node(lane.id).run = el;
              }}
              fill={`url(#${uid}-run-${i})`}
              fillOpacity={RIVER.bandOpacity}
            />
          </g>
        ))}
        {layout.lanes.map((lane) => (
          <path
            key={lane.id}
            ref={(el) => {
              node(lane.id).strand = el;
            }}
            fill="none"
            stroke="white"
            strokeOpacity={RIVER.strandAlpha}
            strokeWidth={1.25}
          />
        ))}
        {layout.lanes.map((lane) => (
          <g key={`dots-${lane.id}`} fill="white" fillOpacity={0.55}>
            {Array.from({ length: FAN_DOTS }, (_, i) => (
              <circle
                key={i}
                ref={(el) => {
                  node(lane.id).dots[i] = el;
                }}
                r={0}
              />
            ))}
          </g>
        ))}
        {/* The source, where every lane begins: a soft glow. */}
        <circle
          cx={0}
          cy={layout.sourceY}
          fill={`url(#${uid}-glow)`}
          opacity={active ? 1 : 0}
          r={RIVER.sourceGlow}
          style={{ transition: 'opacity 400ms var(--ease-out)' }}
        />
      </g>
    </svg>
  );
});
