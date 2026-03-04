import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

async function fetchWithAuth(url: string, token: string, options?: RequestInit) {
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

  return res.json();
}

export const useCreditsBalance = () => {
  const { token } = useAuthContext();

  return useQuery<CreditsBalance>({
    queryKey: ['credits', 'balance'],
    queryFn: () => fetchWithAuth('/api/credits/balance', token!),
    enabled: !!token,
  });
};

export const useConsumeCredit = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<ConsumeResult, Error, { action?: string }>({
    mutationFn: ({ action }) =>
      fetchWithAuth('/api/credits/consume', token!, {
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

  return useMutation<void, Error, { tier: 'artist' | 'studio' }>({
    mutationFn: async ({ tier }) => {
      const data = await fetchWithAuth('/api/stripe/checkout', token!, {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      window.location.href = data.url;
    },
  });
};

export const useStripePortal = () => {
  const { token } = useAuthContext();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const data = await fetchWithAuth('/api/stripe/portal', token!, {
        method: 'POST',
      });
      window.location.href = data.url;
    },
  });
};
