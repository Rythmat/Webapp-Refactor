/**
 * Home Dashboard — Music Atlas_Home reference design.
 * Vertical stack of six sections; the left rail lives in ClassroomSidebar.
 */
import { Suspense, lazy } from 'react';
import { DashboardFooter } from './dashboard/DashboardFooter';
import { PathwaysSection } from './dashboard/PathwaysSection';
import { QuickStartSection } from './dashboard/QuickStartSection';
import { RecentActivitySection } from './dashboard/RecentActivitySection';
import { SongsSection } from './dashboard/SongsSection';
import { WelcomeHeader } from './dashboard/WelcomeHeader';

// Code-split: the globe preview pulls the full Atlas event dataset + cobe, so
// it loads in its own chunk rather than bloating the initial Home bundle.
const GlobeSection = lazy(() =>
  import('./dashboard/GlobeSection').then((m) => ({ default: m.GlobeSection })),
);

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
      <hr className="border-0 border-t border-white/15" role="separator" />
      <Suspense fallback={null}>
        <GlobeSection />
      </Suspense>
      <DashboardFooter />
    </div>
  );
};
