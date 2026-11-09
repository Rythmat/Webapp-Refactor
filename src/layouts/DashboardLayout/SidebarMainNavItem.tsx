import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';

export type NavItemProps = {
  to: string;
  /** Extra paths (besides `to`) that also mark this item active. */
  activePaths?: string[];
  /** Lucide component icon; ignored when `iconSrc` is set. */
  icon?: LucideIcon;
  /**
   * Path to a one-color SVG (e.g. `/icons/learn-icon.svg`). Takes precedence
   * over `icon`. Drawn as a mask so it takes the row's text color.
   */
  iconSrc?: string;
  label: string;
  /** 'dim' is the sidebar's bottom group: shorter rows, like Suno's. */
  variant?: 'default' | 'dim';
  /** Renders as an <a> instead of a <NavLink> — used for mailto:/https: targets. */
  external?: boolean;
  comingSoon?: boolean;
  /** Icons only (the default: the rail stays collapsed); false shows labels. */
  isCollapsed?: boolean;
  /** Override the icon glyph size (Tailwind classes). */
  glyphClassName?: string;
  /**
   * Whether the item is the current one, decided by the caller rather than by
   * matching `to` against the location. The console sets it: its links point
   * at console paths while the question is which APP section is showing.
   * Unset — as everywhere in the app — the item matches the location itself.
   */
  active?: boolean;
};

/** Suno's sidebar icon size; lucide glyphs fill it edge to edge. */
export const SIDEBAR_GLYPH = 'size-[18px]';
/**
 * The /icons SVGs leave ~20% of their box empty, so they draw 2px larger to
 * sit at the same optical size as the 18px lucide glyphs.
 */
const MASK_GLYPH = 'size-5';
/**
 * The rail draws its glyphs 10% over those sizes (owner, 2026-10-25), in
 * the same 18px slot so the rail and its rows keep their size. The tab bar
 * keeps the plain sizes.
 */
export const RAIL_GLYPH = 'size-[19.8px]';
const RAIL_MASK_GLYPH = 'size-[22px]';

export const isRouteActive = (currentPath: string, targetPath: string) => {
  if (targetPath === '/') return currentPath === '/';
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
};

/**
 * A nav item's icon: a one-color /icons SVG drawn as a mask (so it takes the
 * text color), or a lucide glyph. The sidebar and the mobile tab bar share it.
 */
export function NavGlyph({
  icon: Icon,
  iconSrc,
  className,
}: {
  icon?: LucideIcon;
  iconSrc?: string;
  className?: string;
}) {
  if (iconSrc)
    return (
      <span
        aria-hidden
        className={cn('shrink-0 bg-current', className ?? MASK_GLYPH)}
        style={{
          maskImage: `url(${iconSrc})`,
          WebkitMaskImage: `url(${iconSrc})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
    );
  return Icon ? (
    <Icon className={cn('shrink-0', className ?? SIDEBAR_GLYPH)} />
  ) : null;
}

export function SidebarMainNavItem(props: NavItemProps) {
  const location = useLocation();
  // The rail stays collapsed (icons, names in tooltips) unless told not to.
  const collapsed = props.isCollapsed ?? true;
  const active =
    props.active ??
    (!props.external &&
      (isRouteActive(location.pathname, props.to) ||
        (props.activePaths?.some((p) => isRouteActive(location.pathname, p)) ??
          false)));
  const glyph = (
    <NavGlyph
      icon={props.icon}
      iconSrc={props.iconSrc}
      className={
        props.glyphClassName ?? (props.iconSrc ? RAIL_MASK_GLYPH : RAIL_GLYPH)
      }
    />
  );

  // Suno's rows: a full-width pill, 16px in, the 18px icon then the label 12px
  // after it. The icon never moves when the sidebar collapses; the label just
  // clips away with the width.
  const rowClasses = cn(
    'flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-full px-4 text-sm outline-none transition-colors duration-75',
    props.variant === 'dim' ? 'h-10' : 'h-12',
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
    active
      ? 'bg-white/10 text-white'
      : 'text-[#a3a3a3] hover:bg-white/[0.04] hover:text-white',
    props.comingSoon && 'pointer-events-none opacity-60',
  );

  const iconEl = (
    <span className="flex size-[18px] shrink-0 items-center justify-center">
      {glyph}
    </span>
  );
  const labelEl = (
    <span
      aria-hidden={collapsed || undefined}
      className={cn(
        'truncate transition-opacity duration-200',
        collapsed && 'opacity-0',
      )}
    >
      {props.label}
    </span>
  );
  // Collapsed, the row shows only its icon and a tooltip that is not tied to
  // the link, so the link carries its name.
  const name = collapsed ? props.label : undefined;

  const link = props.external ? (
    <a
      className={rowClasses}
      aria-label={name}
      href={props.to}
      rel="noreferrer"
      target={props.to.startsWith('mailto:') ? undefined : '_blank'}
    >
      {iconEl}
      {labelEl}
    </a>
  ) : props.active !== undefined ? (
    <Link
      className={rowClasses}
      to={props.to}
      aria-label={name}
      aria-current={props.active ? 'page' : undefined}
    >
      {iconEl}
      {labelEl}
    </Link>
  ) : (
    <NavLink className={rowClasses} to={props.to} aria-label={name}>
      {iconEl}
      {labelEl}
    </NavLink>
  );

  return (
    <li>
      {collapsed ? (
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
