import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { AtlasRoutes } from '@/constants/routes';
import { ContentGate } from '@/content/ContentGate';
import '@/daw/components/Library/insight.css';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';

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

const HomeGlobeCardInner = () => {
  const { event, markers, arcs, arcHeight, advance } = useGlobePreview();
  const sectionRef = useRef<HTMLElement>(null);
  const eventRef = useRef<HTMLDivElement>(null);
  // The first event comes on as the section is scrolled to (owner,
  // 2026-10-25): until then the globe turns alone, the event's place kept
  // (invisible) so nothing moves, and it doesn't advance.
  const seen = useSeen(sectionRef, !!event);
  useEventReveal(eventRef, seen ? event?.id : undefined);
  const advanceWhenSeen = useCallback(() => {
    if (seen) advance();
  }, [seen, advance]);

  if (!event) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-globe-heading"
      // No card behind it (owner, 2026-10-25): a heading over its content,
      // as Instruments above.
      className="flex flex-col gap-2 @container/globe"
      style={RAINBOW_VARS}
    >
      <div className="flex items-center justify-between gap-3">
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
        <Link
          to={`${AtlasRoutes.root()}?tab=Pathways`}
          className="group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          View Pathways
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* The globe beside the event it is showing; stacked on a narrow card. */}
      <div className="grid grid-cols-1 items-center gap-6 @2xl/globe:grid-cols-2 @2xl/globe:gap-10">
        {/* Outer box reserves the square; the inner one bleeds the canvas
          outward so tall arcs draw past its edge without being clipped. */}
        <div className="relative mx-auto aspect-square w-full max-w-80 @2xl/globe:max-w-[26rem]">
          <div className="absolute inset-[-10%]">
            <GlobeCdn
              markers={seen ? markers : NO_MARKERS}
              arcs={seen ? arcs : NO_ARCS}
              arcHeight={arcHeight}
              arcRainbow={ARC_RAINBOW}
              // Solid country polygons rather than dots (owner, 2026-10-25).
              land="solid"
              arcAnimationMs={ARC_DRAW_MS}
              onRotationComplete={advanceWhenSeen}
            />
          </div>
        </div>

        {/* Keyed, so each new event is written in afresh, line by line,
          behind the rainbow (useEventReveal). */}
        <div
          key={event.id}
          ref={eventRef}
          aria-hidden={!seen}
          className={cn('flex min-w-0 flex-col gap-3', !seen && 'invisible')}
        >
          <h3
            className={cn(INK, 'text-lg font-medium leading-snug text-white')}
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
              'line-clamp-5 text-sm leading-6 text-white/70',
            )}
          >
            {event.description}
          </p>
          {/* The card's one action: the prompt box's Go pill, like the
            Studio card's New project. */}
          <Link
            to={`${AtlasRoutes.globe()}?event=${encodeURIComponent(event.id)}`}
            className={cn(
              GO_PILL,
              GO_PILL_ENABLED,
              'insight-pill mt-1 self-start',
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
 * Home's Globe preview, under Instruments, in its look (no card): a spinning
 * globe drawing a featured event's influence paths (useGlobePreview, shared
 * with the old dashboard's GlobeSection), the event beside it, advancing once
 * per rotation. Gated, as the featured events resolve out of the content
 * bundle at mount.
 */
export const HomeGlobeCard = () => (
  <ContentGate fallback={null}>
    <HomeGlobeCardInner />
  </ContentGate>
);
