import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
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
  role: 'admin' | 'teacher' | 'student' | 'editor';
  subscriptionTier: 'free' | 'pro';
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

export const useAdminUsers = (params?: {
  search?: string;
  role?: AdminUser['role'];
}) => {
  const { token } = useAuthContext();

  // One key shape for every call: `()`, `{}` and `{ search: '' }` all mean
  // "everyone", and the page asks for that list twice (table and stats).
  const filters = {
    search: params?.search?.trim() || undefined,
    role: params?.role,
  };
  const searchParams = new URLSearchParams();
  if (filters.search) searchParams.set('search', filters.search);
  if (filters.role) searchParams.set('role', filters.role);
  const qs = searchParams.toString();

  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', filters],
    // Keep showing the last results while a new search loads, rather than
    // dropping back to skeletons on every keystroke.
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchWithAuth<AdminUser[]>(
        adminPath(`/users${qs ? `?${qs}` : ''}`),
        token!,
      ),
    enabled: !!token,
  });
};

/**
 * Change a user's role between student, teacher and content editor. Admin
 * accounts are not reassignable — the server rejects that with a 400.
 *
 * It also rejects with a 409 (surfaced as the thrown Error's message) when the
 * user is still connected to any classes, since a teacher who still owns
 * classrooms would strand them.
 *
 * The new role reaches the affected user's own browser only once their cached
 * session and profile expire — tell them to sign out and back in if it needs to
 * be immediate.
 */
export const useUpdateUserRole = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; role: AdminUser['role'] },
    Error,
    { id: string; role: 'teacher' | 'student' | 'editor' }
  >({
    mutationFn: ({ id, role }) =>
      fetchWithAuth<{ id: string; role: AdminUser['role'] }>(
        adminPath(`/users/${id}/role`),
        token!,
        { method: 'PATCH', body: JSON.stringify({ role }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
};
