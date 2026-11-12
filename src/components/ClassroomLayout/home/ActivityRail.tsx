import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Music2, SlidersHorizontal } from 'lucide-react';
import { type FocusEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import type { ActivityItem } from '@/hooks/data';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { useHomeActivity } from './useHomeActivity';

/** How long each activity shows before the rail moves to the next. */
const CYCLE_S = 20;

/** Labels the rail leaves out: the art and title already say what it is. */
const HIDDEN_LABELS = new Set(['Song', 'Saved Song', 'On this device']);

const KIND_ICON = {
  lesson: BookOpen,
  project: SlidersHorizontal,
  song: Music2,
} as const;

/** The item's art: its picture, its tile, or its color with a kind icon. */
const Art = ({ item }: { item: ActivityItem }) => {
  const tile = useMemo(
    () =>
      item.kind === 'project' && !item.thumbnail && !item.image
        ? `data:image/svg+xml;utf8,${encodeURIComponent(generateStudioTileSvg(item.id))}`
        : null,
    [item.kind, item.id, item.thumbnail, item.image],
  );
  const src = item.thumbnail ?? item.image ?? tile;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className="size-full object-cover"
      />
    );
  }
  const Icon = KIND_ICON[item.kind];
  return (
    <span
      className="flex size-full items-center justify-center"
      style={{
        background: `color-mix(in oklab, ${item.accentColor ?? '#ffffff'} 28%, #151518)`,
      }}
    >
      <Icon className="size-5 text-white/85" />
    </span>
  );
};

/**
 * Which recent activity shows, and its moving on: the next after CYCLE_S,
 * unless held (hovered or focused), alone, or under reduced motion.
 */
export function useActivityCycle(items: ActivityItem[]) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const count = items.length;
  const i = count ? index % count : 0;

  useEffect(() => {
    if (held || reduce || count < 2) return;
    const id = window.setTimeout(
      () => setIndex((i + 1) % count),
      CYCLE_S * 1000,
    );
    return () => window.clearTimeout(id);
  }, [i, held, reduce, count]);

  return {
    items,
    index: i,
    item: count ? items[i] : null,
    setIndex,
    /** On the element that holds the cycle while pointed at or focused. */
    holdProps: {
      onMouseEnter: () => setHeld(true),
      onMouseLeave: () => setHeld(false),
      onFocus: () => setHeld(true),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      },
    },
  };
}

/** The activity showing: its art, title and label, opening it. */
export function ActivityNowShowing({
  item,
  playBar = false,
}: {
  item: ActivityItem;
  playBar?: boolean;
}) {
  const reduce = useReducedMotion();
  const label = [item.category, item.subtitle]
    .filter((part) => part && !HIDDEN_LABELS.has(part))
    .join(' · ');
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={item.id}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="min-w-0"
      >
        <Link
          to={item.route}
          className={cn(
            'group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            playBar && 'gap-[0.675rem]',
          )}
        >
          <span
            className={cn(
              'relative size-11 shrink-0 overflow-hidden rounded-md',
              playBar && 'size-[2.475rem]',
            )}
          >
            <Art item={item} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate text-sm text-white group-hover:underline',
                playBar && 'text-[0.788rem]',
              )}
            >
              {item.title}
            </span>
            <span
              className={cn(
                'block truncate text-xs uppercase tracking-[0.06em] text-white/50',
                playBar && 'text-[0.675rem]',
              )}
            >
              {label}
            </span>
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}

/** The queue dots: one for each recent activity, the one showing long. */
export function ActivityDots({
  items,
  index,
  onPick,
  playBar = false,
}: {
  items: ActivityItem[];
  index: number;
  onPick: (index: number) => void;
  playBar?: boolean;
}) {
  if (items.length < 2) return null;
  return (
    <div
      className={cn(
        'hidden items-center gap-1.5 md:flex',
        playBar && 'gap-[0.338rem]',
      )}
      aria-label="Recent activity"
    >
      {items.map((it, n) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onPick(n)}
          aria-label={`Show ${it.title}`}
          aria-current={n === index || undefined}
          className={cn(
            'h-1.5 rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40',
            n === index
              ? 'w-4 bg-white/80'
              : 'w-1.5 bg-white/25 hover:bg-white/50',
            playBar && 'h-[0.338rem]',
            playBar && (n === index ? 'w-[0.9rem]' : 'w-[0.338rem]'),
          )}
        />
      ))}
    </div>
  );
}

/**
 * Home's bottom rail, after Suno's player bar: where you left off, cycling
 * through your recent activity (lessons, Studio work, songs) the way a
 * player moves through a queue: the item on the left opens it, the dots on
 * the right jump to one. Hovering or focusing the rail holds it, and under
 * reduced motion it doesn't advance. Hidden when there's no activity.
 */
export const ActivityRail = ({
  className,
  playBar = false,
}: {
  className?: string;
  /** The app's play bar under Home, Learn and the Arcade (owner,
   *  2026-11-10): Suno's 64px less a tenth, everything in it a tenth
   *  smaller too, in the darker black with no edge of its own. */
  playBar?: boolean;
}) => {
  const cycle = useActivityCycle(useHomeActivity());
  if (!cycle.item) return null;

  return (
    <aside
      aria-label="Continue where you left off"
      className={cn(
        'flex h-[4.5rem] w-full shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] bg-[#0c0c0e] px-4 md:px-5',
        playBar &&
          'h-[3.273rem] gap-[0.9rem] border-t-0 bg-transparent px-[1.227rem] md:px-[1.227rem]',
        className,
      )}
      {...cycle.holdProps}
    >
      {/* Now showing */}
      <ActivityNowShowing item={cycle.item} playBar={playBar} />

      {/* Queue dots */}
      <div className="flex shrink-0 items-center justify-end gap-3">
        <ActivityDots
          items={cycle.items}
          index={cycle.index}
          onPick={cycle.setIndex}
          playBar={playBar}
        />
      </div>
    </aside>
  );
};
