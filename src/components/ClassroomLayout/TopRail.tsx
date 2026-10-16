import { Flame, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/components/utilities';
import { ProfileRoutes, UserRoutes } from '@/constants/routes';
import { ChordNotationSwitcher } from './ChordNotationSwitcher';
import { CREDITS_PLACEHOLDER, useTopRailStats } from './useTopRailStats';

interface TopRailProps {
  className?: string;
}

/**
 * App-wide chrome top rail. Renders on every dashboard route (Home / Learn /
 * Studio / Globe / Arcade / Songs) but the Studio editor, whose own top bar
 * has an avatar menu with the same stats (focus mode). Right-aligned stats
 * cluster relocated from the (now-slimmed) WelcomeHeader.
 */
export const TopRail = ({ className }: TopRailProps) => {
  const {
    totalXp,
    level,
    streakDays,
    unlockedCount,
    notificationCount,
    userName,
    avatarConfig,
  } = useTopRailStats();

  return (
    <header
      className={cn(
        'hidden h-14 w-full flex-shrink-0 items-center justify-end',
        'border-b border-white/[0.06] bg-[#101012] px-6',
        'md:flex',
        className,
      )}
    >
      <div className="flex items-center gap-6 text-white">
        {/* Chord notation — only once turned on in Settings ▸ Look & Feel. */}
        <ChordNotationSwitcher />

        {/* Learning streak — appears once the user has one (gentle, no zero-state). */}
        {streakDays > 0 && (
          <div
            className="flex items-center gap-1.5"
            title={`${streakDays}-day learning streak`}
            aria-label={`${streakDays}-day learning streak`}
          >
            <Flame className="h-5 w-5 text-orange-400" fill="currentColor" />
            <span className="text-[20px] font-medium leading-none tabular-nums">
              {streakDays}
            </span>
          </div>
        )}

        {/* XP */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-medium leading-none tabular-nums">
            {totalXp.toLocaleString()}
          </span>
          <span className="text-[20px] font-medium leading-none text-white/70">
            XP
          </span>
        </div>

        {/* Level */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-medium leading-none text-white/70">
            Level
          </span>
          <span className="text-[20px] font-medium leading-none tabular-nums">
            {level}
          </span>
        </div>

        {/* Credits (stubbed) */}
        <button
          type="button"
          aria-label={`Credits: ${CREDITS_PLACEHOLDER}`}
          className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
        >
          <img
            src="/icons/credits-icon.svg"
            alt=""
            draggable={false}
            className="h-6 w-6"
          />
          <span className="text-[20px] font-medium tabular-nums">
            {CREDITS_PLACEHOLDER}
          </span>
        </button>

        {/* Awards — real earned count (hidden at 0); opens the Awards page. */}
        <Link
          to={ProfileRoutes.awards()}
          aria-label={unlockedCount > 0 ? `Awards: ${unlockedCount}` : 'Awards'}
          className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
        >
          <img
            src="/icons/awards-icon.svg"
            alt=""
            draggable={false}
            className="h-6 w-6"
          />
          {unlockedCount > 0 && (
            <span className="text-[20px] font-medium tabular-nums">
              {unlockedCount}
            </span>
          )}
        </Link>

        {/* Notifications — dot only appears when count > 0. Real feed lands
            when Studio/jam/classroom invites ship. */}
        <button
          type="button"
          aria-label={
            notificationCount > 0
              ? `Notifications: ${notificationCount}`
              : 'Notifications'
          }
          className="relative text-white/90 transition-colors hover:text-white"
        >
          <Send className="h-6 w-6" strokeWidth={1.75} />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#101012]" />
          )}
        </button>

        {/* User avatar */}
        <Link
          to={UserRoutes.root()}
          aria-label={`Open ${userName}'s profile`}
          className="transition-opacity hover:opacity-80"
        >
          <Avatar className="size-8 border border-white/10">
            <AvatarFallback className="relative overflow-hidden p-0">
              <UserAvatarPattern
                className="size-full"
                userName={userName}
                config={avatarConfig}
              />
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};
