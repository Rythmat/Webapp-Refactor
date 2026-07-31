import SuperJSON from 'superjson';
import { authFetch } from '@/auth/authFetch';
import { Env } from '@/constants/env';

/**
 * Options for one game, as stored under its id in the user's `user_game_options`
 * row. The shape is owned by each game — the API only shallow-merges it.
 */
export type GameOptions = Record<string, unknown>;
/** gameId -> that game's options. */
export type GameOptionsMap = Record<string, GameOptions>;

function normalizedApiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function gameOptionsPath(suffix = '') {
  const base = normalizedApiBase();
  // Mirrors progress/api.ts: some deployments already end in /api.
  const prefix = base.endsWith('/api') ? '/game-options' : '/api/game-options';
  return `${prefix}${suffix}`;
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
  params: { method?: 'GET' | 'PATCH'; token: string; body?: unknown },
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

  const parsed = parseApiResponse(await response.text());

  if (!response.ok) {
    const message =
      (typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as { error?: unknown }).error === 'string' &&
        (parsed as { error: string }).error) ||
      'Game options request failed';
    throw new Error(
      `${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
    );
  }

  return parsed as T;
}

export const gameOptionsApi = {
  fetchAll: (token: string) =>
    apiRequest<{ options: GameOptionsMap }>(gameOptionsPath(), { token }),
  patchGame: (token: string, game: string, options: GameOptions) =>
    apiRequest<{ options: GameOptionsMap }>(
      gameOptionsPath(`/${encodeURIComponent(game)}`),
      { token, method: 'PATCH', body: { options } },
    ),
};
