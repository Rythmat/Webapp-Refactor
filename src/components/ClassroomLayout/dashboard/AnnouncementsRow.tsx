import {
  BellOff,
  GraduationCap,
  Hand,
  type LucideIcon,
  Megaphone,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  type CSSProperties,
  type FC,
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type Announcement,
  type AnnouncementSource,
  isHighPriority,
  useAnnouncements,
  useDismissedAnnouncementsStore,
} from '@/features/announcements';
import './announcements-marquee.css';

/** Reduced-motion crossfade cadence. */
const ROTATE_MS = 6000;
/** Marquee scroll speed — px per second (readable). */
const PX_PER_SEC = 60;
/** Floor for a single-pass duration so very short text still reads. */
const MIN_DURATION_S = 6;
/** How long the static "No new notifications" empty state lingers before it
 *  auto-disappears to the reserved gap. */
const NO_NOTIF_MS = 2500;

/**
 * The banner frame. Fixed height so it matches the app's standard top rows and
 * stays constant regardless of content — which also lets the empty/reserved
 * state render an invisible copy at the exact same height, so the page never
 * shifts as the announcements open, scroll, or close.
 */
const CARD_CLASS =
  'flex h-9 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 md:h-10 md:gap-3 md:px-4';

const FALLBACK_META = {
  Icon: Megaphone as LucideIcon,
  accent: 'text-white/80',
  badge: 'bg-white/10',
};

const SOURCE_META: Record<
  AnnouncementSource,
  { Icon: LucideIcon; accent: string; badge: string }
> = {
  teacher: {
    Icon: GraduationCap,
    accent: 'text-sky-300',
    badge: 'bg-sky-400/15',
  },
  challenge: {
    Icon: Trophy,
    accent: 'text-amber-300',
    badge: 'bg-amber-400/15',
  },
  app_update: {
    Icon: Sparkles,
    accent: 'text-violet-300',
    badge: 'bg-violet-400/15',
  },
  welcome: {
    Icon: Hand,
    accent: 'text-emerald-300',
    badge: 'bg-emerald-400/15',
  },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** One announcement's inline content (icon + title + body). Clickable when it
 *  carries a CTA — hover pauses the marquee so it's a stable click target. */
const AnnouncementItem: FC<{
  item: Announcement;
  onNavigate: (to: string) => void;
}> = ({ item, onNavigate }) => {
  const meta = SOURCE_META[item.source] ?? FALLBACK_META;
  const { Icon } = meta;
  const inner = (
    <span className="inline-flex items-center gap-2 md:gap-2.5">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${meta.badge}`}
      >
        <Icon className={`h-4 w-4 ${meta.accent}`} />
      </span>
      <span className="text-sm font-medium text-white md:text-base">
        {item.title}
      </span>
      {item.body && <span className="text-sm text-white/55">{item.body}</span>}
    </span>
  );

  const cta = item.cta;
  if (!cta) return inner;
  return (
    <button
      type="button"
      onClick={() => onNavigate(cta.to)}
      className="inline-flex items-center transition-opacity hover:opacity-80"
    >
      {inner}
    </button>
  );
};

/** A trailing separator dot between/after items in the scrolling track. */
const Dot = () => (
  <span className="px-4 text-white/25" aria-hidden="true">
    ·
  </span>
);

/**
 * The Home dashboard's Announcements top row — a slim right-to-left marquee.
 * High-priority announcements (teacher posts + app updates) take precedence and
 * loop until the user closes the box; low-priority ones (challenges, welcome)
 * scroll once and then the box auto-closes. Closing (auto or via ×) collapses to
 * a fixed-height reserved gap so the page never shifts. Falls back to a
 * crossfade rotation under reduced motion.
 */
export const AnnouncementsRow: FC = () => {
  const items = useAnnouncements();
  const dismiss = useDismissedAnnouncementsStore((s) => s.dismiss);
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const [paused, setPaused] = useState(false);
  // Ephemeral (not persisted): set when a low-priority pass finishes, keyed so a
  // fresh set (or a new page load) replays it once.
  const [autoClosedKey, setAutoClosedKey] = useState<string | null>(null);

  // Which announcements to show, and how. High-priority present → only those,
  // looping. Otherwise the low-priority ones, one pass then auto-close.
  const { displayed, mode, setKey } = useMemo(() => {
    const high = items.filter(isHighPriority);
    const list = high.length ? high : items.filter((a) => !isHighPriority(a));
    const m = high.length ? 'loop' : list.length ? 'once' : 'idle';
    return {
      displayed: list,
      mode: m as 'loop' | 'once' | 'idle',
      setKey: list.map((a) => a.id).join('|'),
    };
  }, [items]);

  // The "No new notifications" empty state (mode === 'idle') shows briefly, then
  // this flag flips and the row collapses to its reserved gap. Reset whenever we
  // leave idle so it shows again next time the row empties (and on a fresh load).
  const [idleClosed, setIdleClosed] = useState(false);
  useEffect(() => {
    if (mode !== 'idle') setIdleClosed(false);
  }, [mode]);
  useEffect(() => {
    if (mode !== 'idle' || idleClosed || paused) return;
    const id = window.setTimeout(() => setIdleClosed(true), NO_NOTIF_MS);
    return () => window.clearTimeout(id);
  }, [mode, idleClosed, paused]);

  const collapsed =
    (mode === 'idle' && idleClosed) ||
    (mode === 'once' && autoClosedKey === setKey);

  // ── Marquee measurement (motion mode) ──────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<{
    key: string;
    from: number;
    to: number;
    duration: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (reducedMotion || collapsed) return;
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const measure = () => {
      const viewW = vp.clientWidth;
      const contentW = track.scrollWidth;
      if (mode === 'loop') {
        // Seamless doubled track: one cycle travels half its width.
        const dur = Math.max(contentW / 2 / PX_PER_SEC, MIN_DURATION_S);
        setMetrics({ key: setKey, from: 0, to: 0, duration: dur });
      } else {
        // Single pass: enter fully from the right, exit fully past the left.
        const dur = Math.max((viewW + contentW) / PX_PER_SEC, MIN_DURATION_S);
        setMetrics({ key: setKey, from: viewW, to: -contentW, duration: dur });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(track);
    return () => ro.disconnect();
  }, [reducedMotion, collapsed, mode, setKey]);

  // ── Reduced-motion crossfade rotation ──────────────────────────────────
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [setKey]);
  useEffect(() => {
    if (!reducedMotion || collapsed || paused || displayed.length === 0) return;
    const id = window.setTimeout(() => {
      const next = index + 1;
      if (mode === 'once' && next >= displayed.length) {
        setAutoClosedKey(setKey); // one full cycle done → auto-close
      } else {
        setIndex(next % displayed.length);
      }
    }, ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [reducedMotion, collapsed, paused, index, mode, displayed.length, setKey]);

  if (collapsed) {
    return <div aria-hidden className={`${CARD_CLASS} invisible`} />;
  }

  const showClose = displayed.some((a) => a.dismissible !== false);
  const dismissAll = () => {
    for (const a of displayed) {
      if (a.dismissible !== false) dismiss(a.id);
    }
  };

  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  // ── Empty state: a static "No new notifications" that lingers a few seconds
  //    (see the idle timer above) then auto-disappears to the reserved gap. ──
  if (mode === 'idle') {
    return (
      <section
        role="region"
        aria-label="Announcements"
        aria-live="polite"
        {...pauseHandlers}
      >
        <div className={CARD_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-white/45 md:gap-2.5">
            <BellOff className="h-4 w-4 shrink-0" />
            <span className="text-sm md:text-base">No new notifications</span>
          </div>
        </div>
      </section>
    );
  }

  // ── Reduced motion: crossfade a single item at a time ──────────────────
  if (reducedMotion) {
    const current = displayed[index % displayed.length];
    return (
      <section
        role="region"
        aria-label="Announcements"
        aria-live="polite"
        {...pauseHandlers}
      >
        <div className={CARD_CLASS}>
          <div key={current.id} className="flex min-w-0 flex-1 items-center">
            <AnnouncementItem item={current} onNavigate={navigate} />
          </div>
          {showClose && (
            <button
              type="button"
              onClick={dismissAll}
              aria-label="Close announcements"
              className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    );
  }

  // ── Motion: right-to-left marquee ──────────────────────────────────────
  const metricsValid = metrics?.key === setKey;
  const marqueeClass =
    mode === 'loop'
      ? 'announcements-marquee-track'
      : 'announcements-marquee-pass';
  const trackClassName = `flex w-max items-center whitespace-nowrap ${
    metricsValid ? marqueeClass : ''
  }`;
  const trackStyle: CSSProperties | undefined = metricsValid
    ? ({
        animationDuration: `${metrics.duration}s`,
        animationPlayState: paused ? 'paused' : 'running',
        ...(mode === 'once'
          ? { '--mq-from': `${metrics.from}px`, '--mq-to': `${metrics.to}px` }
          : {}),
      } as CSSProperties)
    : undefined;

  return (
    <section
      role="region"
      aria-label="Announcements"
      aria-live="polite"
      {...pauseHandlers}
    >
      <div className={CARD_CLASS}>
        <div ref={viewportRef} className="relative flex-1 overflow-hidden">
          <div
            key={setKey}
            ref={trackRef}
            className={trackClassName}
            style={trackStyle}
            onAnimationEnd={(e) => {
              if (
                mode === 'once' &&
                e.animationName === 'announcements-marquee-pass'
              ) {
                setAutoClosedKey(setKey);
              }
            }}
          >
            {mode === 'loop' ? (
              <>
                {displayed.map((item, i) => (
                  <Fragment key={`a:${item.id}:${i}`}>
                    <AnnouncementItem item={item} onNavigate={navigate} />
                    <Dot />
                  </Fragment>
                ))}
                {/* Duplicate run for the seamless loop; hidden from a11y. */}
                <span className="inline-flex items-center" aria-hidden="true">
                  {displayed.map((item, i) => (
                    <Fragment key={`b:${item.id}:${i}`}>
                      <AnnouncementItem item={item} onNavigate={navigate} />
                      <Dot />
                    </Fragment>
                  ))}
                </span>
              </>
            ) : (
              displayed.map((item, i) => (
                <Fragment key={`${item.id}:${i}`}>
                  {i > 0 && <Dot />}
                  <AnnouncementItem item={item} onNavigate={navigate} />
                </Fragment>
              ))
            )}
          </div>
        </div>

        {showClose && (
          <button
            type="button"
            onClick={dismissAll}
            aria-label="Close announcements"
            className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
