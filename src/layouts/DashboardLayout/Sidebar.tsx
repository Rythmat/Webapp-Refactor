import { Activity, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CortexIcon } from '@/components/icons/CortexIcon';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { isConsoleAdmin, isConsoleRole } from '@/features/admin/consoleRoles';
import { toConsolePath } from '@/features/admin/content/mirror/mirrorPaths';
import { useConsoleAppPath } from '@/features/admin/content/mirror/useConsoleAppPath';
// Which pages are Cortex's (tiny and eager-safe, eagerBoundary.test.ts).
import { isCortexSectionPath } from '@/features/admin/table/tablePaths';
import { ClassroomSidebar } from './ClassroomSidebar';
import { isRouteActive, SidebarMainNavItem } from './SidebarMainNavItem';
import { UserWidget } from './UserWidget';
import '@/components/ClassroomLayout/dashboard/dashboard.css';

interface SidebarProps {
  className?: string;
}

/**
 * The console's sidebar is the app's own sidebar (owner, 29 Sep 2026: "the
 * admin console to mirror the app, with the addition of … Users and
 * Telemetry").
 *
 * Every app item opens the console's copy of that page, and is highlighted
 * when that section is showing — including on a kind's table, which belongs
 * to the section the kind lives in. Office shows for every console role: in
 * the console it is the curriculum Music Atlas ships.
 *
 * Below a divider sit the console's own sections. Cortex is for every
 * console role: the Atlas as a graph, its default view, and as tables (the
 * owner renamed the old "Table" item Cortex on 1 Oct 2026). It is lit on the
 * graph's pages and on every table, and alone: it is not an app page, so no
 * app item lights up there. Admins also get Users and Telemetry; editors
 * never do (AdminPages enforces the same for typed URLs).
 */
export const Sidebar = ({ className }: SidebarProps) => {
  const { role } = useAuthContext();
  const { pathname } = useLocation();
  const activeAppPath = useConsoleAppPath();

  const consoleSection = isConsoleRole(role) && (
    <>
      <hr
        className="mx-2 mt-6 border-0 border-t border-white/15"
        role="separator"
      />
      <ul className="mt-6 flex flex-col gap-1">
        <SidebarMainNavItem
          icon={CortexIcon}
          label="Cortex"
          to={AdminRoutes.cortex()}
          active={isCortexSectionPath(pathname)}
          isCollapsed
          glyphClassName="h-5 w-5"
        />
        {isConsoleAdmin(role) && (
          <>
            <SidebarMainNavItem
              icon={Users}
              label="Users"
              to={AdminRoutes.users()}
              active={isRouteActive(pathname, AdminRoutes.users())}
              isCollapsed
              glyphClassName="h-5 w-5"
            />
            <SidebarMainNavItem
              icon={Activity}
              label="Telemetry"
              to={AdminRoutes.telemetry()}
              active={isRouteActive(pathname, AdminRoutes.telemetry())}
              isCollapsed
              glyphClassName="h-5 w-5"
            />
          </>
        )}
      </ul>
    </>
  );

  return (
    // The app's sidebar reads its tokens from `.dashboard-root`.
    <div className={cn('dashboard-root flex h-full', className)}>
      <ClassroomSidebar
        className="flex-shrink-0"
        lens={{ hrefFor: toConsolePath, activeAppPath }}
        showAllSections
        extraSection={consoleSection}
        footer={
          <div className="flex justify-center pt-2">
            <UserWidget isCollapsed />
          </div>
        }
      />
    </div>
  );
};
