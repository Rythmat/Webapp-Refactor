import { ArrowUpRight, ChevronLeft, PanelLeft, Search } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTopRailStats } from '@/components/ClassroomLayout/useTopRailStats';
import { Logo } from '@/components/Logo';
import { type AppIconComponent, AppIcons } from '@/components/icons/appIcons';
import {
  RAIL_BUTTON,
  RAIL_ICON,
  RAIL_ROW,
  RAIL_ROW_ACTIVE,
  RAIL_ROW_FOOT,
} from '@/components/kit/libraryLook';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/utilities';
import {
  ClassroomRoutes,
  GameRoutes,
  GlobeRoutes,
  LearnRoutes,
  LibraryRoutes,
  OfficeRoutes,
  ProfileRoutes,
  SearchRoutes,
  SettingsRoutes,
  SongRoutes,
  StudioRoutes,
  UserRoutes,
} from '@/constants/routes';
import { useAuthActions } from '@/contexts/AuthContext';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { FOCUS_RING } from '@/daw/ui/styles';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isRouteActive } from './SidebarMainNavItem';
import { isAccountPath } from './accountPaths';
import { DESK_QUERY, isIconRailPath, useAppRail } from './appRailStore';

// ── The app rail (owner, 2026-11-10: Samply's sidebar, measured) ───────────
// A 264px column (Suno's, measured 2026-11-11) holding one rounded panel in the brand's black, the top
// bar's, on Suno's darker black with its 8px gaps (owner, 2026-11-10; the
// rows inside are Samply's, 12px in as Suno's, the icons 45px in). Its top
// row (44px) has the logo and a button that shuts it; then the student's own
// row (their avatar and name, which opens their Account) beside search; then
// the app's places as Suno's 48px pills, 1px apart; help at the foot. In the Account
// area the same panel holds the Account menu instead, at once: "‹ Account"
// back to the page they came from, its rows in groups split by hairlines,
// and a tray at the foot with Talk to Support and Log out. Shut, the rail is
// gone entirely and a button at the top bar's left brings it back (on Home,
// its icons stay, in Suno's shut panel: IconRail). From 960px it pushes the page over;
// narrower, it slides over the page.

/** Suno's open sidebar: 248px in its 8px, 264px, in our rem. */
export const APP_RAIL_WIDTH = '15rem';

const SUPPORT = 'mailto:aaron@musicatlas.io';

interface Place {
  to: string;
  label: string;
  icon: AppIconComponent;
  /** Opens elsewhere: a ↗ at the row's end. */
  external?: boolean;
}

/** The rail's small lucide marks (↗, ‹): Samply's 16px. */
const LUCIDE_GLYPH = 'size-[0.909rem]';
/** The places' icons (AppIcons, solid as Suno's) at 18px. */
const SOLID_GLYPH = 'size-[1.023rem] shrink-0';

function RailRow({
  place,
  active,
  foot = false,
  onPick,
}: {
  place: Place;
  active: boolean;
  /** At the rail's foot: Suno's shorter row. */
  foot?: boolean;
  onPick?: () => void;
}) {
  const Icon = place.icon;
  const content = (
    <>
      <span className={RAIL_ICON}>
        <Icon aria-hidden className={SOLID_GLYPH} />
      </span>
      <span className="min-w-0 flex-1 truncate">{place.label}</span>
      {place.external && !place.to.startsWith('mailto:') && (
        <ArrowUpRight aria-hidden className={cn(LUCIDE_GLYPH, 'shrink-0')} />
      )}
    </>
  );
  return (
    <li>
      {place.external ? (
        <a
          href={place.to}
          onClick={onPick}
          target={place.to.startsWith('mailto:') ? undefined : '_blank'}
          rel="noreferrer"
          className={cn(RAIL_ROW, foot && RAIL_ROW_FOOT)}
        >
          {content}
        </a>
      ) : (
        <Link
          to={place.to}
          onClick={onPick}
          aria-current={active ? 'page' : undefined}
          className={cn(
            RAIL_ROW,
            foot && RAIL_ROW_FOOT,
            active && RAIL_ROW_ACTIVE,
          )}
        >
          {content}
        </Link>
      )}
    </li>
  );
}

/** The panel's top row: 44px, its own content at the left, Shut at the right. */
function RailHead({
  children,
  onClose,
  closeRef,
  className,
}: {
  children: React.ReactNode;
  onClose: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[2.5rem] shrink-0 items-center justify-between pr-[0.682rem] pt-[0.455rem]',
        className,
      )}
    >
      {children}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close sidebar"
        title="Close sidebar"
        className={RAIL_BUTTON}
      >
        <PanelLeft aria-hidden className="size-[1.136rem]" strokeWidth={1.75} />
      </button>
    </div>
  );
}

/** The student's avatar at an icon's 16px. */
function RailAvatar() {
  const { userName, avatarConfig } = useTopRailStats();
  return (
    <Avatar className="size-[0.909rem] shrink-0">
      <AvatarFallback className="relative overflow-hidden p-0">
        <UserAvatarPattern
          className="size-full"
          userName={userName}
          config={avatarConfig}
        />
      </AvatarFallback>
    </Avatar>
  );
}

/** The app's places, the main menu's rows and the icon rail's. */
function usePlaces(): Place[] {
  const { role } = useAuthContext();
  return [
    { to: ProfileRoutes.root(), label: 'Home', icon: AppIcons.home },
    { to: LearnRoutes.root(), label: 'Learn', icon: AppIcons.learn },
    // A record: Studio already has the note (owner, 2026-11-11).
    { to: SongRoutes.root(), label: 'Songs', icon: AppIcons.songs },
    { to: StudioRoutes.root(), label: 'Studio', icon: AppIcons.studio },
    // The student's Studio projects, heard without the editor (owner,
    // 2026-11-11, Samply's Library).
    { to: LibraryRoutes.root(), label: 'Library', icon: AppIcons.library },
    { to: GlobeRoutes.root(), label: 'Globe', icon: AppIcons.globe },
    { to: GameRoutes.root(), label: 'Arcade', icon: AppIcons.arcade },
    {
      to: ClassroomRoutes.root(),
      label: 'Classroom',
      icon: AppIcons.classroom,
    },
    // Teachers only, as the old rail: console roles never reach the app.
    ...(role === 'teacher'
      ? [
          {
            to: OfficeRoutes.root(),
            label: 'Office',
            icon: AppIcons.office,
          },
        ]
      : []),
  ];
}

/** The app's places. */
function MainMenu({
  pathname,
  onClose,
  onPick,
  closeRef,
}: MenuProps & { pathname: string }) {
  const { userName } = useTopRailStats();
  const places = usePlaces();

  return (
    <>
      <RailHead onClose={onClose} closeRef={closeRef} className="pl-[1.477rem]">
        <Link
          to={ProfileRoutes.root()}
          onClick={onPick}
          aria-label="Music Atlas home"
          className={cn('flex rounded-md hover:opacity-80', FOCUS_RING)}
        >
          <Logo className="size-[1.136rem]" />
        </Link>
      </RailHead>

      <div className="flex min-h-0 flex-1 flex-col px-[0.682rem] pt-[0.682rem]">
        <ul className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto">
          {/* The student, as Samply's: their avatar and name open their
              Account; search beside them. */}
          <li className="flex items-center gap-1">
            <Link
              to={SettingsRoutes.root()}
              onClick={onPick}
              aria-label={`${userName}: your account`}
              className={cn(RAIL_ROW, 'flex-1')}
              data-rail-profile
            >
              <span className={RAIL_ICON}>
                <RailAvatar />
              </span>
              <span className="truncate">{userName}</span>
            </Link>
            <Link
              to={SearchRoutes.root()}
              onClick={onPick}
              aria-label="Search"
              title="Search"
              className={RAIL_BUTTON}
            >
              <Search aria-hidden className="size-[1.136rem]" />
            </Link>
          </li>
          {places.map((place) => (
            <RailRow
              key={place.label}
              place={place}
              active={isRouteActive(pathname, place.to)}
              onPick={onPick}
            />
          ))}
        </ul>
        <ul className="flex shrink-0 flex-col py-[0.455rem]">
          <RailRow
            place={{
              to: SUPPORT,
              label: 'Help & support',
              icon: AppIcons.help,
              external: true,
            }}
            active={false}
            foot
          />
        </ul>
      </div>
    </>
  );
}

/** The Account area's own menu, in the same panel. */
function AccountMenu({
  pathname,
  onClose,
  onPick,
  closeRef,
}: MenuProps & { pathname: string }) {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const lastOutside = useAppRail((s) => s.lastOutside);
  const section = (slug: string) => SettingsRoutes.section({ section: slug });

  // Samply's shape: the account, then the student's learning, then help.
  const groups: Place[][] = [
    [
      { to: section('profile'), label: 'Profile', icon: AppIcons.profile },
      {
        to: section('subscription'),
        label: 'Subscription',
        icon: AppIcons.subscription,
      },
      {
        to: section('preferences'),
        label: 'Preferences',
        icon: AppIcons.preferences,
      },
    ],
    [
      { to: UserRoutes.root(), label: 'Progress', icon: AppIcons.progress },
      { to: ProfileRoutes.awards(), label: 'Awards', icon: AppIcons.awards },
    ],
    [
      { to: section('help'), label: 'Help', icon: AppIcons.help },
      { to: section('about'), label: 'About', icon: AppIcons.about },
    ],
  ];

  return (
    <>
      <RailHead onClose={onClose} closeRef={closeRef} className="pl-[0.682rem]">
        <button
          type="button"
          onClick={() => {
            onPick?.();
            navigate(lastOutside ?? ProfileRoutes.root());
          }}
          className={cn(
            'flex h-[1.818rem] items-center gap-[0.682rem] rounded-[0.455rem] px-[0.909rem] text-[0.852rem] font-semibold leading-[1.136rem] text-white hover:bg-white/[0.05]',
            FOCUS_RING,
          )}
        >
          <ChevronLeft aria-hidden className={LUCIDE_GLYPH} />
          Account
        </button>
      </RailHead>

      <ul className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-[0.682rem] pt-[0.682rem]">
        {groups.map((group, i) => (
          <Fragment key={group[0].label}>
            {i > 0 && (
              <li aria-hidden className="my-[0.455rem] h-px bg-white/[0.06]" />
            )}
            {group.map((place) => (
              <RailRow
                key={place.label}
                place={place}
                active={isRouteActive(pathname, place.to)}
                onPick={onPick}
              />
            ))}
          </Fragment>
        ))}
      </ul>

      {/* Samply's tray at the foot: a shade lighter, edge to edge. */}
      <ul className="flex shrink-0 flex-col gap-px bg-white/[0.05] px-[0.682rem] py-[0.682rem]">
        <RailRow
          place={{
            to: SUPPORT,
            label: 'Talk to Support',
            icon: AppIcons.support,
            external: true,
          }}
          active={false}
          foot
        />
        <li>
          <button
            type="button"
            onClick={() => {
              onPick?.();
              signOut();
              navigate('/');
            }}
            className={cn(RAIL_ROW, RAIL_ROW_FOOT, 'w-full')}
          >
            <span className={RAIL_ICON}>
              <AppIcons.logOut aria-hidden className={SOLID_GLYPH} />
            </span>
            Log out
          </button>
        </li>
      </ul>
    </>
  );
}

interface MenuProps {
  onClose: () => void;
  /** Narrow screens: the sheet shuts once a place is picked. */
  onPick?: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
}

/** The panel: the app's menu, or the Account's while that area shows. */
function RailPanel(props: MenuProps) {
  const { pathname } = useLocation();
  const account = isAccountPath(pathname);
  return (
    <nav
      aria-label={account ? 'Account' : 'Main'}
      data-rail-mode={account ? 'account' : 'main'}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[0.682rem] border border-transparent bg-[#101012] text-white"
    >
      {account ? (
        <AccountMenu pathname={pathname} {...props} />
      ) : (
        <MainMenu pathname={pathname} {...props} />
      )}
    </nav>
  );
}

// ── Home's icon rail (owner, 2026-11-10: Suno's collapsed sidebar) ─────────
// With the rail shut on Home, its icons stay where they were: the rail
// narrows to a column of them (it still pushes the page, as the open rail
// does), every icon (the logo, the student's avatar, the places, help) on
// the very pixel it holds in the open rail. Each sits in Suno's round pill,
// 50px wide, measured on suno.com/discover: the icon grey (#a3a3a3), white
// under the pointer or when it's the page; the pill 4% white under the
// pointer, 10% when it's the page, 16% both; its name in a tooltip 8px to
// the right at once, Suno's 4% white over a 50px blur. Its panel is Suno's
// too: 74px, 8px from the window's edge. The logo turns into "Open sidebar"
// under the pointer (owner). As the rail opens, the column fades over the
// full panel while the rail grows from behind; as it shuts, it's back at once.

/** Suno's shut panel: 74px, its 50px pills 12px in. */
export const ICON_RAIL_WIDTH = '4.205rem';
/** The shut rail's column: the panel and its 8px either side, Suno's 90. */
const ICON_RAIL_COLUMN = '5.114rem';
/** A place: the open row's 48px pill (so the icons keep their rhythm), 1px
 *  apart, as Suno's. */
const ICON_PILL = cn(
  'group relative flex h-[2.727rem] w-full items-center justify-center text-[#a3a3a3] hover:text-white aria-[current=page]:text-white',
  "before:absolute before:inset-0 before:rounded-full before:bg-white/[0.04] before:opacity-0 before:transition-opacity before:duration-75 before:content-[''] hover:before:opacity-100",
  'aria-[current=page]:before:bg-white/10 aria-[current=page]:before:opacity-100 aria-[current=page]:hover:before:bg-white/[0.16]',
  'transition-colors duration-75',
  FOCUS_RING,
);
/** Suno's tooltip: 4% white over a 50px blur, 14px, 8px corners. */
const ICON_TIP =
  'rounded-[0.455rem] bg-white/[0.04] px-[0.682rem] py-[0.455rem] text-[0.795rem] font-normal leading-[1.136rem] text-white backdrop-blur-[50px]';

export { isIconRailPath };

/** A pill with its name to the right, Suno's way. */
function IconTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className={ICON_TIP}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function IconRail({ shown }: { shown: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const setOpen = useAppRail((s) => s.setOpen);
  const { userName } = useTopRailStats();
  const places = usePlaces();
  const { pathname } = useLocation();
  useInert(ref, !shown);

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <nav
        ref={ref}
        aria-label="Main"
        aria-hidden={!shown || undefined}
        data-icon-rail={shown ? 'shown' : 'hidden'}
        // Over the open panel, its 1px edge kept (py-px), so its head, rows
        // and foot fall on the open rail's.
        className={cn(
          'absolute inset-y-[0.455rem] left-[0.455rem] z-10 flex flex-col rounded-[0.682rem] bg-[#101012] px-[0.682rem] py-px text-white transition-opacity duration-200 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ width: ICON_RAIL_WIDTH }}
      >
        {/* The head's 44px, the logo at its spot in the open rail's. */}
        <div className="flex h-10 shrink-0 items-center justify-center pt-[0.455rem]">
          <IconTip label="Open sidebar">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open sidebar"
              data-rail-toggle
              className={cn(
                'group grid size-[2.273rem] place-items-center rounded-full text-white transition-colors duration-75 hover:bg-white/[0.04]',
                FOCUS_RING,
              )}
            >
              <Logo className="col-start-1 row-start-1 size-[1.136rem] group-hover:opacity-0 group-focus-visible:opacity-0" />
              <PanelLeft
                aria-hidden
                strokeWidth={1.75}
                className="col-start-1 row-start-1 size-[1.136rem] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </button>
          </IconTip>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-px pt-[0.682rem]">
          <li>
            <IconTip label={userName}>
              <Link
                to={SettingsRoutes.root()}
                aria-label={`${userName}: your account`}
                className={ICON_PILL}
              >
                <RailAvatar />
              </Link>
            </IconTip>
          </li>
          {places.map((place) => {
            const active = isRouteActive(pathname, place.to);
            return (
              <li key={place.label}>
                <IconTip label={place.label}>
                  <Link
                    to={place.to}
                    aria-label={place.label}
                    aria-current={active ? 'page' : undefined}
                    className={ICON_PILL}
                  >
                    <span className="flex size-[0.909rem] items-center justify-center">
                      <place.icon aria-hidden className={SOLID_GLYPH} />
                    </span>
                  </Link>
                </IconTip>
              </li>
            );
          })}
        </ul>
        {/* Help at the foot, where the open rail keeps it. */}
        <ul className="flex shrink-0 flex-col py-[0.455rem]">
          <li>
            <IconTip label="Help & support">
              <a
                href={SUPPORT}
                aria-label="Help & support"
                className={cn(ICON_PILL, RAIL_ROW_FOOT)}
              >
                <span className="flex size-[0.909rem] items-center justify-center">
                  <AppIcons.help aria-hidden className={SOLID_GLYPH} />
                </span>
              </a>
            </IconTip>
          </li>
        </ul>
      </nav>
    </TooltipProvider>
  );
}

/** Marks a region inert while it's out of sight (React 18 has no prop). */
function useInert(ref: React.RefObject<HTMLElement>, inert: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (inert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [ref, inert]);
}

export function AppRail() {
  const desk = useMediaQuery(DESK_QUERY);
  const open = useAppRail((s) => s.open);
  const sheetOpen = useAppRail((s) => s.sheetOpen);
  const setOpen = useAppRail((s) => s.setOpen);
  const setSheetOpen = useAppRail((s) => s.setSheetOpen);
  const setLastOutside = useAppRail((s) => s.setLastOutside);
  const { pathname, search } = useLocation();

  // Where "‹ Account" goes back to: the last page outside the Account area.
  useEffect(() => {
    if (!isAccountPath(pathname)) setLastOutside(`${pathname}${search}`);
  }, [pathname, search, setLastOutside]);

  // Arriving at the Account's Profile opens the rail on a desk, so its menu
  // shows (owner, 2026-11-11); shut there, it stays shut until the next visit.
  useEffect(() => {
    if (
      desk &&
      pathname.replace(/\/$/, '') ===
        SettingsRoutes.section({ section: 'profile' })
    )
      setOpen(true);
  }, [desk, pathname, setOpen]);

  // A narrow screen's sheet shuts on the next page, and on Escape.
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname, setSheetOpen]);
  useEffect(() => {
    if (desk || !sheetOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [desk, sheetOpen, setSheetOpen]);

  const deskRef = useRef<HTMLDivElement>(null);
  const deskPanelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useInert(deskRef, desk && !open && !isIconRailPath(pathname));
  useInert(deskPanelRef, desk && !open);
  useInert(sheetRef, !desk && !sheetOpen);
  // The sheet takes focus as it opens, so Escape and Tab start there.
  useEffect(() => {
    if (!desk && sheetOpen) closeRef.current?.focus();
  }, [desk, sheetOpen]);

  const iconRailPage = isIconRailPath(pathname);

  if (desk) {
    // Its width runs between nothing (Home: its icons' column) and the
    // rail's (0.2s, as Samply's), the panel inside at its full width all the
    // while, so the page moves and the rail never reflows. Suno's 8px
    // round it, the darker black between it and the page.
    const shutWidth = iconRailPage ? ICON_RAIL_COLUMN : 0;
    return (
      <div
        ref={deskRef}
        data-app-rail={open ? 'open' : 'shut'}
        aria-hidden={(!open && !iconRailPage) || undefined}
        className="relative h-full shrink-0 overflow-hidden transition-[width] duration-200 motion-reduce:transition-none"
        style={{ width: open ? APP_RAIL_WIDTH : shutWidth }}
      >
        <div
          ref={deskPanelRef}
          aria-hidden={!open || undefined}
          // Shut on Home, it goes at once: its labels would show in the
          // column's 8px past the icons.
          className={cn(
            'h-full p-[0.455rem]',
            !open && iconRailPage && 'invisible',
          )}
          style={{ width: APP_RAIL_WIDTH }}
        >
          <RailPanel onClose={() => setOpen(false)} />
        </div>
        {iconRailPage && <IconRail shown={!open} />}
      </div>
    );
  }

  return (
    <div
      ref={sheetRef}
      data-app-rail={sheetOpen ? 'open' : 'shut'}
      aria-hidden={!sheetOpen || undefined}
      className={cn('fixed inset-0 z-50', !sheetOpen && 'pointer-events-none')}
    >
      <div
        aria-hidden
        onClick={() => setSheetOpen(false)}
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-200 motion-reduce:transition-none',
          sheetOpen ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'absolute inset-y-0 left-0 bg-black p-[0.455rem] transition-transform duration-200 motion-reduce:transition-none',
          sheetOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ width: `min(${APP_RAIL_WIDTH}, 85vw)` }}
      >
        <RailPanel
          onClose={() => setSheetOpen(false)}
          onPick={() => setSheetOpen(false)}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}
