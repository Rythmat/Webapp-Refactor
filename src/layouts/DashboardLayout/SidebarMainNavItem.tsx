import type { LucideIcon } from 'lucide-react';
import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';

export type NavItemProps = {
  to: string;
  icon: LucideIcon;
  label: string;
  comingSoon?: boolean;
  isCollapsed?: boolean;
};

export function SidebarMainNavItem(props: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(props.to);
  const [isHovered, setIsHovered] = React.useState(false);

  const Icon = props.icon;

  return (
    <li className={cn('rounded-[10px]', isActive && 'bg-white/10')}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              className={cn(
                'flex items-center rounded-md text-foreground/80 hover:font-semibold hover:text-white whitespace-nowrap overflow-hidden justify-center py-2',
                {
                  'text-white': isActive,
                  'pointer-events-none opacity-60': props.comingSoon,
                },
              )}
              to={props.to}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span className="flex size-6 items-center justify-center">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive || isHovered ? 'text-white' : 'text-foreground/60',
                  )}
                />
              </span>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={8}
            className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] text-white shadow-2xl"
          >
            {props.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </li>
  );
}
