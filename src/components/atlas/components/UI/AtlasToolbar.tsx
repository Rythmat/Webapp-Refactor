import { Check, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtlasSearchBar } from '@/components/atlas/components/UI/AtlasSearchBar';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_FOCUS,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import {
  scrollBehavior,
  usePrefersReducedMotion,
} from '@/components/atlas/hooks/useMediaQuery';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import {
  useAtlasTrail,
  type TrailEntry,
} from '@/components/atlas/navigation/useAtlasTrail';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';

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
      className={`group flex w-20 shrink-0 flex-col gap-1 rounded-xl border p-1 text-left transition ${ATLAS_FOCUS} ${
        state === 'current'
          ? 'border-atlas-accent bg-atlas-accent/20'
          : state === 'future'
            ? // Steps ahead, after Back: dimmed, and dashed so the state
              // does not rest on the dimming alone.
              'border-dashed border-white/20 opacity-60 hover:bg-white/[0.08] hover:opacity-100'
            : 'border-transparent hover:bg-white/[0.08]'
      }`}
      data-trail-idx={entry.idx}
      title={`${presentation.title}\n${presentation.subtitle}`}
      type="button"
      onClick={() => onJump(entry)}
    >
      <StopThumb presentation={presentation} />
      <span className="truncate px-0.5 text-xs leading-tight text-atlas-text-2 group-hover:text-atlas-text">
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
  const reducedMotion = usePrefersReducedMotion();
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
      behavior: scrollBehavior(reducedMotion),
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
        behavior: scrollBehavior(reducedMotion),
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
    // Above the globe, not over it, so it takes the opaque panel colour and
    // needs no blur. On the popover layer: the search dropdown opens from
    // here over the panels below.
    <div
      className={cn(
        'relative flex shrink-0 items-center gap-1.5 border-b border-atlas-panel-border bg-atlas-panel px-2 py-2 text-atlas-text sm:gap-2 sm:px-3',
        ATLAS_Z.popovers,
      )}
    >
      {/* Walking the trail opens panels; focus stays here while it does
          (layout/usePanelFocus). */}
      <div className="flex shrink-0 items-center gap-1" data-atlas-keep-focus>
        <AtlasIconButton
          aria-label="Back"
          disabled={!trail.canBack}
          onClick={trail.back}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </AtlasIconButton>
        <AtlasIconButton
          aria-label="Forward"
          disabled={!trail.canForward}
          onClick={trail.forward}
        >
          <ChevronRight aria-hidden className="size-4" />
        </AtlasIconButton>
      </div>

      <AtlasSearchBar />

      <nav
        ref={scrollerRef}
        aria-label="Your path through the globe"
        // Hidden on phones, where the search field needs the width; Back and
        // Forward still walk it.
        className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:thin] sm:flex"
        data-atlas-keep-focus
      >
        {trail.entries.length > 1 && earlier > 0 && (
          <AtlasPillButton
            size="sm"
            title="Show the earlier steps of your path"
            onClick={() => setShowAll('earlier')}
          >
            +{earlier} earlier
          </AtlasPillButton>
        )}
        {trail.entries.length > 1 &&
          visible.map((entry, v) => {
            const i = shownRange.start + v;
            return (
              <div key={entry.idx} className="flex shrink-0 items-center gap-1">
                {v > 0 && (
                  <ChevronRight
                    aria-hidden
                    className="size-3 shrink-0 text-atlas-text-3"
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
          <AtlasPillButton
            size="sm"
            title="Show the later steps of your path"
            onClick={() => setShowAll('later')}
          >
            +{later} later
          </AtlasPillButton>
        )}
      </nav>

      {trail.entries.length > 1 && (
        <AtlasPillButton
          className="hidden sm:inline-flex"
          size="sm"
          title="Start a fresh trail from here"
          onClick={trail.clear}
        >
          Clear
        </AtlasPillButton>
      )}

      <AtlasPillButton
        // The label hides on phones, so the name cannot rest on it.
        aria-label="Copy link"
        size="sm"
        title="Copy a link to exactly this view — for a lesson, a presentation, or a bookmark"
        onClick={copyLink}
      >
        {copied ? (
          <Check aria-hidden className="size-3.5 text-emerald-400" />
        ) : (
          <Link2 aria-hidden className="size-3.5" />
        )}
        <span aria-hidden className="hidden sm:inline">
          {copied ? 'Link copied' : 'Copy link'}
        </span>
      </AtlasPillButton>
      {/* Said once, politely, whatever the screen width. */}
      <span aria-live="polite" className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </span>
    </div>
  );
}
