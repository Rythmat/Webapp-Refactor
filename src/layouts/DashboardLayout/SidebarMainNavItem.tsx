import type { LucideIcon } from 'lucide-react';
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
  /** Lucide component icon; ignored when `iconSrc` is set. */
  icon?: LucideIcon;
  /** Path to an SVG/PNG (e.g. `/icons/learn-icon.svg`). Takes precedence over `icon`. */
  iconSrc?: string;
  label: string;
  /** 'dim' fades the row (used for the sidebar's system group). */
  variant?: 'default' | 'dim';
  /** Wrap the icon in a subtle bordered chip (used for Search per the reference). */
  chip?: boolean;
  /** Renders as an <a> instead of a <NavLink> — used for mailto:/https: targets. */
  external?: boolean;
  comingSoon?: boolean;
  /** Reserved for the legacy admin sidebar; when true the item hides its label. */
  isCollapsed?: boolean;
  /** Override the auto-computed icon glyph size (Tailwind classes, e.g. 'h-6 w-6'). */
  glyphClassName?: string;
};

const isRouteActive = (currentPath: string, targetPath: string) => {
  if (targetPath === '/') return currentPath === '/';
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
};

export function SidebarMainNavItem(props: NavItemProps) {
  const location = useLocation();
  const active = !props.external && isRouteActive(location.pathname, props.to);
  const Icon = props.icon;
  const dim = props.variant === 'dim';

  const glyphSizeClass =
    props.glyphClassName ??
    (props.chip
      ? props.isCollapsed
        ? 'h-4 w-4'
        : 'h-4 w-4 md:h-5 md:w-5'
      : props.isCollapsed
        ? 'h-5 w-5'
        : 'h-5 w-5 md:h-6 md:w-6');

  const glyph = props.iconSrc ? (
    <img
      src={props.iconSrc}
      alt=""
      draggable={false}
      className={glyphSizeClass}
    />
  ) : Icon ? (
    <Icon className={glyphSizeClass} />
  ) : null;

  const iconEl = props.chip ? (
    <span
      className={cn(
        'flex items-center justify-center rounded-md border border-white/15',
        props.isCollapsed ? 'size-7' : 'size-7 md:size-8',
      )}
    >
      {glyph}
    </span>
  ) : (
    <span
      className={cn(
        'flex items-center justify-center',
        props.isCollapsed ? 'size-7' : 'size-6 md:size-7',
      )}
    >
      {glyph}
    </span>
  );

  const rowClasses = cn(
    'group flex items-center gap-3 rounded-md py-2.5 outline-none transition-colors md:gap-4',
    props.isCollapsed ? 'px-0' : 'px-3',
    'focus-visible:ring-2 focus-visible:ring-white/40',
    active ? 'bg-white/5 text-white' : dim ? 'text-white/60' : 'text-white/85',
    !active && (dim ? 'hover:text-white/85' : 'hover:text-white'),
    !active && 'hover:bg-white/5',
    props.comingSoon && 'pointer-events-none opacity-60',
    props.isCollapsed && 'justify-center',
  );

  const labelEl = !props.isCollapsed && (
    <span className="truncate text-[15px] font-medium md:text-base">
      {props.label}
    </span>
  );

  const link = props.external ? (
    <a
      className={rowClasses}
      href={props.to}
      rel="noreferrer"
      target={props.to.startsWith('mailto:') ? undefined : '_blank'}
    >
      {iconEl}
      {labelEl}
    </a>
  ) : (
    <NavLink className={rowClasses} to={props.to}>
      {iconEl}
      {labelEl}
    </NavLink>
  );

  return (
    <li>
      {props.isCollapsed ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="border border-white/10 bg-black/90 text-sm text-white backdrop-blur"
            >
              {props.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        link
      )}
    </li>
  );
}
