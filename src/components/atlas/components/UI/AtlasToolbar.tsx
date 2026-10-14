import { Check, ChevronLeft, ChevronRight, Link2, Search } from 'lucide-react';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AtlasSectionTabs } from '@/components/atlas/components/UI/AtlasSectionTabs';
import { TrailPopover } from '@/components/atlas/components/UI/TrailPopover';
import { ViewSwitch } from '@/components/atlas/components/UI/ViewSwitch';
import {
  ATLAS_FOCUS,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasStopSelector } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasTrail } from '@/components/atlas/navigation/useAtlasTrail';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';

// The command palette, fetched the first time someone reaches for it (or
// hovers the search button), so cmdk is not in the page's first download.
const loadPalette = () => import('./AtlasCommandPalette');
const AtlasCommandPalette = lazy(loadPalette);

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

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
        // A field from xl up; below, the section tabs need the room and it
        // is a round button (the shortcut still works).
        'flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] text-left text-sm transition-colors hover:border-white/25 hover:bg-white/[0.08] xl:w-60 xl:justify-start xl:pl-3 xl:pr-2',
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
          'hidden min-w-0 flex-1 truncate xl:inline',
          committed ? 'text-atlas-text' : 'text-atlas-text-2',
        )}
      >
        {committed ?? 'Search artists, places, songs…'}
      </span>
      <kbd className="hidden shrink-0 rounded-full border border-white/15 px-2 py-0.5 font-sans text-xs text-atlas-text-2 xl:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

/**
 * The Globe's header: Back / Forward, the five sections (AtlasSectionTabs),
 * search (the command palette), the trail of everywhere this session has
 * been, a button to copy a link to exactly this view, and the switch between
 * the globe and the timeline.
 *
 * Every step in the trail is a real history entry with its own URL, so the
 * trail, these arrows, and the browser's Back button all walk the same path —
 * and a teacher can copy any step straight into a lesson.
 */
export function AtlasToolbar() {
  const trail = useAtlasTrail();
  const [copied, setCopied] = useState(false);

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

      <AtlasSectionTabs />

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

      <div className="hidden sm:contents">
        <TrailPopover trail={trail} />
      </div>

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
        <span aria-hidden className="hidden 2xl:inline">
          {copied ? 'Link copied' : 'Copy link'}
        </span>
      </AtlasPillButton>
      <ViewSwitch />
      {/* Said once, politely, whatever the screen width. */}
      <span aria-live="polite" className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </span>
    </div>
  );
}
