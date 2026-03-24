import { CircleHelp, Ratio, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { CreditsBadge } from '@/components/CreditsBadge';
import { Logo } from '@/components/Logo';
import { BetaHelp } from '@/components/ui/beta-help';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { ClassroomSwitcher } from '@/features/teacher/components/ClassroomSwitcher';
import { SidebarMainNavItem } from './SidebarMainNavItem';
import { SidebarSecondaryNavItem } from './SidebarSecondaryNavItem';
import { UserWidget } from './UserWidget';
interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const Sidebar = ({
  className,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) => {
  const { role } = useAuthContext();
  const [helpOpen, setHelpOpen] = useState(false);

  const renderNavigation = () => {
    // Admin navigation
    if (role === 'admin') {
      return (
        <ul className="flex flex-1 flex-col gap-y-1 pt-4">
          <SidebarMainNavItem
            icon={Users}
            isCollapsed={isCollapsed}
            label="Users"
            to={AdminRoutes.users()}
          />
          <SidebarMainNavItem
            icon={Shield}
            isCollapsed={isCollapsed}
            label="Free Access"
            to={AdminRoutes.freeAccess()}
          />
        </ul>
      );
    }

    // Default navigation or teacher without classroom
    return (
      <ul className="flex flex-1 flex-col space-y-1">
        <SidebarMainNavItem
          icon={Ratio}
          isCollapsed={isCollapsed}
          label="Overview"
          to={AdminRoutes.root()}
        />
      </ul>
    );
  };

  return (
    <aside
      className={cn(
        'relative flex h-full animate-fade-in-bottom flex-col space-y-4 bg-black/20 backdrop-blur-2xl border-r border-white/[0.08]',
        className,
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col space-y-4 p-6 text-gray-800">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Logo className={cn('relative transition-all')} />
            {/* {!isCollapsed && (
              <span className="text-xl font-semibold text-white transition-all">
                Music Atlas
              </span>
            )} */}
          </div>

          <div className="group pointer-events-none absolute -top-8 right-[-4.5rem] p-8">
            <button
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 opacity-0 transition-all duration-200 hover:bg-gray-200 group-hover:opacity-100"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <HiChevronRight /> : <HiChevronLeft />}
            </button>
          </div>
        </div>

        {/* Classroom switcher for teachers */}
        {role === 'teacher' && !isCollapsed && (
          <div className="mb-4">
            <ClassroomSwitcher />
          </div>
        )}

        {renderNavigation()}

        {/* Help / Info toggle */}
        <div>
          <button
            aria-label={helpOpen ? 'Hide help links' : 'Show help links'}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-foreground/60 transition-colors hover:text-white',
              helpOpen && 'text-white',
              isCollapsed && 'justify-center',
            )}
            onClick={() => setHelpOpen(!helpOpen)}
          >
            <CircleHelp className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="text-sm">Help & Info</span>}
          </button>

          {helpOpen && (
            <ul
              className={cn(
                'flex flex-col space-y-1 text-sm',
                !isCollapsed && 'mt-1 pl-3',
              )}
            >
              <SidebarSecondaryNavItem
                external
                label="Changelog"
                to="https://www.musicatlas.io/policies/change-log"
              />
              <SidebarSecondaryNavItem
                external
                label="Support"
                to="mailto:aaron@musicatlas.io"
              />
              <SidebarSecondaryNavItem
                external
                label="Licensing"
                to="https://www.musicatlas.io/policies/licensing"
              />
              <SidebarSecondaryNavItem
                external
                label="Privacy Policy"
                to="https://www.musicatlas.io/policies/privacy"
              />
              <SidebarSecondaryNavItem
                external
                label="Terms of Use"
                to="https://www.musicatlas.io/policies/terms"
              />
            </ul>
          )}
        </div>

        <CreditsBadge isCollapsed={isCollapsed} />

        <UserWidget className="z-0 mt-2" isCollapsed={isCollapsed} />

        {!isCollapsed && <BetaHelp />}
      </div>
    </aside>
  );
};
