/**
 * Landing Home — a near-exact copy of the Home dashboard content
 * (`src/components/ClassroomLayout/HomeInlet.tsx`), minus the Recent Activity
 * and Challenges sections, for the public logged-out landing at `/`.
 *
 * Reuses the REAL dashboard section components. They are all auth-safe (their
 * data hooks gate on `!!token`), so they render fully for anonymous visitors
 * with no mock data. The Welcome text + Quick Start tiles are replaced by a
 * full-bleed interactive hex hero (`LandingHero`).
 */
import { Suspense, lazy } from 'react';
import { DashboardFooter } from '@/components/ClassroomLayout/dashboard/DashboardFooter';
import { SongsSection } from '@/components/ClassroomLayout/dashboard/SongsSection';
import { LandingHero } from './LandingHero';
import { LandingShowcase } from './LandingShowcase';

// Code-split: the globe preview pulls the full Atlas event dataset + cobe, so
// it loads in its own chunk (same as the real Home dashboard).
const GlobeSection = lazy(() =>
  import('@/components/ClassroomLayout/dashboard/GlobeSection').then((m) => ({
    default: m.GlobeSection,
  })),
);

export const LandingHome = () => {
  return (
    <div className="flex w-full flex-col gap-8 px-6 pb-6 md:gap-10 md:px-10 md:pb-10">
      {/* Hero: full-bleed interactive hex background, flush under the top rail. */}
      <LandingHero />
      {/* White secondary hero / product showcase (replaces "Explore Music Atlas"). */}
      <LandingShowcase />
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
