import {
  CircleHelp,
  GraduationCap,
  Home,
  Laptop,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';
import {
  GlobeRoutes,
  ClassroomRoutes,
  GameRoutes,
  LearnRoutes,
  OfficeRoutes,
  ProfileRoutes,
  SettingsRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useLearnPageRoute } from '@/features/learn/useInstrumentStore';
import { isRouteActive, SidebarMainNavItem } from './SidebarMainNavItem';

interface SidebarProps {
  className?: string;
  /**
   * The console's view of this sidebar. The console shows the app inside
   * /console, so every link points at the console's copy of the page
   * (`hrefFor`), and "current" means the app section showing there
   * (`activeAppPath`, null when none is). The app never passes it.
   */
  lens?: { hrefFor(appPath: string): string; activeAppPath: string | null };
  /** Console only: show Office to every console role, not just teachers. */
  showAllSections?: boolean;
  /** Console only: a section after the secondary nav (Users, Telemetry). */
  extraSection?: ReactNode;
  /** Console only: rendered under the system nav (log out). */
  footer?: ReactNode;
}

/** The rail's width: Suno's collapsed sidebar. */
const RAIL_WIDTH = '4.625rem';

/**
 * Persistent left rail for the classroom dashboard: Suno's collapsed sidebar,
 * 4.625rem of icons with their names in tooltips, the logo centred on top.
 * It stays collapsed (owner, 2026-10-23: no expand button). The layout
 * hides it below `md`, where MobileTabBar carries the same nav.
 */
export const ClassroomSidebar = ({
  className,
  lens,
  showAllSections,
  extraSection,
  footer,
}: SidebarProps) => {
  const { role } = useAuthContext();
  // Teachers only. `ProtectedPage` deliberately keeps console roles (admin,
  // editor) out of the whole student/teacher app and redirects them to
  // /console, so offering an admin an "Office" link only ever produced a
  // bounce. There is no dual admin+teacher account: `UserRole` is scalar.
  // The console shows it to everyone: there Office is the curriculum.
  const canManage = role === 'teacher' || !!showAllSections;
  // Learn opens on the instrument chosen on Home (owner, 2026-10-24), and
  // stays current anywhere under /learn. The console's copy keeps /learn.
  const learnPage = useLearnPageRoute();
  const { pathname } = useLocation();
  /** An item's link: the app path as it is, or the console's copy of it. */
  const nav = (appTo: string, activePaths?: string[]) =>
    lens
      ? {
          to: lens.hrefFor(appTo),
          active:
            lens.activeAppPath !== null &&
            [appTo, ...(activePaths ?? [])].some((p) =>
              isRouteActive(lens.activeAppPath!, p),
            ),
        }
      : { to: appTo, activePaths };
  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col overflow-hidden bg-[#101012] text-white',
        'border-r border-white/[0.06]',
        className,
      )}
      style={{ width: RAIL_WIDTH }}
    >
      {/* 1. The logo, centred over the icons (Suno's 72px row). */}
      <div className="flex h-[4.5rem] shrink-0 items-center justify-center py-4">
        <Link
          to={nav(ProfileRoutes.root()).to}
          aria-label="Music Atlas home"
          className="flex shrink-0 items-center rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Logo className="size-7" />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {/* 2. Primary nav */}
        <ul className="flex flex-col gap-px px-3">
          <SidebarMainNavItem
            icon={Home}
            label="Home"
            {...nav(ProfileRoutes.root())}
          />
          <SidebarMainNavItem
            iconSrc="/icons/learn-icon.svg"
            label="Learn"
            {...(lens
              ? nav(LearnRoutes.root())
              : {
                  to: learnPage,
                  active: isRouteActive(pathname, LearnRoutes.root()),
                })}
          />
          <SidebarMainNavItem
            iconSrc="/icons/studio-icon.svg"
            label="Studio"
            {...nav(StudioRoutes.root())}
          />
          <SidebarMainNavItem
            iconSrc="/icons/globe-icon.svg"
            // Globe and Arcade draw small in their boxes: 24px (owner,
            // 2026-10-25).
            glyphClassName="size-[24px]"
            label="Globe"
            {...nav(GlobeRoutes.root())}
          />
          <SidebarMainNavItem
            iconSrc="/icons/arcade-icon.svg"
            glyphClassName="size-[24px]"
            label="Arcade"
            {...nav(GameRoutes.root())}
          />
          {/* Classroom and Office in the same list, at the same spacing
            (owner, 2026-10-26). */}
          <SidebarMainNavItem
            icon={Laptop}
            label="Classroom"
            {...nav(ClassroomRoutes.root())}
          />
          {canManage && (
            <SidebarMainNavItem
              icon={GraduationCap}
              label="Office"
              {...nav(OfficeRoutes.root(), [OfficeRoutes.root()])}
            />
          )}
        </ul>

        {extraSection}

        {/* 3. Flex spacer + system nav (Suno's bottom group: 40px rows) */}
        <ul className="mt-auto flex flex-col gap-px px-3 pt-6 pb-3">
          <SidebarMainNavItem
            external
            icon={CircleHelp}
            label="Support"
            to="mailto:aaron@musicatlas.io"
            variant="dim"
          />
          <SidebarMainNavItem
            icon={Settings}
            label="System"
            {...nav(SettingsRoutes.root())}
            variant="dim"
          />
        </ul>
        {footer}
      </div>
    </aside>
  );
};
