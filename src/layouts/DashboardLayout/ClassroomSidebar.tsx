import {
  BookOpen,
  CircleHelp,
  Earth,
  FileText,
  Gamepad2,
  Home,
  LifeBuoy,
  Music,
  Scale,
  ScrollText,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { CreditsBadge } from '@/components/CreditsBadge';
import { Logo } from '@/components/Logo';
import { BetaHelp } from '@/components/ui/beta-help';
import { cn } from '@/components/utilities';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  ProfileRoutes,
  StudioRoutes,
} from '@/constants/routes';
// import { ConnectRoutes, LibraryRoutes } from '@/constants/routes';
import { SidebarMainNavItem } from './SidebarMainNavItem';
import { SidebarSecondaryNavItem } from './SidebarSecondaryNavItem';
import { UserWidget } from './UserWidget';
// import { Library, Users } from 'lucide-react';
interface SidebarProps {
  isCollapsed?: boolean;
  className?: string;
  view?: 'home' | 'collection' | 'lesson';
  ids?: {
    classroomId?: string;
    collectionId?: string;
    lessonId?: string;
  };
}

export const ClassroomSidebar = ({
  className,
  isCollapsed = false,
  view,
  ids,
}: SidebarProps) => {
  const [helpOpen, setHelpOpen] = useState(false);

  if (view === 'collection' || view === 'lesson') {
    ids;
  }

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
          <div className="flex items-center justify-center">
            <Logo className={cn('relative transition-all')} />
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-y-1 pt-4">
          <SidebarMainNavItem
            icon={Home}
            isCollapsed={isCollapsed}
            label="Home"
            to={ProfileRoutes.root()}
          />
          <SidebarMainNavItem
            icon={BookOpen}
            isCollapsed={isCollapsed}
            label="Learn"
            to={LearnRoutes.root()}
          />
          <SidebarMainNavItem
            icon={Music}
            isCollapsed={isCollapsed}
            label="Studio"
            to={StudioRoutes.root()}
          />
          <SidebarMainNavItem
            icon={Earth}
            isCollapsed={isCollapsed}
            label="Globe"
            to={AtlasRoutes.root()}
          />
          {/* <SidebarMainNavItem
                      icon={Library}
                      isCollapsed={isCollapsed}
                      label="Library"
                      to={LibraryRoutes.root()}
                    /> */}
          <SidebarMainNavItem
            icon={Gamepad2}
            isCollapsed={isCollapsed}
            label="Arcade"
            to={GameRoutes.root()}
          />
          {/* <SidebarMainNavItem
                      icon={Users}
                      isCollapsed={isCollapsed}
                      label="Connect"
                      to={ConnectRoutes.root()}
                    /> */}
        </ul>

        {/* Help / Info toggle */}
        <div className="border-t border-white/[0.06] pt-4">
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
                !isCollapsed && 'mt-1',
              )}
            >
              <SidebarSecondaryNavItem
                external
                icon={ScrollText}
                isCollapsed={isCollapsed}
                label="Changelog"
                to="https://www.musicatlas.io/policies/change-log"
              />
              <SidebarSecondaryNavItem
                external
                icon={LifeBuoy}
                isCollapsed={isCollapsed}
                label="Support"
                to="mailto:aaron@musicatlas.io"
              />
              <SidebarSecondaryNavItem
                external
                icon={Scale}
                isCollapsed={isCollapsed}
                label="Licensing"
                to="https://www.musicatlas.io/policies/licensing"
              />
              <SidebarSecondaryNavItem
                external
                icon={Shield}
                isCollapsed={isCollapsed}
                label="Privacy Policy"
                to="https://www.musicatlas.io/policies/privacy"
              />
              <SidebarSecondaryNavItem
                external
                icon={FileText}
                isCollapsed={isCollapsed}
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
