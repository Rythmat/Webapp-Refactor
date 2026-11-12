import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getCountryColor } from '@/components/atlas/data/continentColors';
import { ERA_HEX } from '@/components/atlas/data/musicalEras';
import {
  edgeWidth,
  haloRadius,
  ROOTS_RAMP,
  ROUTES_RAMP,
} from '@/components/atlas/theme/marks';
import { cn } from '@/components/utilities';
import { KEY_RAINBOW_COLORS } from '../../../rainbow';
import { COUNTRY_PATHS, STATE_BOXES, STATE_PATHS } from './globeArt.generated';
import {
  eraCounts,
  PLACES,
  placeById,
  type GlobeLink,
  type GlobePlace,
  type GlobeStory,
} from './globeData';
import { GLOBE_VIEW, project } from './orthographic';

/**
 * The Globe's look, copied from today's Globe (`components/atlas`: map style,
 * `placeLayers`, `networkLayers`, `liftLayers`, `GlobeRim`) — values only. The
 * colour helpers it imports are plain data with no imports of their own.
 */
const MAP = {
  ground: '#000005',
  ocean: '#090b11',
  landAlpha: 0.55,
  border: 'rgba(255, 255, 255, 0.16)',
  /** Antarctica and Greenland, as ice. */
  ice: new Set(['ATA', 'GRL']),
  dotRim: 'rgba(9, 11, 17, 0.85)',
  wall: '#10121a',
  glow: '#343848',
} as const;

/** The busiest place: halos scale by events against it (log). */
const MAX_EVENTS = Math.max(...PLACES.map((p) => p.events));
/** The selected place's lid rises this far (screen px) once flown in. */
const LIFT_PX = 22;
const WALLS = 7;
const EASE = [0.45, 0, 0.25, 1] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Box {
  w: number;
  h: number;
}

/** Board → screen: screen = (ax, ay) + s · board. */
interface Camera {
  s: number;
  ax: number;
  ay: number;
}

/**
 * The camera `t` of the way from the whole globe (0) to the story's place
 * (1): the disc fills 97% of the short side, and flying in scales up
 * `zoom`× (exponentially, so it feels like a flight) while the place slides
 * to `focusAt`.
 */
const cameraAt = (
  t: number,
  box: Box,
  focus: { x: number; y: number } | null,
  zoom: number,
  focusAt: readonly [number, number],
): Camera => {
  const s0 = (0.97 * Math.min(box.w, box.h)) / (2 * GLOBE_VIEW.r);
  const half = GLOBE_VIEW.size / 2;
  const world = { s: s0, ax: box.w / 2 - s0 * half, ay: box.h / 2 - s0 * half };
  if (!focus || t <= 0) return world;
  const s = s0 * zoom ** t;
  const s1 = s0 * zoom;
  return {
    s,
    ax: lerp(world.ax, focusAt[0] * box.w - s1 * focus.x, t),
    ay: lerp(world.ay, focusAt[1] * box.h - s1 * focus.y, t),
  };
};

const PROJECTED = PLACES.map((p) => ({
  ...p,
  ...project(p.lat, p.lng),
})).filter((p) => p.visible);

/** One place: its era halo and white dot, kept screen-sized as the map zooms. */
const PlaceMark = ({
  place,
  cam,
  selected,
  target,
}: {
  place: GlobePlace & { x: number; y: number };
  cam: MotionValue<Camera & { t: number }>;
  selected: boolean;
  target?: string;
}) => {
  const x = useTransform(cam, (c) => c.ax + c.s * place.x);
  const y = useTransform(cam, (c) => c.ay + c.s * place.y);
  const level = Math.log1p(place.events) / Math.log1p(MAX_EVENTS);
  const halo = useTransform(
    cam,
    (c) => haloRadius(level) * lerp(0.9, 1.25, c.t),
  );
  return (
    <motion.g style={{ x, y }}>
      <motion.circle
        r={halo}
        fill={ERA_HEX[place.era]}
        opacity={0.42}
        style={{ filter: 'blur(1.5px)' }}
      />
      <circle
        r={selected ? 3.5 : 2.4}
        fill="#ffffff"
        stroke={MAP.dotRim}
        strokeWidth={1}
        data-tour-target={target}
      />
    </motion.g>
  );
};

/** The key colours' rim round the globe's edge (`GlobeRim`), fading on the way in. */
const Rim = ({ cam }: { cam: MotionValue<Camera & { t: number }> }) => {
  const r = GLOBE_VIEW.r;
  const c = GLOBE_VIEW.size / 2;
  const left = useTransform(cam, (v) => v.ax + v.s * (c - r));
  const top = useTransform(cam, (v) => v.ay + v.s * (c - r));
  const size = useTransform(cam, (v) => v.s * 2 * r);
  const opacity = useTransform(cam, (v) => 1 - clamp01(v.t * 2.5));
  const ring = (inner: number, outer: number) =>
    `radial-gradient(closest-side, transparent calc(100% - ${inner}px), #000 calc(100% - ${outer}px), #000 100%, transparent 100%)`;
  const conic = `conic-gradient(${KEY_RAINBOW_COLORS.join(', ')}, ${KEY_RAINBOW_COLORS[0]})`;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left, top, width: size, height: size, opacity }}
    >
      {[
        { pad: 1, band: [1.6, 0.4], o: 0.9, blur: 0 },
        { pad: 3, band: [5, 1], o: 0.2, blur: 3 },
        { pad: 7, band: [10, 2], o: 0.08, blur: 6 },
      ].map(({ pad, band, o, blur }) => (
        <span
          key={pad}
          className="absolute rounded-full"
          style={{
            inset: -pad,
            background: conic,
            opacity: o,
            filter: blur ? `blur(${blur}px)` : undefined,
            mask: ring(band[0] + pad, band[1] + pad - 1),
            WebkitMask: ring(band[0] + pad, band[1] + pad - 1),
          }}
        />
      ))}
    </motion.div>
  );
};

/** A link between two screen points, bowed upward like the Globe's arcs. */
const linkPath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // The normal that points up the screen.
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) [nx, ny] = [-nx, -ny];
  const bow = Math.min(120, len * 0.22);
  return `M${a.x} ${a.y}Q${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`;
};

/**
 * The story's links (`networkLayers`): in from where its music came from
 * (the cool ramp, into white) and out to where it went (white into the warm
 * ramp), as wide as their counts; a single influence is the dotted flowing
 * line. Drawn at the flown-in camera, once it has landed.
 */
const Links = ({
  sun,
  story,
  cam,
  still,
  paused,
}: {
  sun: { x: number; y: number };
  story: GlobeStory;
  cam: Camera;
  still: boolean;
  paused: boolean;
}) => {
  const id = useId().replace(/:/g, '');
  const at = (p: GlobePlace) => {
    const { x, y, visible } = project(p.lat, p.lng);
    return visible ? { x: cam.ax + cam.s * x, y: cam.ay + cam.s * y } : null;
  };
  const ends = (links: readonly GlobeLink[], dir: 'in' | 'out') =>
    links.flatMap((l) => {
      const p = placeById(l.place);
      const other = p && at(p);
      return other ? [{ ...l, dir, other }] : [];
    });
  const all = [...ends(story.cameFrom, 'in'), ...ends(story.wentTo, 'out')];
  return (
    <g>
      {all.map((l, i) => {
        const [from, to] = l.dir === 'in' ? [l.other, sun] : [sun, l.other];
        const ramp = l.dir === 'in' ? ROOTS_RAMP : ROUTES_RAMP;
        const w = edgeWidth(l.n);
        const d = linkPath(from, to);
        const grad = `${id}-${i}`;
        const delay = still ? 0 : i * 0.08;
        return (
          <g key={`${l.dir}:${l.place}`}>
            <defs>
              <linearGradient
                id={grad}
                gradientUnits="userSpaceOnUse"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              >
                {ramp.map((c, j) => (
                  <stop key={j} offset={j / (ramp.length - 1)} stopColor={c} />
                ))}
              </linearGradient>
            </defs>
            {l.n > 1 ? (
              <>
                <motion.path
                  d={d}
                  fill="none"
                  stroke={`url(#${grad})`}
                  strokeWidth={w * 3}
                  strokeLinecap="round"
                  opacity={0.28}
                  style={{ filter: 'blur(3px)' }}
                  initial={still ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay, ease: EASE }}
                />
                <motion.path
                  d={d}
                  fill="none"
                  stroke={`url(#${grad})`}
                  strokeWidth={w}
                  strokeLinecap="round"
                  initial={still ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay, ease: EASE }}
                />
              </>
            ) : (
              <motion.path
                d={d}
                fill="none"
                stroke={`url(#${grad})`}
                strokeWidth={w}
                strokeLinecap="round"
                strokeDasharray={`0.01 ${w * 2.2}`}
                initial={still ? false : { opacity: 0 }}
                animate={
                  still || paused
                    ? { opacity: 0.85 }
                    : { opacity: 0.85, strokeDashoffset: [0, -w * 2.2 * 8] }
                }
                transition={{
                  opacity: { duration: 0.4, delay },
                  strokeDashoffset: {
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

/** The selected place: a warm bloom, a white core and its ring (`SunFx`). */
const Sun = ({ x, y, still }: { x: number; y: number; still: boolean }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={28} fill="url(#ma-globe-sun)" />
    <motion.circle
      r={9}
      fill="none"
      stroke="rgba(255, 255, 255, 0.6)"
      strokeWidth={2}
      initial={still ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    />
    <circle r={5} fill="#ffffff" />
  </g>
);

/**
 * The selected region, lifted (`liftLayers`): its walls stacked under a lid
 * filled with its events' eras, oldest to newest, a bright edge with a comet
 * running round it, and a soft glow on the ground. Drawn on the art board
 * inside the map's transform; `lift` is the board-unit rise.
 */
const LiftedRegion = ({
  story,
  lift,
  still,
  paused,
}: {
  story: GlobeStory;
  lift: number;
  still: boolean;
  paused: boolean;
}) => {
  const id = useId().replace(/:/g, '');
  const d = STATE_PATHS[story.lift];
  const [x0, , x1] = STATE_BOXES[story.lift];
  const counts = eraCounts(story.years);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  // Each era at the middle of its share, blending into the next.
  let acc = 0;
  const stops = counts.map(([era, c]) => {
    const mid = (acc + c / 2) / total;
    acc += c;
    return { offset: mid, color: ERA_HEX[era] };
  });
  // Each layer rises from the ground as the region lifts.
  const rise = (f: number) =>
    ({
      initial: still ? false : { y: 0 },
      animate: { y: -lift * f },
      transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
    }) as const;
  return (
    <g>
      <defs>
        <linearGradient
          id={`${id}-lid`}
          gradientUnits="userSpaceOnUse"
          x1={x0}
          x2={x1}
          y1={0}
          y2={0}
        >
          {stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.5} />
        </filter>
      </defs>
      <path d={d} fill={MAP.glow} opacity={0.8} filter={`url(#${id}-glow)`} />
      {Array.from({ length: WALLS }, (_, i) => (
        <motion.path key={i} d={d} fill={MAP.wall} {...rise(i / WALLS)} />
      ))}
      <motion.g {...rise(1)}>
        <path d={d} fill={`url(#${id}-lid)`} opacity={0.9} />
        <path
          d={d}
          fill="none"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {!still && (
          <motion.path
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="7 93"
            animate={paused ? undefined : { strokeDashoffset: [0, -100] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.g>
    </g>
  );
};

/** The container's size, kept current. */
const useBox = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
};

/**
 * A miniature of the Globe's data map, drawn as SVG from art generated once
 * (`globeArt.generated.ts`): the dark ground and its dot grid, the globe with
 * its continent-coloured land and rainbow rim, every place's era halo and
 * dot. Given a story it flies to the place, lifts its state and lights the
 * sun there; with `links` it draws where the place's music came from and
 * went. `still` (reduced motion) jumps to each state; `paused` stops the
 * looping comet and flow while off screen.
 */
export const MiniGlobe = ({
  story,
  focused,
  links,
  still,
  paused = false,
  zoom = 5,
  focusAt = [0.5, 0.5],
  flightMs = 1200,
  placeTarget,
  sunTarget,
  className,
  children,
}: {
  story: GlobeStory | null;
  focused: boolean;
  links: boolean;
  still: boolean;
  paused?: boolean;
  zoom?: number;
  /** Where the flown-to place sits in the box (fractions of its size). */
  focusAt?: readonly [number, number];
  flightMs?: number;
  /** `data-tour-target` on the story place's dot (before the flight). */
  placeTarget?: string;
  /** `data-tour-target` on the sun (after it). */
  sunTarget?: string;
  className?: string;
  /** Cards and rails over the map. */
  children?: React.ReactNode;
}) => {
  const [ref, box] = useBox();
  const place = story ? placeById(story.place) : undefined;
  const focus = place ? project(place.lat, place.lng) : null;

  // The flight: 0 = whole globe, 1 = at the story's place.
  const t = useMotionValue(focused ? 1 : 0);
  const [landed, setLanded] = useState(focused);
  useEffect(() => {
    const to = focused ? 1 : 0;
    if (still || !focused) {
      t.set(to);
      setLanded(focused);
      return;
    }
    setLanded(false);
    const run = animate(t, to, {
      duration: flightMs / 1000,
      ease: EASE,
      onComplete: () => setLanded(true),
    });
    return () => run.stop();
  }, [focused, still, flightMs]);

  // The camera reads the latest size and focus; bumping `rev` re-reads them
  // without a flight (a resize, another story).
  const params = useRef({ box, focus, zoom, focusAt });
  params.current = { box, focus, zoom, focusAt };
  const rev = useMotionValue(0);
  useLayoutEffect(() => {
    rev.set(rev.get() + 1);
  }, [box.w, box.h, focus?.x, focus?.y, zoom, focusAt[0], focusAt[1]]);
  const cam = useTransform([t, rev], ([v]: number[]) => {
    const p = params.current;
    return { ...cameraAt(v, p.box, p.focus, p.zoom, p.focusAt), t: v };
  });
  // The map moves by its SVG `transform` attribute: framer-motion would
  // give a styled <g> a centred transform-origin, which a matrix must not have.
  const mapRef = useRef<SVGGElement>(null);
  const toMatrix = (c: Camera) => `matrix(${c.s} 0 0 ${c.s} ${c.ax} ${c.ay})`;
  useMotionValueEvent(cam, 'change', (c) =>
    mapRef.current?.setAttribute('transform', toMatrix(c)),
  );

  const final = cameraAt(1, box, focus, zoom, focusAt);
  const lifted = Boolean(story && landed);
  const liftBoard = LIFT_PX / final.s;
  const sun =
    focus && lifted
      ? {
          x: final.ax + final.s * focus.x,
          y: final.ay + final.s * focus.y - LIFT_PX,
        }
      : null;

  return (
    <div
      ref={ref}
      className={cn('relative size-full overflow-hidden', className)}
      style={{
        background: MAP.ground,
        backgroundImage:
          'radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1.4px)',
        backgroundSize: '22px 22px',
      }}
    >
      {box.w > 0 && (
        <>
          <svg
            aria-hidden
            data-tour-target="globe"
            width={box.w}
            height={box.h}
            className="absolute inset-0"
          >
            <defs>
              <radialGradient id="ma-globe-sun">
                <stop offset="0" stopColor="rgba(255, 236, 214, 0.38)" />
                <stop offset="1" stopColor="rgba(255, 236, 214, 0)" />
              </radialGradient>
            </defs>
            <g ref={mapRef} transform={toMatrix(cam.get())}>
              <circle
                cx={GLOBE_VIEW.size / 2}
                cy={GLOBE_VIEW.size / 2}
                r={GLOBE_VIEW.r}
                fill={MAP.ocean}
                stroke="rgba(201, 210, 255, 0.14)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <g
                style={{
                  opacity: lifted ? 0.5 : 1,
                  transition: still ? undefined : 'opacity 500ms',
                }}
              >
                {COUNTRY_PATHS.map(([iso, d]) => (
                  <path
                    key={iso}
                    d={d}
                    fill={MAP.ice.has(iso) ? '#ffffff' : getCountryColor(iso)}
                    fillOpacity={MAP.landAlpha}
                    stroke={MAP.border}
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              {story && lifted && (
                <LiftedRegion
                  story={story}
                  lift={liftBoard}
                  still={still}
                  paused={paused}
                />
              )}
            </g>
            {PROJECTED.map((p) =>
              lifted && p.id === story?.place ? null : (
                <PlaceMark
                  key={p.id}
                  place={p}
                  cam={cam}
                  selected={p.id === story?.place}
                  target={p.id === story?.place ? placeTarget : undefined}
                />
              ),
            )}
            {story && sun && links && (
              <Links
                sun={sun}
                story={story}
                cam={final}
                still={still}
                paused={paused}
              />
            )}
            {sun && <Sun x={sun.x} y={sun.y} still={still} />}
          </svg>
          {sun && sunTarget && (
            <span
              data-tour-target={sunTarget}
              className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: sun.x, top: sun.y }}
            />
          )}
          <Rim cam={cam} />
        </>
      )}
      {/* The vignette (`.atlas-map-ground`). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgb(0 0 5 / 0.9) 100%)',
        }}
      />
      {children}
    </div>
  );
};
