import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LandingShell } from '@/features/landing/LandingShell';

/**
 * Shared shell for all public marketing pages — the landing's chrome (nav,
 * framed column, footer) around the routed page (`<Outlet />`, code-split), so
 * every page looks and feels like `/`. Public: no auth gate, renders for
 * logged-out and logged-in visitors alike.
 */
export const MarketingLayout = () => {
  return (
    <LandingShell>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Outlet />
      </Suspense>
    </LandingShell>
  );
};
