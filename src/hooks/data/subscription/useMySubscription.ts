import { useQuery, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { SubscriptionStatus } from '@/features/settings/subscription/subscriptionUtils';

/** React Query cache key for the subscription status. */
export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'status'] as const;

function apiPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}${path}`;
}

async function fetchWithAuth(
  url: string,
  token: string,
): Promise<SubscriptionStatus> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return SuperJSON.parse(text) as SubscriptionStatus;
}

/**
 * Fetch the authenticated user's full subscription/billing status.
 *
 * Calls GET /api/me/subscription on the Elysia API and returns normalised
 * subscription state including hasPaidAccess, dates, and invoice status.
 *
 * Usage:
 *   const { data: subscription, isLoading, isError } = useMySubscription();
 */
export const useMySubscription = () => {
  const { token } = useAuthContext();

  return useQuery<SubscriptionStatus>({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => fetchWithAuth(apiPath('/api/me/subscription'), token!),
    enabled: !!token,
    // Don't refetch too aggressively — subscription state changes via webhooks,
    // not on every render. A 2-minute stale time balances freshness with load.
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * Returns a function that forces a fresh fetch of subscription status.
 * Use this after a checkout or portal session returns to the app.
 */
export const useRefreshSubscription = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
};
