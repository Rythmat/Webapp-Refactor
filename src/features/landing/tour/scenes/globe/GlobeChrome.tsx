import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
  Layers,
  LayoutGrid,
  MapPin,
  Play,
  Search,
  Share,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ERA_HEX,
  eraOfYear,
  MUSICAL_ERAS,
} from '@/components/atlas/data/musicalEras';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { cn } from '@/components/utilities';
import { KEY_RAINBOW } from '../../../rainbow';
import { HORIZON_STREAKS } from '../../../sections/RainbowHorizon';
import {
  eraCounts,
  ERA_TOTALS,
  placeById,
  type GlobeLink,
  type GlobeStory,
} from './globeData';

/**
 * The Globe's frame and cards, copied from today's Globe
 * (`components/atlas`: `Frame/TopRail`, `Frame/BottomRail`, `UI/EraRail`,
 * `UI/DetailsCard`, `Cards/StageCards`) — values only, display only.
 */
export const GLOBE_UI = {
  page: '#101012',
  panel: '#151518',
  pill: '#141417',
  pillOn: 'rgba(255, 255, 255, 0.2)',
  text: '#e8e8f0',
  text2: 'rgba(255, 255, 255, 0.7)',
  text3: '#8e8ea3',
  /** `ATLAS_CARD`. */
  card: 'rounded-[20px] border border-white/10 bg-[#151518] shadow-[0_8px_28px_rgba(0,0,0,0.36)]',
} as const;

const EASE = [0.2, 0.8, 0.2, 1] as const;
/** Came from bars: D♭ (the cool ramp's 2nd); went to: C (the warm ramp's 4th). */
export const CAME_FROM = ROOTS_RAMP[1];
const WENT_TO = ROUTES_RAMP[3];

const PillZone = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'flex h-9 shrink-0 items-center rounded-full px-1',
      className,
    )}
    style={{ background: GLOBE_UI.pill }}
  >
    {children}
  </span>
);

const IconCell = ({ children }: { children: ReactNode }) => (
  <span className="grid size-8 place-items-center text-white/50">
    {children}
  </span>
);

/** The top rail: back · forward, the search pill, trail and Share. */
export const GlobeTopRail = ({ compact }: { compact: boolean }) => (
  <div
    aria-hidden
    className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2"
  >
    <span className="flex">
      {!compact && (
        <PillZone>
          <IconCell>
            <ChevronLeft className="size-4" />
          </IconCell>
          <IconCell>
            <ChevronRight className="size-4" />
          </IconCell>
        </PillZone>
      )}
    </span>
    <span
      className={cn(
        'flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-[13px]',
        compact ? 'w-56' : 'w-72',
      )}
      style={{ background: GLOBE_UI.pill, color: 'rgba(255, 255, 255, 0.5)' }}
    >
      <Search className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Search artists, places, songs…
      </span>
      {!compact && (
        <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 font-[inherit] text-[11px]">
          ⌘K
        </kbd>
      )}
    </span>
    <span className="flex justify-end gap-1.5">
      {!compact && (
        <>
          <PillZone>
            <IconCell>
              <History className="size-4" />
            </IconCell>
          </PillZone>
          <PillZone className="gap-1.5 px-3 text-[13px] text-white/70">
            <Share className="size-4" />
            Share
          </PillZone>
        </>
      )}
    </span>
  </div>
);

/** The bottom rail: ▶ Spin, the view tabs (Explore on), the panel icons. */
export const GlobeBottomRail = ({ compact }: { compact: boolean }) => (
  <div
    aria-hidden
    className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2"
  >
    <span className="flex">
      {!compact && (
        <PillZone className="gap-1.5 px-3 text-[13px] text-white/70">
          <Play className="size-3.5 fill-current" />
          Spin
        </PillZone>
      )}
    </span>
    <PillZone className="gap-0.5">
      {['Explore', 'Connections', 'Tours'].map((tab, i) => (
        <span
          key={tab}
          className={cn(
            'flex h-8 items-center rounded-full px-4 text-[13px]',
            i === 0 ? 'font-bold text-white' : 'text-white/50',
          )}
          style={{ background: i === 0 ? GLOBE_UI.pillOn : undefined }}
        >
          {tab}
        </span>
      ))}
    </PillZone>
    <span className="flex justify-end">
      {!compact && (
        <PillZone>
          {[Info, Layers, LayoutGrid].map((Icon, i) => (
            <IconCell key={i}>
              <Icon className="size-4" />
            </IconCell>
          ))}
        </PillZone>
      )}
    </span>
  </div>
);

/** The era rail's segments: widths by every era's events, not by years. */
const ALL_EVENTS = Object.values(ERA_TOTALS).reduce((a, b) => a + b, 0);
const SEGMENTS = (() => {
  let x = 0;
  return MUSICAL_ERAS.map((era) => {
    const w = ERA_TOTALS[era.id] / ALL_EVENTS;
    const seg = { era, x0: x, w };
    x += w;
    return seg;
  });
})();

/** Where a year sits on the rail (0–1). */
const railX = (year: number) => {
  const seg = SEGMENTS.find((s) => s.era.id === eraOfYear(year).id)!;
  const { yearStart, yearEnd } = seg.era;
  return seg.x0 + seg.w * ((year - yearStart) / (yearEnd - yearStart + 1));
};

/**
 * The era rail at the stage's foot (`UI/EraRail`, at rest): light streaks
 * rising off a crisp key-colour rim with its bloom, and the picked place's
 * events as white marks over their years.
 */
export const EraRail = ({
  story,
  still,
}: {
  story: GlobeStory | null;
  still: boolean;
}) => {
  const marks = story ? [...new Set(story.years.map(railX))] : [];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-4 bottom-0 z-10 h-11"
    >
      <div
        className="absolute inset-x-0 bottom-[5px] h-11 origin-bottom scale-y-[0.4] opacity-60"
        style={{
          backgroundImage: HORIZON_STREAKS,
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
        }}
      />
      <div
        className="absolute inset-x-0 -bottom-3 h-8 opacity-50 blur-2xl"
        style={{ backgroundImage: KEY_RAINBOW }}
      />
      <div
        className="absolute inset-x-0 bottom-[5px] h-0.5"
        style={{ backgroundImage: KEY_RAINBOW }}
      />
      {marks.map((x, i) => (
        <motion.span
          key={`${story!.place}:${x}`}
          className="absolute bottom-[7px] flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${x * 100}%` }}
          initial={still ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: still ? 0 : 0.2 + i * 0.03 }}
        >
          <span className="size-[7px] rounded-full bg-white/80" />
          <span className="h-2 w-px bg-white/60" />
        </motion.span>
      ))}
    </div>
  );
};

/** A stacked bar of a place's events by era, oldest first. */
const EraBar = ({ years }: { years: readonly number[] }) => (
  <span className="flex h-1.5 w-full overflow-hidden rounded-full">
    {eraCounts(years).map(([era, n]) => (
      <span key={era} style={{ flexGrow: n, background: ERA_HEX[era] }} />
    ))}
  </span>
);

/**
 * The Inspector's events card (`UI/DetailsCard`): the place, its count and
 * era bar, then event tiles — an era-tinted poster, the title, year and place.
 */
export const EventsCard = ({
  story,
  title,
  tiles = 3,
  className,
  children,
}: {
  story: GlobeStory;
  title: string;
  /** How many event tiles fit. */
  tiles?: number;
  className?: string;
  /** In place of the tiles (the Connections demo's song). */
  children?: ReactNode;
}) => (
  <div className={cn(GLOBE_UI.card, 'flex flex-col gap-3 p-4', className)}>
    <div className="flex flex-col gap-1.5">
      <h4
        className="text-lg font-bold leading-tight"
        style={{ color: GLOBE_UI.text }}
      >
        {title}
      </h4>
      <p className="text-[13px]" style={{ color: GLOBE_UI.text2 }}>
        {story.where} · {story.years.length} events
      </p>
      <EraBar years={story.years} />
    </div>
    {children ??
      story.events.slice(0, tiles).map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2"
        >
          <span
            aria-hidden
            className="aspect-video w-20 shrink-0 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${ERA_HEX[eraOfYear(e.year).id]}, #151518)`,
            }}
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span
              className="line-clamp-2 text-[13px] font-bold leading-snug"
              style={{ color: GLOBE_UI.text }}
            >
              {e.title}
            </span>
            <span
              className="flex items-center gap-3 text-[11px]"
              style={{ color: GLOBE_UI.text3 }}
            >
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {e.year}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {placeById(story.place)?.label}
              </span>
            </span>
          </span>
        </div>
      ))}
  </div>
);

/** One bar row: the place, its count and a bar in the side's colour. */
export const LinkRow = ({
  link,
  max,
  color,
}: {
  link: GlobeLink;
  max: number;
  color: string;
}) => (
  <div className="flex flex-col gap-1">
    <span className="flex items-baseline justify-between text-[13px]">
      <span className="truncate" style={{ color: GLOBE_UI.text }}>
        {link.label}
      </span>
      <span style={{ color: GLOBE_UI.text3 }}>{link.n}</span>
    </span>
    <span className="h-1 rounded-full bg-white/[0.06]">
      <span
        className="block h-full rounded-full"
        style={{ width: `${(link.n / max) * 100}%`, background: color }}
      />
    </span>
  </div>
);

/**
 * The Connections card (`Cards/StageCards`): a small flow chart — where the
 * place's music came from, into a white hub, out to where it went — the
 * Came from / Went to switch (Went to on) and its strongest rows.
 */
export const ConnectionsCard = ({
  story,
  rows = 4,
  still,
  className,
}: {
  story: GlobeStory;
  rows?: number;
  still: boolean;
  className?: string;
}) => {
  const max = Math.max(1, ...story.wentTo.map((l) => l.n));
  const bands = (n: number, side: 'in' | 'out') =>
    Array.from({ length: n }, (_, i) => {
      const y = n === 1 ? 50 : 14 + (i * 72) / (n - 1);
      return side === 'in'
        ? `M0 ${y} C 45 ${y}, 55 50, 98 50`
        : `M102 50 C 145 50, 155 ${y}, 200 ${y}`;
    });
  return (
    <div
      className={cn(
        GLOBE_UI.card,
        'flex flex-col gap-3 px-4 pb-4 pt-3',
        className,
      )}
    >
      <span
        className="text-[11px] font-bold uppercase tracking-[0.08em]"
        style={{ color: GLOBE_UI.text3 }}
      >
        Connections
      </span>
      <svg
        aria-hidden
        viewBox="0 0 200 100"
        className="h-16 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ma-flow-in" x1="0" x2="1">
            <stop offset="0" stopColor={ROOTS_RAMP[0]} />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="ma-flow-out" x1="0" x2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={ROUTES_RAMP[4]} />
          </linearGradient>
        </defs>
        {bands(story.cameFrom.length, 'in').map((d, i) => (
          <motion.path
            key={`in${i}`}
            d={d}
            fill="none"
            stroke="url(#ma-flow-in)"
            strokeWidth={3}
            strokeOpacity={0.7}
            vectorEffect="non-scaling-stroke"
            initial={still ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        ))}
        {bands(Math.min(6, story.wentTo.length), 'out').map((d, i) => (
          <motion.path
            key={`out${i}`}
            d={d}
            fill="none"
            stroke="url(#ma-flow-out)"
            strokeWidth={2}
            strokeOpacity={0.7}
            vectorEffect="non-scaling-stroke"
            initial={still ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: still ? 0 : 0.3, ease: EASE }}
          />
        ))}
        <rect x={98} y={20} width={4} height={60} rx={2} fill="#ffffff" />
      </svg>
      <span
        className="flex rounded-full p-0.5 text-[12px]"
        style={{ background: GLOBE_UI.pill }}
      >
        <span className="flex-1 rounded-full px-2 py-1 text-center text-white/50">
          Came from · {story.cameFrom.length}
        </span>
        <span
          className="flex-1 rounded-full px-2 py-1 text-center font-bold text-white"
          style={{ background: GLOBE_UI.pillOn }}
        >
          Went to · {story.wentTo.length}
        </span>
      </span>
      {story.wentTo.slice(0, rows).map((l) => (
        <LinkRow key={l.place} link={l} max={max} color={WENT_TO} />
      ))}
    </div>
  );
};
