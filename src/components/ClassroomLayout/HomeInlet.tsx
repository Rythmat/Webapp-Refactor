/**
 * Home Dashboard — Music Atlas_Home reference design.
 * Vertical stack of six sections; the left rail lives in ClassroomSidebar.
 */
import { DashboardFooter } from './dashboard/DashboardFooter';
import { PathwaysSection } from './dashboard/PathwaysSection';
import { QuickStartSection } from './dashboard/QuickStartSection';
import { RecentActivitySection } from './dashboard/RecentActivitySection';
import { SongsSection } from './dashboard/SongsSection';
import { WelcomeHeader } from './dashboard/WelcomeHeader';

export const HomeInlet = () => {
  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <WelcomeHeader />
      <QuickStartSection />
      <RecentActivitySection />
      <hr className="border-0 border-t border-white/15" role="separator" />
      <PathwaysSection />
      <hr className="border-0 border-t border-white/15" role="separator" />
      <SongsSection />
      <DashboardFooter />
    </div>
  );
};
