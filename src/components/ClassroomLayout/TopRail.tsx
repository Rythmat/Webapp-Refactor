import { Send, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { UserRoutes } from '@/constants/routes';
import { useExperienceSummary } from '@/hooks/data/experience';

const CREDITS_PLACEHOLDER = 12;
const AWARDS_PLACEHOLDER = 60;
// Notifications count is not yet backed by a real feed — inline a zero here
// so the badge dot stays hidden until a real notification stream ships.
const NOTIFICATION_COUNT = 0;

interface TopRailProps {
  className?: string;
}

/**
 * App-wide chrome top rail. Renders on every dashboard route (Home / Learn /
 * Studio / Globe / Arcade / Songs). Right-aligned stats cluster relocated
 * from the (now-slimmed) WelcomeHeader.
 */
export const TopRail = ({ className }: TopRailProps) => {
  const { data: xp } = useExperienceSummary();
  const totalXp = xp?.totalExperience ?? 0;
  const level = xp?.level ?? 1;
  const notificationCount = NOTIFICATION_COUNT;

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

        {/* Awards */}
        <button
          type="button"
          aria-label={`Awards: ${AWARDS_PLACEHOLDER}`}
          className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
        >
          <img
            src="/icons/awards-icon.svg"
            alt=""
            draggable={false}
            className="h-6 w-6"
          />
          <span className="text-[20px] font-medium tabular-nums">
            {AWARDS_PLACEHOLDER}
          </span>
        </button>

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

        {/* User */}
        <Link
          to={UserRoutes.root()}
          aria-label="User profile"
          className="text-white/80 transition-colors hover:text-white"
        >
          <User className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
};
