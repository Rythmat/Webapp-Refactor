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

function progressPath(path: '/summary' | '/lesson' | '/activity' | '/lessonState') {
  const base = apiBase().replace(/\/+$/, '');
  const prefix = base.endsWith('/api') ? '/progress' : '/api/progress';
  return `${prefix}${path}`;
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
  let parsed: any = undefined;
  if (text) {
    try {
      parsed = SuperJSON.parse(text);
    } catch {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }
  }

  if (!response.ok) {
    const message =
      parsed?.message ||
      parsed?.error ||
      (typeof parsed?.raw === 'string' ? parsed.raw.slice(0, 200) : undefined) ||
      'Progress request failed';
    throw new Error(`${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`);
  }

  return parsed as T;
}

export const progressApi = {
  fetchSummary: (token: string) =>
    apiRequest<ProgressSummaryResponse>(progressPath('/summary'), { token }),
  fetchLesson: (token: string, lessonId: string, lessonVersion: number) =>
    apiRequest<LessonProgressResponse>(
      `${progressPath('/lesson')}?lessonId=${encodeURIComponent(lessonId)}&lessonVersion=${lessonVersion}`,
      { token },
    ),
  patchActivity: (token: string, body: ProgressActivityPatch) =>
    apiRequest<{ activity: unknown }>(progressPath('/activity'), {
      token,
      method: 'PATCH',
      body,
    }),
  patchLessonState: (token: string, body: LessonStatePatch) =>
    apiRequest<{ lessonState: unknown }>(progressPath('/lessonState'), {
      token,
      method: 'PATCH',
      body,
    }),
};
