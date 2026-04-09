/**
 * Route guard that redirects free-tier users to the plan page.
 *
 * Wrap any route's `element` with `<RequirePremium>` to prevent the
 * component from mounting at all for unpaid users.  This is the hard
 * gate — DevTools cannot bypass it because the page component never
 * renders.
 *
 * While subscription status is loading, a blank (transparent) screen is
 * shown so premium users don't see a flash-redirect.
 *
 * Usage in route config:
 *   {
 *     path: GameRoutes.foli.definition,
 *     element: <RequirePremium><FoliPage /></RequirePremium>,
 *   }
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';
import { useIsPremium } from '@/hooks/useIsPremium';

interface RequirePremiumProps {
  children: ReactNode;
}

export function RequirePremium({ children }: RequirePremiumProps) {
  const { isPremium, isLoading } = useIsPremium();

  // Don't redirect while still fetching — avoids flash-redirect for paid users.
  if (isLoading) return null;

  if (!isPremium) {
    return <Navigate replace to={ProfileRoutes.plan()} />;
  }

  return <>{children}</>;
}
