import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Music2, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import type { ActivityItem } from '@/hooks/data';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { useHomeActivity } from './useHomeActivity';

/** How long each activity shows before the rail moves to the next. */
const CYCLE_S = 20;

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
 * Home's bottom rail, after Suno's player bar: where you left off, cycling
 * through your recent activity (lessons, Studio work, songs) the way a
 * player moves through a queue: the item on the left opens it, the dots on
 * the right jump to one. Hovering or focusing the rail holds it, and under
 * reduced motion it doesn't advance. Hidden when there's no activity.
 */
export const ActivityRail = () => {
  const items = useHomeActivity();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const count = items.length;
  const i = count ? index % count : 0;

  // The next item after CYCLE_S, unless held, alone or reduced.
  useEffect(() => {
    if (held || reduce || count < 2) return;
    const id = window.setTimeout(
      () => setIndex((i + 1) % count),
      CYCLE_S * 1000,
    );
    return () => window.clearTimeout(id);
  }, [i, held, reduce, count]);

  if (count === 0) return null;
  const item = items[i];
  const label = `${item.category} · ${item.subtitle}`;

  return (
    <aside
      aria-label="Continue where you left off"
      className="flex h-[72px] w-full shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] bg-[#0c0c0e] px-4 md:px-5"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
    >
      {/* Now showing */}
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
            className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-white/[0.06]">
              <Art item={item} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white group-hover:underline">
                {item.title}
              </span>
              <span className="block truncate text-xs uppercase tracking-[0.06em] text-white/50">
                {label}
              </span>
            </span>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Queue dots */}
      <div className="flex shrink-0 items-center justify-end gap-3">
        {count > 1 && (
          <div
            className="hidden items-center gap-1.5 md:flex"
            aria-label="Recent activity"
          >
            {items.map((it, n) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setIndex(n)}
                aria-label={`Show ${it.title}`}
                aria-current={n === i || undefined}
                className={cn(
                  'h-1.5 rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40',
                  n === i
                    ? 'w-4 bg-white/80'
                    : 'w-1.5 bg-white/25 hover:bg-white/50',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
