// Client for our serverless challenge generator (api/challenges/*, Upstash
// Redis). Same-origin `/api/challenges` (like avatar-config), not the external
// backend — generation + completion + boost scheduling are ours.
import type {
  Challenge,
  ChallengesListResponse,
  InterestProfile,
} from './types';

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export const challengesApi = {
  fetchList: (token: string, profile: InterestProfile) =>
    request<ChallengesListResponse>('/api/challenges/list', token, {
      method: 'POST',
      body: JSON.stringify({ profile }),
    }),

  complete: (token: string, id: string, evidence?: Record<string, unknown>) =>
    request<{ challenge: Challenge; boostEarned?: boolean }>(
      `/api/challenges/${encodeURIComponent(id)}/complete`,
      token,
      { method: 'POST', body: JSON.stringify({ evidence }) },
    ),

  claimBoost: (token: string) =>
    request<{ multiplier: number; durationMs: number }>(
      '/api/challenges/boost/claim',
      token,
      { method: 'POST' },
    ),
};
