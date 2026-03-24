import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

export interface FreeAccessRule {
  id: string;
  type: 'email' | 'domain';
  value: string;
  duration: 'perpetual' | 'temporary';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function adminPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/admin${path}`;
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
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return SuperJSON.parse(text) as T;
}

const FREE_ACCESS_KEY = ['admin', 'free-access'] as const;

export const useFreeAccessRules = () => {
  const { token } = useAuthContext();

  return useQuery<FreeAccessRule[]>({
    queryKey: FREE_ACCESS_KEY,
    queryFn: () =>
      fetchWithAuth<FreeAccessRule[]>(adminPath('/free-access'), token!),
    enabled: !!token,
  });
};

export const useCreateFreeAccessRule = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<
    FreeAccessRule,
    Error,
    {
      type: 'email' | 'domain';
      value: string;
      duration: 'perpetual' | 'temporary';
      expiresAt: string | null;
    }
  >({
    mutationFn: (body) =>
      fetchWithAuth<FreeAccessRule>(adminPath('/free-access'), token!, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FREE_ACCESS_KEY });
    },
  });
};

export const useDeleteFreeAccessRule = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) =>
      fetchWithAuth<{ success: boolean }>(
        adminPath(`/free-access/${id}`),
        token!,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FREE_ACCESS_KEY });
    },
  });
};
