import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

// ─── Response Types ───────────────────────────────────────────────────────────

export interface QueryStatement {
  queryid: string;
  calls: number;
  totalSeconds: number;
  meanMs: number;
  rows: number;
  /** null when the statement has touched no blocks at all. */
  cacheHitPct: number | null;
  tempSpilledBytes: number;
  statsSince: Date | null;
  query: string;
}

export interface QueryStatsData {
  /** False when the `diagnostics` schema has not been applied to this database. */
  installed: boolean;
  snapshotsAvailable: boolean;
  collectingSince: Date | null;
  statementCount: number;
  statements: QueryStatement[];
}

export interface QueryDeltaRow {
  queryid: string;
  calls: number;
  totalSeconds: number;
  rows: number;
  /**
   * True when the previous snapshot held no comparable baseline for this
   * statement — the compute restarted, counters were reset, or the statement
   * was first seen inside the window. Its numbers are a lower bound.
   */
  countersWereReset: boolean;
  query: string;
}

export interface QueryDeltaData {
  installed: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  rows: QueryDeltaRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/admin/database${path}`;
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
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return SuperJSON.parse(text) as T;
}

function buildQuery(params: Record<string, string | number | boolean>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    sp.set(key, String(value));
  }
  return `?${sp.toString()}`;
}

const QUERY_STATS_KEY = ['admin', 'database', 'query-stats'] as const;
const QUERY_DELTA_KEY = ['admin', 'database', 'query-delta'] as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useAdminQueryStats = (params: {
  limit?: number;
  includeInternal?: boolean;
}) => {
  const { token, appSessionId } = useAuthContext();

  return useQuery<QueryStatsData>({
    queryKey: [...QUERY_STATS_KEY, params],
    queryFn: () =>
      fetchWithAuth<QueryStatsData>(
        adminPath(
          `/query-stats${buildQuery({
            limit: params.limit ?? 50,
            includeInternal: params.includeInternal ?? false,
          })}`,
        ),
        token!,
      ),
    enabled: !!token && !!appSessionId,
  });
};

export const useAdminQueryDelta = (params: {
  limit?: number;
  includeInternal?: boolean;
}) => {
  const { token, appSessionId } = useAuthContext();

  return useQuery<QueryDeltaData>({
    queryKey: [...QUERY_DELTA_KEY, params],
    queryFn: () =>
      fetchWithAuth<QueryDeltaData>(
        adminPath(
          `/query-delta${buildQuery({
            limit: params.limit ?? 50,
            includeInternal: params.includeInternal ?? false,
          })}`,
        ),
        token!,
      ),
    enabled: !!token && !!appSessionId,
  });
};

/**
 * Persists the current counters. Needed because pg_stat_statements keeps them
 * in shared memory, where a Neon compute suspend wipes them.
 */
export const useCaptureQuerySnapshot = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<{ captured: number }, Error, void>({
    mutationFn: () =>
      fetchWithAuth<{ captured: number }>(adminPath('/snapshot'), token!, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_DELTA_KEY });
      queryClient.invalidateQueries({ queryKey: QUERY_STATS_KEY });
    },
  });
};
