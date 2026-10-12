import { Check, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtlasSearchBar } from '@/components/atlas/components/UI/AtlasSearchBar';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import {
  useAtlasTrail,
  type TrailEntry,
} from '@/components/atlas/navigation/useAtlasTrail';

/** Trail steps drawn at once; the rest wait behind "+N earlier / later". */
export const TRAIL_WINDOW = 16;

/**
 * Which steps of the trail to draw: the latest TRAIL_WINDOW, unless the
 * cursor has walked back past them, in which case the window starts just
 * before the cursor. Pure, for testing.
 */
export function trailWindow(
  length: number,
  cursorPos: number,
  size = TRAIL_WINDOW,
): { start: number; end: number } {
  if (length <= size) return { start: 0, end: length };
  let start = length - size;
  if (cursorPos >= 0 && cursorPos <= start) start = Math.max(0, cursorPos - 1);
  return { start, end: Math.min(length, start + size) };
}

const ICON_BUTTON =
  'flex size-8 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]';

/** One step of the trail: a tiny thumbnail and a short label. */
function TrailStep({
  entry,
  state,
  onJump,
}: {
  entry: TrailEntry;
  state: 'past' | 'current' | 'future';
  onJump: (entry: TrailEntry) => void;
}) {
  const presentation = useMemo(() => describeStop(entry.stop), [entry.stop]);
  return (
    <button
      aria-current={state === 'current' ? 'step' : undefined}
      aria-label={`${presentation.title} — ${presentation.subtitle}`}
      className={`group flex w-16 shrink-0 flex-col gap-1 rounded-md p-0.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
        state === 'current'
          ? 'bg-[#60a5fa]/20 ring-1 ring-[#60a5fa]'
          : 'hover:bg-white/10'
      } ${state === 'future' ? 'opacity-45 hover:opacity-100' : ''}`}
      data-trail-idx={entry.idx}
      title={`${presentation.title}\n${presentation.subtitle}`}
      type="button"
      onClick={() => onJump(entry)}
    >
      <StopThumb presentation={presentation} />
      <span className="truncate px-0.5 text-[10px] leading-tight text-white/70 group-hover:text-white">
        {presentation.title}
      </span>
    </button>
  );
}

/**
 * The strip across the top of the globe, laid out like a browser's chrome:
 * Back / Forward, the search field, the trail of everywhere this session has
 * been, and a button to copy a link to exactly this view.
 *
 * Every step in the trail is a real history entry with its own URL, so the
 * trail, these arrows, and the browser's Back button all walk the same path —
 * and a teacher can copy any step straight into a lesson.
 */
export function AtlasToolbar() {
  const trail = useAtlasTrail();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  // An 80-step trail is 80 thumbnails; draw a window of it until asked for
  // the rest, then scroll toward what was asked for.
  const [showAll, setShowAll] = useState<'earlier' | 'later' | null>(null);
  const shownRange = showAll
    ? { start: 0, end: trail.entries.length }
    : trailWindow(trail.entries.length, trail.cursorPos);
  const visible = trail.entries.slice(shownRange.start, shownRange.end);
  const earlier = shownRange.start;
  const later = trail.entries.length - shownRange.end;

  useEffect(() => {
    if (!showAll) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: showAll === 'earlier' ? 0 : scroller.scrollWidth,
      behavior: 'smooth',
    });
  }, [showAll]);

  // A cleared trail starts windowed again.
  useEffect(() => {
    if (trail.entries.length <= 1) setShowAll(null);
  }, [trail.entries.length]);

  // Keep the current step in view as the trail grows or the user walks it.
  const current = trail.entries[trail.cursorPos];
  useEffect(() => {
    if (!current) return;
    scrollerRef.current
      ?.querySelector(`[data-trail-idx="${current.idx}"]`)
      ?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
  }, [current]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission). The URL
      // bar holds the same link, so point there instead of failing silently.
      window.prompt('Copy this link:', window.location.href);
    }
  };

  return (
    <div className="relative z-[1200] flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-0.5">
        <button
          aria-label="Back"
          className={ICON_BUTTON}
          disabled={!trail.canBack}
          title="Back"
          type="button"
          onClick={trail.back}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          aria-label="Forward"
          className={ICON_BUTTON}
          disabled={!trail.canForward}
          title="Forward"
          type="button"
          onClick={trail.forward}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <AtlasSearchBar />

      <nav
        ref={scrollerRef}
        aria-label="Your path through the globe"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:thin]"
      >
        {trail.entries.length > 1 && earlier > 0 && (
          <button
            className="shrink-0 rounded-md px-1.5 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
            title="Show the earlier steps of your path"
            type="button"
            onClick={() => setShowAll('earlier')}
          >
            +{earlier} earlier
          </button>
        )}
        {trail.entries.length > 1 &&
          visible.map((entry, v) => {
            const i = shownRange.start + v;
            return (
              <div key={entry.idx} className="flex shrink-0 items-center gap-1">
                {v > 0 && (
                  <ChevronRight
                    aria-hidden
                    className="size-3 shrink-0 text-white/25"
                  />
                )}
                <TrailStep
                  entry={entry}
                  state={
                    i < trail.cursorPos
                      ? 'past'
                      : i === trail.cursorPos
                        ? 'current'
                        : 'future'
                  }
                  onJump={trail.jump}
                />
              </div>
            );
          })}
        {trail.entries.length > 1 && later > 0 && (
          <button
            className="shrink-0 rounded-md px-1.5 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
            title="Show the later steps of your path"
            type="button"
            onClick={() => setShowAll('later')}
          >
            +{later} later
          </button>
        )}
      </nav>

      {trail.entries.length > 1 && (
        <button
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          title="Start a fresh trail from here"
          type="button"
          onClick={trail.clear}
        >
          Clear
        </button>
      )}

      <button
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        title="Copy a link to exactly this view — for a lesson, a presentation, or a bookmark"
        type="button"
        onClick={copyLink}
      >
        {copied ? (
          <Check aria-hidden className="size-3.5 text-emerald-400" />
        ) : (
          <Link2 aria-hidden className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {copied ? 'Link copied' : 'Copy link'}
        </span>
      </button>
    </div>
  );
}
