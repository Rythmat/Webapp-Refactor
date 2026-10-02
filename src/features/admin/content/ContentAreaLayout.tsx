import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MirrorBar } from './mirror/MirrorBar';

/**
 * The content area: everything under /console/content — the mirrored app,
 * the records, Publishing — with one edit bar on top. The graph is not here
 * any more: it is Cortex's, in its own section (/console/cortex).
 *
 * The bar takes the app's XP/streak bar slot (TopRail, h-14), so the page
 * below it is the same size a student sees. The unsaved-changes guard sits
 * one level up (`GuardOutlet`, in AdminPages), above this area and Cortex
 * both, so leaving through the sidebar is caught everywhere.
 */
export const ContentAreaLayout = () => (
  <div className="flex h-full min-h-0 flex-col">
    <MirrorBar />
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The pages below are lazy; the bar stays while one loads. */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  </div>
);
