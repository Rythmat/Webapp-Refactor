import { CircleHelp, Home, Laptop, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { cn } from '@/components/utilities';
import {
  AtlasRoutes,
  ClassroomRoutes,
  CurriculumRoutes,
  GameRoutes,
  LearnRoutes,
  ProfileRoutes,
  SettingsRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { SidebarMainNavItem } from './SidebarMainNavItem';

interface SidebarProps {
  className?: string;
}

/**
 * Persistent left-rail sidebar for the classroom dashboard.
 * Always renders in the collapsed (icon-only) state — no expand affordance.
 */
export const ClassroomSidebar = ({ className }: SidebarProps) => {
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
            to={ProfileRoutes.root()}
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
            to={ProfileRoutes.root()}
            isCollapsed
          />
          <SidebarMainNavItem
            iconSrc="/icons/learn-icon.svg"
            label="Learn"
            to={LearnRoutes.root()}
            isCollapsed
          />
          <SidebarMainNavItem
            iconSrc="/icons/studio-icon.svg"
            label="Studio"
            to={StudioRoutes.root()}
            isCollapsed
          />
          <SidebarMainNavItem
            iconSrc="/icons/globe-icon.svg"
            label="Globe"
            to={AtlasRoutes.root()}
            isCollapsed
            glyphClassName="h-6 w-6"
          />
          <SidebarMainNavItem
            iconSrc="/icons/arcade-icon.svg"
            label="Arcade"
            to={GameRoutes.root()}
            isCollapsed
            glyphClassName="h-6 w-6"
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
            to={CurriculumRoutes.root()}
            isCollapsed
          />
          <SidebarMainNavItem
            icon={Laptop}
            label="Classroom"
            to={ClassroomRoutes.root()}
            isCollapsed
          />
        </ul>

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
            to={SettingsRoutes.root()}
            variant="dim"
            isCollapsed
          />
        </ul>
      </div>
    </aside>
  );
};
