import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import type {
  ExperienceAwardResponse,
  ArcadeAwardResponse,
  ExperienceSummaryResponse,
} from './types';

function normalizedApiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function experiencePath(path: string) {
  const base = normalizedApiBase();
  const prefix = base.endsWith('/api') ? '/experience' : '/api/experience';
  return `${prefix}${path}`;
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

async function apiRequest<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST';
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.token}`,
    'Content-Type': 'application/json',
  };
  const appSessionId = getCurrentAppSessionId();
  if (appSessionId) {
    headers['X-App-Session'] = appSessionId;
  }

  const response = await fetch(`${normalizedApiBase()}${path}`, {
    method: params.method ?? 'GET',
    headers,
    body: params.body != null ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  const parsed = parseApiResponse(text);

  if (!response.ok) {
    const parsedObj =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as { message?: string; error?: string })
        : undefined;
    const message =
      parsedObj?.message ?? parsedObj?.error ?? 'Experience request failed';
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
};
