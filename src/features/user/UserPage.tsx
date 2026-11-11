import { XpTrackerCard } from '@/components/ClassroomLayout/dashboard/XpTrackerCard';
import { OFFICE_PAGE_TITLE } from '@/features/office/ui/styles';
import { BioCard } from './BioCard';
import { ConnectCard } from './ConnectCard';
import { CortexCard } from './CortexCard';
import { RecentAwardsCard } from './RecentAwardsCard';
import '@/features/settings/settings.css';

/**
 * Account › Progress (owner, 2026-11-10): XP graph + Cortex + recent awards +
 * Bio + Connect (search, connection requests, and suggested musicians).
 * Connecting with someone here makes them a suggested collaborator on the
 * Studio Dashboard once both sides accept. The avatar moved to Account ›
 * Profile and the cursor and login-sound switches to Preferences.
 */
export const UserPage = () => {
  return (
    <div className="settings-root mx-auto flex w-full max-w-[1720px] flex-col gap-[2.727rem] px-2 pb-24">
      <h1 className={OFFICE_PAGE_TITLE}>Progress</h1>

      {/* One component per row, full width. */}
      <div className="flex flex-col gap-8 md:gap-12">
        {/* XP card */}
        <XpTrackerCard />

        {/* Your Cortex: everything you've done and how it connects */}
        <CortexCard />

        {/* Recent Awards */}
        <RecentAwardsCard />

        <BioCard />

        {/* Connect card */}
        <ConnectCard />
      </div>
    </div>
  );
};
