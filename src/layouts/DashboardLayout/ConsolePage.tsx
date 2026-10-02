import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { DashboardContentSkeleton } from './DashboardContentSkeleton';

/**
 * A console page's frame: the padded, scrolling column Users, Telemetry, the
 * content tables, the graph and Publishing sit in.
 *
 * The padding sits on an inner box, not on the scroller: browsers pin
 * `sticky top-0` below a scroller's padding, so the editors' toolbars (which
 * bleed out with -mt-8 / -mx-6 md:-mx-10) would stick 2rem down, over the
 * content they scroll past.
 */
export const ConsolePage = () => (
  <div className="relative min-h-0 min-w-0 flex-1 overflow-auto">
    <div className="px-6 py-8 md:px-10">
      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  </div>
);
