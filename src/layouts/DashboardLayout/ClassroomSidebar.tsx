import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { Logo } from '@/components/Logo';
import { BetaHelp } from '@/components/ui/beta-help';
import { cn } from '@/components/utilities';
import {   ConnectRoutes, GameRoutes, LearnRoutes, LibraryRoutes, ProfileRoutes, StudioRoutes } from '@/constants/routes';
import { SidebarMainNavItem } from './SidebarMainNavItem';
import { SidebarSecondaryNavItem } from './SidebarSecondaryNavItem';
import { UserWidget } from './UserWidget';
import { BookOpen, Gamepad2, Home, Library, Music, Users } from 'lucide-react';
interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  onToggleCollapse,
  view,
  ids
}: SidebarProps) => {

  switch(view){
    default:
      ids;
  }

  return (
    <aside
      className={cn(
        'relative flex h-full animate-fade-in-bottom flex-col space-y-4',
        className,
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col space-y-4 p-6 text-gray-800">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center">
            <Logo className={cn('relative transition-all')} />
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
                      icon={Library}
                      isCollapsed={isCollapsed}
                      label="Library"
                      to={LibraryRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={Gamepad2}
                      isCollapsed={isCollapsed}
                      label="Arcade"
                      to={GameRoutes.root()}
                    />
          <SidebarMainNavItem
                      icon={Users}
                      isCollapsed={isCollapsed}
                      label="Connect"
                      to={ConnectRoutes.root()}
                    />
        </ul>
        

        {!isCollapsed && (
                  <>
                    <ul className="flex flex-col space-y-1 text-sm">
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
                  </>
                )}


        <UserWidget className="z-0 mt-2" isCollapsed={isCollapsed} />

        {!isCollapsed && <BetaHelp />}
      </div>
    </aside>
  );
};
