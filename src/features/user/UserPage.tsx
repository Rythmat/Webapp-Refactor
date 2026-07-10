import { XpTrackerCard } from '@/components/ClassroomLayout/dashboard/XpTrackerCard';
import { useMe } from '@/hooks/data';
import { AvatarCard } from './AvatarCard';
import { BioCard } from './BioCard';
import { ConnectCard } from './ConnectCard';
import { PreferencesCard } from './PreferencesCard';
import { RecentAwardsCard } from './RecentAwardsCard';
import '@/features/settings/settings.css';

/**
 * User page — Avatar + Bio + XP graph + Connect (search, connection requests,
 * and suggested musicians). Connecting with someone here makes them a suggested
 * collaborator on the Studio Dashboard once both sides accept.
 */
export const UserPage = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || 'friend';

  return (
    <div className="settings-root mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl">
          Welcome, {displayName}
        </h1>
        <p className="text-base text-white/60 md:text-lg">
          Your identity, progress, and the community around you.
        </p>
      </header>

      {/* One component per row, full width. */}
      <div className="flex flex-col gap-8 md:gap-12">
        <AvatarCard />

        {/* XP card */}
        <XpTrackerCard />

        {/* Recent Awards */}
        <RecentAwardsCard />

        <BioCard />

        {/* Connect card */}
        <ConnectCard />

        {/* Preferences (custom cursor toggle) */}
        <PreferencesCard />
      </div>
    </div>
  );
};
