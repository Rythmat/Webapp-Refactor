import SuperJSON from 'superjson';
import { authFetch } from '@/auth/authFetch';
import { Env } from '@/constants/env';
import type {
  ExperienceAwardResponse,
  ArcadeAwardResponse,
  ExperienceSummaryResponse,
} from './types';

export function normalizedApiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

/**
 * Route path for a section of `music-atlas-api`. When the base URL already
 * ends in `/api` (some proxy setups) we drop the redundant prefix; otherwise
 * we prepend `/api`. Kept as one helper so both experience/challenges paths
 * agree on the convention.
 */
export function apiSectionPath(section: string, path: string) {
  const base = normalizedApiBase();
  const prefix = base.endsWith('/api') ? `/${section}` : `/api/${section}`;
  return `${prefix}${path}`;
}

function experiencePath(path: string) {
  return apiSectionPath('experience', path);
}

function parseApiResponse(text: string): unknown {
  if (!text) return undefined;
  try {
    return SuperJSON.parse(text);
  } catch {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
}

export async function apiRequest<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST' | 'PUT';
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const response = await authFetch(
    `${normalizedApiBase()}${path}`,
    params.token,
    {
      method: params.method ?? 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: params.body != null ? JSON.stringify(params.body) : undefined,
    },
  );

  const text = await response.text();
  const parsed = parseApiResponse(text);

  if (!response.ok) {
    const parsedObj =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as { message?: string; error?: string })
        : undefined;
    const message =
      parsedObj?.message ?? parsedObj?.error ?? 'API request failed';
    throw new Error(
      `${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
    );
  }

  return parsed as T;
}

export const experienceApi = {
  awardLessonActivity: (token: string, activityId: string) =>
    apiRequest<ExperienceAwardResponse>(experiencePath('/lesson-activity'), {
      token,
      method: 'POST',
      body: { activityId },
    }),

  awardLessonCompletion: (token: string, lessonId: string) =>
    apiRequest<ExperienceAwardResponse>(experiencePath('/lesson'), {
      token,
      method: 'POST',
      body: { lessonId },
    }),

  awardArcade: (token: string) =>
    apiRequest<ArcadeAwardResponse>(experiencePath('/arcade'), {
      token,
      method: 'POST',
    }),

  fetchSummary: (token: string, days?: number) => {
    const query = days != null ? `?days=${days}` : '';
    return apiRequest<ExperienceSummaryResponse>(
      experiencePath(`/summary${query}`),
      { token },
    );
  },

  // ── Boost badge feed. Challenge XP + boost activation now happen on the
  // backend directly via /api/challenges/:id/complete and
  // /api/challenges/boost/claim (see src/lib/challenges/api.ts); the
  // frontend only READS the active window here. ──

  /** Current active XP boost (multiplier applied to all awards while active). */
  getBoost: (token: string) =>
    apiRequest<{ multiplier: number; expiresAt: string | null }>(
      experiencePath('/boost'),
      { token },
    ),
};
