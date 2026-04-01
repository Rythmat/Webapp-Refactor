import { useQuery } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

export interface AdminUser {
  id: string;
  email: string | null;
  nickname: string;
  fullName: string | null;
  username: string | null;
  role: 'admin' | 'teacher' | 'student';
  subscriptionTier: 'free' | 'artist' | 'studio';
  subscriptionStatus: string | null;
  hasPaidAccess: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  createdAt: Date;
}

function adminPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/admin${path}`;
}

async function fetchWithAuth<T = unknown>(
  url: string,
  token: string,
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
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

export const useAdminUsers = (params?: {
  search?: string;
  role?: 'admin' | 'teacher' | 'student';
}) => {
  const { token } = useAuthContext();

  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.role) searchParams.set('role', params.role);
  const qs = searchParams.toString();

  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', params],
    queryFn: () =>
      fetchWithAuth<AdminUser[]>(
        adminPath(`/users${qs ? `?${qs}` : ''}`),
        token!,
      ),
    enabled: !!token,
  });
};
