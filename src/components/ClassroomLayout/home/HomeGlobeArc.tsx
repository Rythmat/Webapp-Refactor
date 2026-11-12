import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import { useGlobePreview } from '@/components/ClassroomLayout/dashboard/GlobeSection';
import {
  GO_PILL,
  GO_PILL_ENABLED,
  RAINBOW_STOPS,
} from '@/components/promptBox/PromptBoxParts';
import {
  GlobeCdn,
  type GlobeArc,
  type GlobeMarker,
} from '@/components/ui/cobe-globe-cdn';
import { rgb } from '@/components/ui/globeMath';
import { cn } from '@/components/utilities';
import { GlobeRoutes } from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import '@/daw/components/Library/insight.css';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  HeroArcDefs,
  STREAK_REACH,
} from '@/features/landing/sections/heroArcParts';

// ── The rainbow reveal (owner, 2026-10-25) ────────────────────────────────
// Each new event is written in as the Studio's Insight writes its text
// (daw/components/Library/insight.css, shared so the two stay one rainbow):
// line by line, top to bottom, each line's text revealed behind the 12
// key-center colours and settling on its own colour; the icons and pills
// come in running through those colours.

/** The rainbow insight.css reads: the stops for text, a colour each for marks. */
const RAINBOW_VARS = {
  '--insight-rainbow': RAINBOW_STOPS,
  ...Object.fromEntries(KEY_RAINBOW_COLORS.map((c, i) => [`--rb-${i}`, c])),
} as CSSProperties;

/**
 * The flight paths' rainbow: each event's paths draw on quickly along their
 * routes, the same 12 colours running behind their heads (owner, 2026-10-25).
 */
const ARC_RAINBOW = KEY_RAINBOW_COLORS.map(rgb);
/** How long the paths take to arrive and the rainbow to run off them. */
const ARC_DRAW_MS = 1600;

/** Revealed text, settling on its own colour: white, /70, /55. */
const INK = 'insight-ink [--sweep-to:white]';
const INK_70 =
  'insight-ink [--sweep-to:color-mix(in_srgb,white_70%,transparent)]';
const INK_55 =
  'insight-ink [--sweep-to:color-mix(in_srgb,white_55%,transparent)]';

/** What the reveal runs through: text, icons, pills. */
const SWEPT = '.insight-ink, .insight-mark, .insight-pill';
/**
 * How long one line takes, and the wait between lines: about twice
 * Insight's (insight.css: 1.1s, 55ms), the event read in at a slower pace
 * (owner, 2026-10-25).
 */
const LINE_MS = 2200;
const STEP_MS = 150;

/** How much of the section shows before its first event comes on. */
const SEEN_THRESHOLD = 0.35;
/** Until then: the globe alone (stable, so it doesn't redraw its data). */
const NO_MARKERS: GlobeMarker[] = [];
const NO_ARCS: GlobeArc[] = [];

// ── The arc (owner, 2026-11-04) ───────────────────────────────────────────
// The old /atlas dashboard's title card (OpenGlobeHero, removed in 03f7f228)
// cropped a big globe so only its cap rose into the card. Here that cap is
// the landing hero's horizon (HeroArc): the same rainbow rim, bloom and
// light streaks, with the globe where the landing keeps a blank planet.

/** The crown (top of the sphere) sits this far down the frame. */
const CROWN_FROM_TOP = 0.2;
/**
 * The sphere's radius, as a share of the frame's width (or its height, if
 * that's bigger, on a narrow card): wide enough that the rim leaves through
 * the frame's sides near the bottom corners, as the landing's does.
 */
const RADIUS_OF_WIDTH = 0.62;
const RADIUS_OF_HEIGHT = 0.95;
/** cobe draws a sphere `0.4 × scale × canvas height` in radius. */
const COBE_RADIUS = 0.4;
/** Slower than the small globe's 0.003: a big face turning. */
const SPEED = 0.002;
/**
 * cobe draws arcs and dots in units that grow with the globe. Past these
 * radii (px) they stop growing, so the paths keep about the small globe's
 * weight rather than turning to ribbons.
 */
const ARC_FULL_R = 220;
const DOT_FULL_R = 280;

/** Flat light: the cap is all near-limb, which cobe's default leaves dim. */
const DIFFUSE = 0.25;
/** The big canvas's pixel ratio cap (its shader runs per pixel). */
const MAX_DPR = 1.25;

const DEG = Math.PI / 180;
/**
 * Only the cap shows, so the view tips toward the event's latitude: the
 * event rides this far above the view's centre, well inside the cap.
 */
const EVENT_ELEVATION = 55 * DEG;
const THETA_MIN = -65 * DEG;
const THETA_MAX = 20 * DEG;
const thetaFor = (lat: number) =>
  Math.min(THETA_MAX, Math.max(THETA_MIN, lat * DEG - EVENT_ELEVATION));

/**
 * Whether `ref`'s element has come on screen (SEEN_THRESHOLD of it), once:
 * it stays true after. True straight away without IntersectionObserver.
 */
function useSeen(ref: RefObject<HTMLElement>, ready: boolean): boolean {
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  useEffect(() => {
    const el = ref.current;
    if (seen || !ready || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: SEEN_THRESHOLD },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, ready, seen]);
  return seen;
}

/**
 * Plays the reveal over `ref`'s event each time `eventId` changes: each
 * line's turn top to bottom (left to right on a row), then, once the last
 * is in, the class comes off and the text is its own colours again. Before
 * paint, so no line shows before its turn. Never under reduced motion.
 */
function useEventReveal(
  ref: RefObject<HTMLElement>,
  eventId: string | undefined,
) {
  const reduce = !!useReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !eventId || reduce) return;
    const lines = [...el.querySelectorAll<HTMLElement>(SWEPT)]
      .map((line) => {
        const box = line.getBoundingClientRect();
        // Rows by their middles, so an icon shares its text's row.
        return {
          line,
          row: Math.round((box.top + box.bottom) / 2 / 8),
          x: box.left,
        };
      })
      .sort((a, b) => a.row - b.row || a.x - b.x);
    let last = 0;
    lines.forEach(({ line }, i) => {
      last = i * STEP_MS;
      line.style.animationDelay = `${last}ms`;
      line.style.animationDuration = `${LINE_MS}ms`;
    });
    el.classList.add('insight-sweep');
    const settle = () => {
      el.classList.remove('insight-sweep');
      lines.forEach(({ line }) => {
        line.style.animationDelay = '';
        line.style.animationDuration = '';
      });
    };
    const timer = window.setTimeout(settle, last + LINE_MS + 200);
    return () => {
      window.clearTimeout(timer);
      settle();
    };
  }, [ref, eventId, reduce]);
}

/**
 * With no card edge to stop on, the clipped streaks and bloom fade out at
 * the top (above the crown, which sits at CROWN_FROM_TOP) and at the sides.
 * The bottom needs none: the scrim ends on the page's colour.
 */
const EDGE_FADE: CSSProperties = {
  maskImage:
    'linear-gradient(to bottom, transparent, #000 16%), linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
  WebkitMaskImage:
    'linear-gradient(to bottom, transparent, #000 16%), linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
};

/** The dots at `k` of their size (GlobeCdn's default size is 0.03). */
const scaleDots = (markers: GlobeMarker[], k: number): GlobeMarker[] =>
  k === 1
    ? markers
    : markers.map((m) => ({ ...m, size: (m.size ?? 0.03) * k }));

/** `ref`'s element's size in CSS px, kept current. */
function useBoxSize(ref: RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const HomeGlobeArcInner = () => {
  const { event, markers, arcs, arcHeight, advance } = useGlobePreview();
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<HTMLDivElement>(null);
  // SVG ids from useId (":r1:") would break url(#…).
  const id = `home-arc-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  // The first event comes on as the section is scrolled to (owner,
  // 2026-10-25): until then the globe turns alone, the event's place kept
  // (invisible) so nothing moves, and it doesn't advance.
  const seen = useSeen(sectionRef, !!event);
  useEventReveal(eventRef, seen ? event?.id : undefined);
  const advanceWhenSeen = useCallback(() => {
    if (seen) advance();
  }, [seen, advance]);

  const { width: W, height: H } = useBoxSize(frameRef);
  const measured = W > 0 && H > 0;

  // The sphere, in the frame's CSS px: centred across, its crown near the top.
  const r = Math.round(Math.max(W * RADIUS_OF_WIDTH, H * RADIUS_OF_HEIGHT));
  const cx = W / 2;
  const cy = Math.round(H * CROWN_FROM_TOP) + r;
  // …and how cobe gets it there in a frame-sized canvas: zoomed to that
  // radius, then sunk (its centre moves scale × offset / 2).
  const scale = measured ? r / (COBE_RADIUS * H) : 1;
  const offsetY = (2 * (cy - H / 2)) / scale;
  const arcWidth = 0.4 * Math.min(1, ARC_FULL_R / Math.max(r, 1));
  // Stepped, so a resize doesn't hand the globe new dots (and restart its
  // paths) every pixel.
  const dotScale =
    Math.round(Math.min(1, DOT_FULL_R / Math.max(r, 1)) * 20) / 20;
  const dots = useMemo(() => scaleDots(markers, dotScale), [markers, dotScale]);

  if (!event) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-globe-heading"
      className="flex flex-col gap-2 @container/globe"
      style={RAINBOW_VARS}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="size-6 shrink-0 bg-white"
          style={{
            maskImage: 'url(/icons/globe-icon.svg)',
            WebkitMaskImage: 'url(/icons/globe-icon.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
        <h2
          id="home-globe-heading"
          className="min-w-0 text-base leading-6 text-white"
        >
          Globe
        </h2>
      </div>

      {/* The frame: the arc fills it, the event sits on the globe's face.
        No card (owner, 2026-11-05): the arc sits on the page. The aspect is
        a floor; a long event grows it (so the clipping is on the layer
        inside: overflow on an aspect-ratio box stops it growing). */}
      <div
        ref={frameRef}
        className="relative isolate grid aspect-[5/2] w-full items-end"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          style={EDGE_FADE}
        >
          {measured && (
            <>
              {/* Behind the globe, as behind the landing's planet: the streaks
              rising off the rim, the rim's bloom, and the planet's body
              (what shows until the globe fades in). */}
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="absolute inset-0 h-full w-full"
              >
                <HeroArcDefs
                  id={id}
                  width={W}
                  height={H}
                  cx={cx}
                  cy={cy}
                  r={r}
                />
                <rect
                  y={-STREAK_REACH}
                  width={W}
                  height={H + STREAK_REACH}
                  fill={`url(#${id}-streaks)`}
                  mask={`url(#${id}-streak-mask)`}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={`url(#${id}-rim)`}
                  strokeWidth="46"
                  filter={`url(#${id}-glow)`}
                  opacity="0.55"
                />
                <circle cx={cx} cy={cy} r={r} fill="#101012" />
              </svg>

              <div className="absolute inset-0">
                <GlobeCdn
                  fill
                  interactive={false}
                  scale={scale}
                  offset={[0, offsetY]}
                  theta={thetaFor(event.location.lat)}
                  maxDpr={MAX_DPR}
                  diffuse={DIFFUSE}
                  speed={reduce ? 0 : SPEED}
                  markers={seen ? dots : NO_MARKERS}
                  arcs={seen ? arcs : NO_ARCS}
                  arcHeight={arcHeight}
                  arcWidth={arcWidth}
                  arcRainbow={ARC_RAINBOW}
                  land="solid"
                  arcAnimationMs={ARC_DRAW_MS}
                  onRotationComplete={advanceWhenSeen}
                />
              </div>

              {/* Over the globe: the crisp rim on its limb. */}
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="absolute inset-0 h-full w-full"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={`url(#${id}-rim)`}
                  strokeWidth="2"
                />
              </svg>
            </>
          )}

          {/* The face darkens toward the bottom, where the event is read. */}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#101012] via-[#101012]/75 to-transparent" />
        </div>

        {/* The whole frame opens the Globe. */}
        <Link
          to={GlobeRoutes.root()}
          aria-label="Open the Globe"
          className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        />

        {/* Keyed, so each new event is written in afresh, line by line,
          behind the rainbow (useEventReveal). */}
        <div
          key={event.id}
          ref={eventRef}
          aria-hidden={!seen}
          className={cn(
            // On a narrow frame the event would cover the crown: it starts
            // lower, and the frame grows to fit. In line with the heading.
            'pointer-events-none relative flex min-w-0 max-w-[36rem] flex-col gap-3 pb-6 pt-40 @2xl/globe:pb-10 @2xl/globe:pt-10',
            !seen && 'invisible',
          )}
        >
          <h3
            className={cn(
              INK,
              'text-xl font-medium leading-snug text-white md:text-2xl',
            )}
          >
            {event.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-5 text-white/55">
            <span className="flex items-center gap-1.5">
              <Calendar aria-hidden className="insight-mark size-4" />
              {/* The text in its own span: the reveal's clear fill would
                hide the icon beside it. */}
              <span className={INK_55}>{event.year}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden className="insight-mark size-4" />
              <span className={INK_55}>
                {event.location.city}, {event.location.country}
              </span>
            </span>
          </div>
          {event.genre.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.genre.map((g) => (
                <span
                  key={g}
                  className="insight-pill rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[0.8125rem] leading-5 text-white/70"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          <p
            className={cn(
              INK_70,
              'line-clamp-3 text-sm leading-6 text-white/70',
            )}
          >
            {event.description}
          </p>
          {/* The card's one action: the prompt box's Go pill, like the
            Studio card's New project. */}
          <Link
            to={`${GlobeRoutes.root()}?event=${encodeURIComponent(event.id)}`}
            className={cn(
              GO_PILL,
              GO_PILL_ENABLED,
              'insight-pill pointer-events-auto mt-1 self-start bg-[#101012]/40 backdrop-blur-sm',
            )}
          >
            View on Globe
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

/**
 * Home's Globe, under Learn: the landing hero's horizon arc with a spinning
 * globe for its planet, cropped to the cap (the old dashboard's title card).
 * It draws a featured event's influence paths (useGlobePreview, shared with
 * the old dashboard's GlobeSection), the event written over the globe's
 * face, advancing once per rotation. Gated, as the featured events resolve
 * out of the content bundle at mount.
 */
export const HomeGlobeArc = () => (
  <ContentGate fallback={null}>
    <HomeGlobeArcInner />
  </ContentGate>
);
