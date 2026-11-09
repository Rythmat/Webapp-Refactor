import { ChevronRight, GraduationCap, House, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { OfficeRoutes, ProfileRoutes } from '@/constants/routes';
import { AvatarMenu } from '@/daw/shell/topbar/AvatarMenu';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { PracticeBadge } from '../ui/PracticeBadge';
import { ClassSwitcher } from './ClassSwitcher';
import { GoLiveMenu } from './GoLiveMenu';
import type { OfficeNav } from './officeNav';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The top rail, as the Studio's and the Globe's: where the teacher is (the
 * Office, then the class as a switcher) on the left; search in the middle,
 * looking like a field so nobody needs the shortcut to find it; and on the
 * right the device badge, the class's Go Live, and the account.
 */
export const OfficeTopRail = ({
  nav,
  onSearch,
  className,
  style,
}: {
  nav: OfficeNav;
  onSearch: () => void;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <header
    className={cn(
      'grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 max-sm:grid-cols-[minmax(0,1fr)_auto_auto] max-sm:gap-1',
      className,
    )}
    style={style}
  >
    <div className="flex min-w-0 items-center gap-1">
      {/* A phone has no app rail: the way home is here. */}
      <Link
        to={ProfileRoutes.root()}
        aria-label="Home"
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-daw-text-2 hover:bg-daw-hover hover:text-daw-text md:hidden',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <House aria-hidden className="size-4" />
      </Link>
      <Link
        to={OfficeRoutes.root()}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[0.8125rem] font-bold text-daw-text hover:bg-daw-hover',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <GraduationCap aria-hidden className="size-4" />
        <span
          className={nav.scope === 'class' ? 'hidden sm:inline' : undefined}
        >
          Office
        </span>
      </Link>
      {nav.scope === 'class' && (
        <>
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 text-daw-text-3"
          />
          <ClassSwitcher classroomId={nav.classroomId} />
        </>
      )}
    </div>

    <button
      type="button"
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      aria-label="Search the Office"
      onClick={onSearch}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-full border border-white/10 bg-daw-pill pl-3 pr-1.5 text-left text-[0.8125rem] text-daw-pill-text hover:border-white/20 sm:w-[clamp(14rem,30vw,26rem)]',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0 text-daw-text-2" />
      <span className="hidden min-w-0 flex-1 truncate sm:inline">
        Search classes, lessons, pages
      </span>
      <kbd className="hidden h-6 items-center rounded-full bg-white/[0.06] px-2 font-sans text-[0.6875rem] text-daw-text-3 sm:inline-flex">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>

    <div className="flex min-w-0 items-center justify-end gap-2">
      <PracticeBadge />
      {nav.scope === 'class' && <GoLiveMenu classroomId={nav.classroomId} />}
      <AvatarMenu />
    </div>
  </header>
);
