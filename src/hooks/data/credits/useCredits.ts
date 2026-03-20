import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

interface CreditsBalance {
  balance: number;
  lifetimeUsed: number;
  tier: string;
}

interface ConsumeResult {
  success: boolean;
  remaining: number;
}

interface BillingConfig {
  tiers: Array<{
    id: 'free' | 'artist' | 'studio';
    name: string;
    price: string;
    period: string;
    credits: number;
    description: string;
    features: string[];
  }>;
}

function billingPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/billing${path}`;
}

async function fetchWithAuth<T = unknown>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return SuperJSON.parse(text) as T;
}

export const useCreditsBalance = () => {
  const { token } = useAuthContext();

  return useQuery<CreditsBalance>({
    queryKey: ['credits', 'balance'],
    queryFn: () => fetchWithAuth<CreditsBalance>(billingPath('/credits/balance'), token!),
    enabled: !!token,
  });
};

export const useBillingConfig = () => {
  return useQuery<BillingConfig>({
    queryKey: ['billing', 'config'],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const response = await fetch(billingPath('/config'), { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to load billing config: ${response.status}`);
      }
      const text = await response.text();
      return SuperJSON.parse(text) as BillingConfig;
    },
  });
};

export const useConsumeCredit = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ConsumeResult, Error, { action?: string }>({
    mutationFn: ({ action }) =>
      fetchWithAuth<ConsumeResult>(billingPath('/credits/consume'), token!, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
    },
  });
};

export const useStripeCheckout = () => {
  const { token } = useAuthContext();

  // Calls POST /api/billing/create-checkout-session on the Elysia API.
  // The price ID is resolved server-side from STRIPE_SUBSCRIPTION_PRICE_ID.
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const data = await fetchWithAuth<{ url?: string }>(
        billingPath('/create-checkout-session'),
        token!,
        { method: 'POST' },
      );
      if (!data.url) throw new Error('No checkout URL returned from server.');
      window.location.href = data.url;
    },
  });
};

export const useStripePortal = () => {
  const { token } = useAuthContext();

  // Calls POST /api/billing/create-portal-session on the Elysia API.
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const data = await fetchWithAuth<{ url?: string }>(
        billingPath('/create-portal-session'),
        token!,
        { method: 'POST' },
      );
      if (!data.url) throw new Error('No portal URL returned from server.');
      window.location.href = data.url;
    },
  });
};
