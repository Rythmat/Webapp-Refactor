import {
  CircleHelp,
  GraduationCap,
  Home,
  Laptop,
  Search,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';
import {
  AtlasRoutes,
  ClassroomRoutes,
  GameRoutes,
  LearnRoutes,
  OfficeRoutes,
  ProfileRoutes,
  SearchRoutes,
  SettingsRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
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

/**
 * Persistent left-rail sidebar for the classroom dashboard.
 * Always renders in the collapsed (icon-only) state — no expand affordance.
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
        'relative flex h-full w-[72px] flex-col bg-[#101012] text-white',
        'border-r border-white/[0.06]',
        className,
      )}
    >
      <div className="flex flex-1 flex-col p-2">
        {/* 1. Logo */}
        <div className="flex items-center justify-center py-2">
          <Link
            to={nav(ProfileRoutes.root()).to}
            aria-label="Music Atlas home"
            className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Logo className="size-8" />
          </Link>
        </div>

        {/* 2. Primary nav */}
        <ul className="mt-2 flex flex-col gap-1">
          <SidebarMainNavItem
            icon={Home}
            label="Home"
            {...nav(ProfileRoutes.root())}
            isCollapsed
            glyphClassName="h-[23px] w-[23px]"
          />
          <SidebarMainNavItem
            iconSrc="/icons/learn-icon.svg"
            label="Learn"
            {...nav(LearnRoutes.root())}
            isCollapsed
            glyphClassName="h-7 w-7"
          />
          <SidebarMainNavItem
            iconSrc="/icons/studio-icon.svg"
            label="Studio"
            {...nav(StudioRoutes.root())}
            isCollapsed
            glyphClassName="h-7 w-7"
          />
          <SidebarMainNavItem
            iconSrc="/icons/globe-icon.svg"
            label="Globe"
            {...nav(AtlasRoutes.root())}
            isCollapsed
            glyphClassName="h-7 w-7"
          />
          <SidebarMainNavItem
            iconSrc="/icons/arcade-icon.svg"
            label="Arcade"
            {...nav(GameRoutes.root())}
            isCollapsed
            glyphClassName="h-7 w-7"
          />
        </ul>

        {/* Divider between primary nav and secondary nav */}
        <hr
          className="mx-2 mt-6 border-0 border-t border-white/15"
          role="separator"
        />

        {/* 3. Secondary nav */}
        <ul className="mt-6 flex flex-col gap-1">
          <SidebarMainNavItem
            chip
            icon={Search}
            label="Search"
            {...nav(SearchRoutes.root())}
            isCollapsed
            glyphClassName="h-5 w-5"
          />
          <SidebarMainNavItem
            icon={Laptop}
            label="Classroom"
            {...nav(ClassroomRoutes.root())}
            isCollapsed
            glyphClassName="h-7 w-7"
          />
          {canManage && (
            <SidebarMainNavItem
              icon={GraduationCap}
              label="Office"
              {...nav(OfficeRoutes.root(), [OfficeRoutes.root()])}
              isCollapsed
              glyphClassName="h-6 w-6"
            />
          )}
        </ul>

        {extraSection}

        {/* 4. Flex spacer + system nav */}
        <ul className="mt-auto flex flex-col gap-1 pt-6">
          <SidebarMainNavItem
            external
            icon={CircleHelp}
            label="Support"
            to="mailto:aaron@musicatlas.io"
            variant="dim"
            isCollapsed
          />
          <SidebarMainNavItem
            icon={Settings}
            label="System"
            {...nav(SettingsRoutes.root())}
            variant="dim"
            isCollapsed
          />
        </ul>
        {footer}
      </div>
    </aside>
  );
};
