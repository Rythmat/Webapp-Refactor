import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/components/utilities';

interface IconProps {
  active?: boolean;
}

export type NavItemProps = {
  to: string;
  icon: React.ReactElement<IconProps>;
  label: string;
  comingSoon?: boolean;
  isCollapsed?: boolean;
};

export function SidebarMainNavItem(props: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(props.to);
  const [isHovered, setIsHovered] = React.useState(false);

  // Clone the icon element and add the active prop
  const iconWithActiveState = React.cloneElement(props.icon, {
    active: isActive || isHovered,
  });

  return (
    <li
      className={cn(
        'rounded-[10px]',
        !props.isCollapsed && 'pl-3',
        isActive && 'bg-white/10',
      )}
    >
      <NavLink
        className={cn(
          'flex items-center rounded-md text-foreground/80 hover:font-semibold hover:text-white whitespace-nowrap overflow-hidden',
          props.isCollapsed ? 'justify-center py-2' : 'space-x-3 pr-4 py-2',
          {
            'text-white': isActive,
            'pointer-events-none opacity-60': props.comingSoon,
          },
        )}
        title={props.isCollapsed ? props.label : undefined}
        to={props.to}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className={cn(
            props.isCollapsed ? 'w-6 h-6 flex items-center justify-center' : '',
          )}
        >
          {iconWithActiveState}
        </span>
        {!props.isCollapsed && <span>{props.label}</span>}
        {!props.isCollapsed && props.comingSoon && (
          <div className="ml-2 flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5">
            <span className="text-xs text-zinc-700">Soon</span>
          </div>
        )}
      </NavLink>
    </li>
  );
}
