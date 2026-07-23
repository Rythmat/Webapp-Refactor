import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MarketingFooter } from './components/MarketingFooter';
import { MarketingNav } from './components/MarketingNav';

/**
 * Shared shell for all public marketing pages — a sticky nav over a dark canvas,
 * the routed page (`<Outlet />`, code-split), and the marketing footer. Public:
 * no auth gate, renders for logged-out and logged-in visitors alike.
 */
export const MarketingLayout = () => {
  return (
    <div className="min-h-screen w-full bg-[#0b0b0d] text-white">
      {/* Same config as the landing top rail so the nav bar is identical across
          the landing and every /features page (edge-aligned + always-solid). */}
      <MarketingNav solid fluid />
      <main>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Outlet />
        </Suspense>
      </main>
      <MarketingFooter />
    </div>
  );
};
