import { lazy, Suspense } from 'react';
import { DashboardFooter } from '@/components/ClassroomLayout/dashboard/DashboardFooter';
import { PathwaysSection } from '@/components/ClassroomLayout/dashboard/PathwaysSection';
import { QuickStartSection } from '@/components/ClassroomLayout/dashboard/QuickStartSection';
import { SongsSection } from '@/components/ClassroomLayout/dashboard/SongsSection';
import { PerStudentPlaceholder } from './PerStudentPlaceholder';

const GlobeSection = lazy(() =>
  import('@/components/ClassroomLayout/dashboard/GlobeSection').then((m) => ({
    default: m.GlobeSection,
  })),
);

/**
 * The Home dashboard as HomeInlet stacks it, with the content sections real
 * and the per-student ones (announcements for this user, the greeting, recent
 * activity, today's challenges) held as placeholders. Keep the order in step
 * with src/components/ClassroomLayout/HomeInlet.tsx.
 */
export const HomeMirror = () => (
  <div className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10">
    <PerStudentPlaceholder label="Announcements and greeting" minHeight={72} />
    <QuickStartSection />
    <PerStudentPlaceholder label="Recent activity" />
    <hr className="border-0 border-t border-white/15" role="separator" />
    <PerStudentPlaceholder label="Challenges" />
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
