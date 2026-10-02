import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
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
  const appSessionId = getCurrentAppSessionId();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // The status rides along so callers can tell a 404 from a 500 — the
    // server's messages alone don't (a duplicate rule is a raw 500).
    throw Object.assign(
      new Error(
        (body as { error?: string }).error ?? `Request failed: ${res.status}`,
      ),
      { status: res.status },
    );
  }

  const text = await res.text();
  return SuperJSON.parse(text) as T;
}

const FREE_ACCESS_KEY = ['admin', 'free-access'] as const;

/**
 * A rule decides which accounts read as `insider_access`, so changing one
 * also stales the users list it's managed from. Returned from `onSuccess`, so
 * a mutation stays pending until both lists show the change — no "granted"
 * toast beside a row that still says Free.
 */
const invalidateAccess = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: FREE_ACCESS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  ]);

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
    onSuccess: () => invalidateAccess(queryClient),
  });
};

export const useUpdateFreeAccessRule = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<
    FreeAccessRule,
    Error,
    {
      id: string;
      duration: 'perpetual' | 'temporary';
      expiresAt: string | null;
    }
  >({
    mutationFn: ({ id, ...body }) =>
      fetchWithAuth<FreeAccessRule>(adminPath(`/free-access/${id}`), token!, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateAccess(queryClient),
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
    onSuccess: () => invalidateAccess(queryClient),
  });
};
