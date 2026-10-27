import {
  type LucideIcon,
  CircleHelp,
  Ellipsis,
  GraduationCap,
  Laptop,
  Settings,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTopRailStats } from '@/components/ClassroomLayout/useTopRailStats';
import { Logo } from '@/components/Logo';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/components/utilities';
import {
  AtlasRoutes,
  ClassroomRoutes,
  GameRoutes,
  LearnRoutes,
  OfficeRoutes,
  ProfileRoutes,
  SettingsRoutes,
  StudioRoutes,
  UserRoutes,
} from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { isRouteActive, NavGlyph } from './SidebarMainNavItem';

interface Tab {
  to: string;
  label: string;
  icon?: LucideIcon;
  iconSrc?: string;
  /** Draw the Music Atlas logo in place of an icon. */
  logo?: boolean;
}

/** The rail's primary nav, in the rail's order. */
const TABS: Tab[] = [
  { to: ProfileRoutes.root(), label: 'Home', logo: true },
  { to: LearnRoutes.root(), label: 'Learn', iconSrc: '/icons/learn-icon.svg' },
  {
    to: StudioRoutes.root(),
    label: 'Studio',
    iconSrc: '/icons/studio-icon.svg',
  },
  { to: AtlasRoutes.root(), label: 'Globe', iconSrc: '/icons/globe-icon.svg' },
  {
    to: GameRoutes.root(),
    label: 'Arcade',
    iconSrc: '/icons/arcade-icon.svg',
  },
];

const tabClasses = (active: boolean) =>
  cn(
    'flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl outline-none transition-colors duration-75',
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
    active ? 'text-white' : 'text-[#a3a3a3] active:text-white',
  );

/**
 * The app's navigation below `md`, where the left rail is hidden: a top
 * bar of icons (names in their labels) with the rail's primary items, the
 * logo standing for Home, and "More" for the rest of it
 * (Classroom, Office, Awards, System, Support) plus the profile, since the
 * TopRail is hidden at this size too.
 */
export const MobileTabBar = ({ className }: { className?: string }) => {
  const { pathname } = useLocation();
  const { role } = useAuthContext();
  const [moreOpen, setMoreOpen] = useState(false);
  const { totalXp, level, userName, avatarConfig } = useTopRailStats();

  const moreItems: (Tab & { external?: boolean })[] = [
    { to: ClassroomRoutes.root(), label: 'Classroom', icon: Laptop },
    ...(role === 'teacher'
      ? [{ to: OfficeRoutes.root(), label: 'Office', icon: GraduationCap }]
      : []),
    { to: ProfileRoutes.awards(), label: 'Awards', icon: Trophy },
    { to: SettingsRoutes.root(), label: 'System', icon: Settings },
    {
      to: 'mailto:aaron@musicatlas.io',
      label: 'Support',
      icon: CircleHelp,
      external: true,
    },
  ];
  const tabActive = TABS.some((t) => isRouteActive(pathname, t.to));
  // "More" is lit when the page showing is one of its items (or the profile).
  const moreActive =
    !tabActive &&
    [
      UserRoutes.root(),
      ...moreItems.filter((i) => !i.external).map((i) => i.to),
    ].some((to) => isRouteActive(pathname, to));

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex shrink-0 items-stretch gap-1 border-b border-white/[0.06] bg-[#101012] px-2',
        className,
      )}
    >
      {TABS.map((tab) => {
        const active = isRouteActive(pathname, tab.to);
        return (
          <Link
            key={tab.label}
            to={tab.to}
            aria-label={tab.label}
            title={tab.label}
            aria-current={active ? 'page' : undefined}
            className={tabClasses(active)}
          >
            <span
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                active && 'bg-white/10',
              )}
            >
              {tab.logo ? (
                // The logo is white; dimmed like the other icons when idle.
                <Logo
                  className={cn(
                    'size-5 transition-opacity',
                    !active && 'opacity-70',
                  )}
                />
              ) : (
                <NavGlyph icon={tab.icon} iconSrc={tab.iconSrc} />
              )}
            </span>
          </Link>
        );
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-label="More"
          title="More"
          onClick={() => setMoreOpen(true)}
          className={tabClasses(moreActive)}
        >
          <span
            className={cn(
              'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
              moreActive && 'bg-white/10',
            )}
          >
            <NavGlyph icon={Ellipsis} />
          </span>
        </button>

        <SheetContent
          side="top"
          className="rounded-b-2xl border-white/10 bg-[#101012] px-3 pt-5 pb-3 text-white"
        >
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">
            The rest of Music Atlas, and your profile.
          </SheetDescription>

          {/* The profile, with what the TopRail shows on wider screens. */}
          <SheetClose asChild>
            <Link
              to={UserRoutes.root()}
              className="mr-10 mb-2 flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Avatar className="size-10 border border-white/10">
                <AvatarFallback className="relative overflow-hidden p-0">
                  <UserAvatarPattern
                    className="size-full"
                    userName={userName}
                    config={avatarConfig}
                  />
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base">{userName}</span>
                <span className="text-sm tabular-nums text-white/60">
                  {totalXp.toLocaleString()} XP · Level {level}
                </span>
              </span>
            </Link>
          </SheetClose>

          <ul className="flex flex-col gap-px border-t border-white/[0.06] pt-2">
            {moreItems.map((item) => {
              const active = !item.external && isRouteActive(pathname, item.to);
              const rowClasses = cn(
                'flex h-12 items-center gap-3 rounded-full px-4 text-sm outline-none transition-colors duration-75',
                'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-[#a3a3a3] hover:bg-white/[0.04] hover:text-white',
              );
              const content = (
                <>
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <NavGlyph icon={item.icon} iconSrc={item.iconSrc} />
                  </span>
                  {item.label}
                </>
              );
              return (
                <li key={item.label}>
                  <SheetClose asChild>
                    {item.external ? (
                      <a href={item.to} className={rowClasses}>
                        {content}
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                        className={rowClasses}
                      >
                        {content}
                      </Link>
                    )}
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
};
