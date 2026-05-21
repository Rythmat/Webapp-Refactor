import SuperJSON from 'superjson';
import { Env } from '@/constants/env';
import type { ChallengesListResponse } from './types';

function normalizedApiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function challengesPath(path: string) {
  const base = normalizedApiBase();
  const prefix = base.endsWith('/api') ? '/challenges' : '/api/challenges';
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
  const response = await fetch(`${normalizedApiBase()}${path}`, {
    method: params.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
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
      parsedObj?.message ?? parsedObj?.error ?? 'Challenges request failed';
    throw new Error(
      `${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
    );
  }

  return parsed as T;
}

export const challengesApi = {
  fetchList: (token: string) =>
    apiRequest<ChallengesListResponse>(challengesPath('/list'), { token }),
};
