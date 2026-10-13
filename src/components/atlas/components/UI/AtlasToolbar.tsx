import { Check, ChevronLeft, ChevronRight, Link2, Search } from 'lucide-react';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useAtlasStopSelector } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasTrail,
  type TrailEntry,
} from '@/components/atlas/navigation/useAtlasTrail';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';

// The command palette, fetched the first time someone reaches for it (or
// hovers the search button), so cmdk is not in the page's first download.
const loadPalette = () => import('./AtlasCommandPalette');
const AtlasCommandPalette = lazy(loadPalette);

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

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
 * The search button: looks like a field, so nobody has to know the shortcut
 * to find search, and says the shortcut, so they learn it. It opens the
 * command palette. While a search's results are up it shows that search.
 */
function SearchButton({
  buttonRef,
  committed,
  onOpen,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  committed: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      aria-label={
        committed ? `Search the globe (now: ${committed})` : 'Search the globe'
      }
      className={cn(
        'flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] pl-3 pr-2 text-left text-sm transition-colors hover:border-white/25 hover:bg-white/[0.08] sm:max-w-xs',
        ATLAS_FOCUS,
      )}
      type="button"
      onClick={onOpen}
      onFocus={() => void loadPalette()}
      onPointerEnter={() => void loadPalette()}
    >
      <Search aria-hidden className="size-4 shrink-0 text-atlas-text-2" />
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          committed ? 'text-atlas-text' : 'text-atlas-text-2',
        )}
      >
        {committed ?? 'Search artists, places, songs…'}
      </span>
      <kbd className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 font-sans text-xs text-atlas-text-2">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

/**
 * The strip across the top of the globe, laid out like a browser's chrome:
 * Back / Forward, search (the command palette), the trail of everywhere this
 * session has been, and a button to copy a link to exactly this view.
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

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission). The URL
      // bar holds the same link, so point there instead of failing silently.
      window.prompt('Copy this link:', window.location.href);
    }
  }, []);

  // The command palette: mounted on first use and kept, so it closes (and
  // hands focus back) like any dialog.
  const searchRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteUsed, setPaletteUsed] = useState(false);
  const committed = useAtlasStopSelector((stop) =>
    stop.kind === 'search' ? stop.query : null,
  );
  const openPalette = useCallback(() => {
    // Focus goes back where it was; from nowhere (the globe, the page) it
    // comes to the search button, so a panel the palette opens can take it.
    const active = document.activeElement as HTMLElement | null;
    openerRef.current =
      active && active !== document.body ? active : searchRef.current;
    setPaletteUsed(true);
    setPaletteOpen(true);
  }, []);

  // ⌘K / Ctrl+K from anywhere on the globe opens it, and closes it again.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
      if (e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (paletteOpen) setPaletteOpen(false);
      else openPalette();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, openPalette]);

  return (
    // Above the globe, not over it, so it takes the opaque panel colour and
    // needs no blur. On the popover layer, over the panels below it.
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

      <SearchButton
        buttonRef={searchRef}
        committed={committed}
        onOpen={openPalette}
      />
      {paletteUsed && (
        <Suspense fallback={null}>
          <AtlasCommandPalette
            initialQuery={committed ?? ''}
            open={paletteOpen}
            opener={openerRef}
            trail={trail}
            onCopyLink={copyLink}
            onOpenChange={setPaletteOpen}
          />
        </Suspense>
      )}

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
