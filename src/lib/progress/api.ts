import SuperJSON from 'superjson';
import { Env } from '@/constants/env';
import type {
  LessonProgressResponse,
  LessonStatePatch,
  ProgressActivityPatch,
  ProgressSummaryResponse,
} from './types';

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL');
}

async function apiRequest<T>(path: string, params: {
  method?: 'GET' | 'PATCH';
  token: string;
  body?: unknown;
}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: params.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: params.body != null ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? (SuperJSON.parse(text) as any) : undefined;

  if (!response.ok) {
    throw new Error(parsed?.message || parsed?.error || 'Progress request failed');
  }

  return parsed as T;
}

export const progressApi = {
  fetchSummary: (token: string) =>
    apiRequest<ProgressSummaryResponse>('/api/progress/summary', { token }),
  fetchLesson: (token: string, lessonId: string, lessonVersion: number) =>
    apiRequest<LessonProgressResponse>(
      `/api/progress/lesson?lessonId=${encodeURIComponent(lessonId)}&lessonVersion=${lessonVersion}`,
      { token },
    ),
  patchActivity: (token: string, body: ProgressActivityPatch) =>
    apiRequest<{ activity: unknown }>('/api/progress/activity', {
      token,
      method: 'PATCH',
      body,
    }),
  patchLessonState: (token: string, body: LessonStatePatch) =>
    apiRequest<{ lessonState: unknown }>('/api/progress/lessonState', {
      token,
      method: 'PATCH',
      body,
    }),
};
