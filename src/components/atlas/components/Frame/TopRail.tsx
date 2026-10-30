import {
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  Search,
  Share2,
} from 'lucide-react';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import { TrailPopover } from '@/components/atlas/components/UI/TrailPopover';
import {
  ATLAS_FOCUS,
  ATLAS_PILL_ZONE,
  ATLAS_TRANSITION,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { useAtlasStopSelector } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasTrail } from '@/components/atlas/navigation/useAtlasTrail';
import { ProfileRoutes } from '@/constants/routes';
import { cn } from '@/lib/utils';

// The command palette, fetched the first time someone reaches for it (or
// hovers the search pill), so cmdk is not in the page's first download.
const loadPalette = () => import('../UI/AtlasCommandPalette');
const AtlasCommandPalette = lazy(loadPalette);

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The search pill, centred in the rail as the Studio's prompt: it looks like
 * the prompt box's field, so nobody has to know the shortcut to find search,
 * and says the shortcut, so they learn it. It opens the command palette.
 * While a search's results are up it shows that search.
 */
function SearchPill({
  buttonRef,
  committed,
  onOpen,
}: {
  buttonRef: RefObject<HTMLButtonElement>;
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
        'flex h-9 w-full min-w-0 items-center gap-2.5 rounded-full border border-white/10 bg-atlas-pill pl-3 pr-1.5 text-left text-[0.8125rem] [box-shadow:var(--daw-shadow-float)] hover:border-white/20',
        ATLAS_TRANSITION,
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
          committed ? 'text-atlas-text' : 'text-atlas-pill-text',
        )}
      >
        {committed ?? 'Search artists, places, songs…'}
      </span>
      <kbd className="hidden h-6 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.06] px-2 text-xs text-atlas-pill-text md:inline-flex">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

/**
 * The Globe's top rail, as the Studio's (owner, 2026-10-29): 44 px, its
 * controls in pills on the page. At the left, Back / Forward, with Home
 * before them on screens too narrow for the app's sidebar; centred, search
 * (the command palette); at the right, the path walked this visit and Share, a link to
 * exactly this view.
 *
 * Every step of the path is a real history entry with its own URL, so the
 * path, these arrows and the browser's Back button all walk the same way —
 * and a teacher can copy any step straight into a lesson.
 */
export function TopRail() {
  const trail = useAtlasTrail();
  const isPhone = useIsPhone();
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
    // comes to the search pill, so a panel the palette opens can take it.
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
    <div
      className="grid h-11 items-center gap-x-2 px-2"
      data-testid="globe-top-rail"
      style={{
        gridTemplateColumns:
          'minmax(max-content, 1fr) minmax(0, 30rem) minmax(max-content, 1fr)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Only where the app's sidebar is not (below `md`, its own
            breakpoint): there it is the one way out of the Globe. */}
        <Link
          aria-label="Home"
          className={cn(
            'inline-flex h-9 shrink-0 items-center rounded-full bg-atlas-pill px-3 text-atlas-text hover:bg-white/[0.06] md:hidden',
            ATLAS_TRANSITION,
            ATLAS_FOCUS,
          )}
          title="Back to Home"
          to={ProfileRoutes.root()}
        >
          <House aria-hidden className="size-4" />
        </Link>
        {/* Walking the path opens panels; focus stays here while it does
            (layout/usePanelFocus). */}
        <div
          aria-label="Back and forward"
          className={ATLAS_PILL_ZONE}
          data-atlas-keep-focus
          role="group"
        >
          <AtlasIconButton
            aria-label="Back"
            disabled={!trail.canBack}
            variant="pill"
            onClick={trail.back}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </AtlasIconButton>
          {!isPhone && (
            <AtlasIconButton
              aria-label="Forward"
              disabled={!trail.canForward}
              variant="pill"
              onClick={trail.forward}
            >
              <ChevronRight aria-hidden className="size-4" />
            </AtlasIconButton>
          )}
        </div>
      </div>

      <div className="flex min-w-0 justify-center">
        <SearchPill
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
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        {!isPhone && <TrailPopover trail={trail} />}
        <AtlasPillButton
          // The word hides on narrow screens, so the name cannot rest on it.
          aria-label="Share"
          title="Copy a link to exactly this view — for a lesson, a presentation, or a bookmark"
          variant="pill"
          onClick={copyLink}
        >
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Share2 aria-hidden className="size-4" />
          )}
          <span aria-hidden className="hidden md:inline">
            {copied ? 'Copied' : 'Share'}
          </span>
        </AtlasPillButton>
        {/* Said once, politely, whatever the screen width. */}
        <span aria-live="polite" className="sr-only" role="status">
          {copied ? 'Link copied' : ''}
        </span>
      </div>
    </div>
  );
}
