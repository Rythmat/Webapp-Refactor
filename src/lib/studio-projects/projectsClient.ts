/**
 * The Studio projects REST client: the request shapes and the calls, and
 * nothing of the editor. The dashboard's recent-projects lists load it on
 * every route, so it must not import the DAW store, the session serializer or
 * the save-status store; the save path that needs them lives in ./api, which
 * re-exports all of this and loads with the editor.
 */
import SuperJSON from 'superjson';
import { authFetch } from '@/auth/authFetch';
import { Env } from '@/constants/env';
import type { MidiClipColumnar } from '@/daw/persistence/SessionSerializer';
import { PROJECT_DELETED_EVENT } from './projectEvents';
import { isAbortLike, StudioApiError } from './studioApiError';

export {
  classifyStudioFailure,
  isStudioApiError,
  StudioApiError,
  type StudioFailureKind,
} from './studioApiError';

// ── Shapes mirrored from music-atlas-api/src/services/studio-projects ────

export interface StudioProjectAudioClipInput {
  assetId: string;
  startTick: number;
  duration: number;
  offsetSeconds?: number;
  gain?: number;
  fadeInTicks?: number;
  fadeOutTicks?: number;
}

export interface StudioProjectAudioClip extends StudioProjectAudioClipInput {
  id: string;
  offsetSeconds: number;
  gain: number;
  fadeInTicks: number;
  fadeOutTicks: number;
}

export interface StudioProjectTrackInput {
  name: string;
  type: 'midi' | 'audio';
  instrument: string;
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  activeEffects: string[];
  midiClips: MidiClipColumnar[];
  audioClips: StudioProjectAudioClipInput[];
}

export interface StudioProjectInput {
  name: string;
  composerName?: string | null;
  bpm: number;
  prism: {
    rootNote: number | null;
    rhythmName: string;
    genre: string;
    swing: number;
  };
  tracks: StudioProjectTrackInput[];
}

/**
 * How the user files a project in the Studio Library. Stored as columns on
 * `studio_project` and returned with every summary, so the Library needs no
 * second request. Written only via `patchMeta` — never by `update`, which is a
 * full replace of the project's track tree.
 */
export interface StudioProjectLibraryMeta {
  libraryGenre: string | null;
  libraryStatus: string | null;
  libraryInstruments: string[];
  collaborators: string[];
}

export interface StudioProjectSummary extends StudioProjectLibraryMeta {
  id: string;
  name: string;
  composerName: string | null;
  bpm: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioProjectTrack extends StudioProjectTrackInput {
  id: string;
  ordinal: number;
  audioClips: StudioProjectAudioClip[];
}

export interface StudioProjectDetail extends StudioProjectSummary {
  prism: StudioProjectInput['prism'];
  tracks: StudioProjectTrack[];
}

/**
 * A server timestamp as an ISO string, as drafts and the save chip keep it
 * (compared only with other server values): the client parses responses
 * with SuperJSON, so it may be a Date, or a string from a plain JSON body.
 */
export function serverTimeIso(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

// ── Path / fetch helpers ─────────────────────────────────────────────────

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

function projectsPath(suffix = '') {
  const base = apiBase();
  // Studio controller mounts at /api/studio; tolerate a base that already ends in /api.
  const prefix = base.endsWith('/api')
    ? '/studio/projects'
    : '/api/studio/projects';
  return `${prefix}${suffix}`;
}

/**
 * Options a request takes: a signal to abort it (a superseded open, a save's
 * timeout).
 */
export interface StudioRequestOptions {
  signal?: AbortSignal;
}

/**
 * One request. Every failure is a StudioApiError: the HTTP status (0 when no
 * answer came back), the JSON error's code, the method and the path, with
 * today's message for logs. An abort (the caller's signal, or a timeout) is
 * rethrown as it came, an AbortError or TimeoutError, so the caller can tell
 * its own cancel apart.
 */
async function request<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token: string;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const method = params.method ?? 'GET';
  let response: Response;
  let text: string;
  try {
    response = await authFetch(`${apiBase()}${path}`, params.token, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: params.body != null ? JSON.stringify(params.body) : undefined,
      signal: params.signal,
    });
    text = await response.text();
  } catch (err) {
    if (isAbortLike(err)) throw err;
    throw new StudioApiError({
      status: 0,
      method,
      path,
      message: `${method} ${path} failed (network): ${
        err instanceof Error ? err.message : String(err)
      }`,
      cause: err,
    });
  }

  if (!response.ok) {
    let message: string;
    let code: string | null = null;
    try {
      const parsed = JSON.parse(text) as {
        error?: unknown;
        message?: unknown;
        code?: unknown;
      };
      const said =
        typeof parsed.error === 'string'
          ? parsed.error
          : typeof parsed.message === 'string'
            ? parsed.message
            : null;
      message = said ?? text.slice(0, 200);
      if (typeof parsed.code === 'string') code = parsed.code;
    } catch {
      message = text.slice(0, 200) || `HTTP ${response.status}`;
    }
    throw new StudioApiError({
      status: response.status,
      code,
      method,
      path,
      message: `${method} ${path} failed (${response.status}): ${message}`,
    });
  }

  if (!text) return undefined as T;
  try {
    return SuperJSON.parse(text) as T;
  } catch {
    return JSON.parse(text) as T;
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export const studioProjectsApi = {
  list: (token: string, opts: StudioRequestOptions = {}) =>
    request<StudioProjectSummary[]>(projectsPath(), {
      token,
      signal: opts.signal,
    }),

  get: (token: string, id: string, opts: StudioRequestOptions = {}) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), {
      token,
      signal: opts.signal,
    }),

  create: (
    token: string,
    body: StudioProjectInput,
    opts: StudioRequestOptions = {},
  ) =>
    request<StudioProjectDetail>(projectsPath(), {
      token,
      method: 'POST',
      body,
      signal: opts.signal,
    }),

  update: (
    token: string,
    id: string,
    body: StudioProjectInput,
    opts: StudioRequestOptions = {},
  ) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), {
      token,
      method: 'PUT',
      body,
      signal: opts.signal,
    }),

  /**
   * Update only the Library filing tags. Touches four scalar columns and no
   * track rows, so it is safe to call from the Library — which holds a project
   * summary with no track data and could not safely use `update`.
   */
  patchMeta: (
    token: string,
    id: string,
    meta: Partial<StudioProjectLibraryMeta>,
  ) =>
    request<StudioProjectLibraryMeta>(projectsPath(`/${id}/meta`), {
      token,
      method: 'PATCH',
      body: meta,
    }),

  remove: async (token: string, id: string) => {
    const result = await request<{ id: string; deletedAt: Date }>(
      projectsPath(`/${id}`),
      { token, method: 'DELETE' },
    );
    // Any set list carrying a page printed from this project keeps the page —
    // that is the promise — but the link to a project that no longer exists
    // is cut, so the Studio stops offering to update it.
    window.dispatchEvent(
      new CustomEvent(PROJECT_DELETED_EVENT, { detail: { id } }),
    );
    return result;
  },

  /**
   * Eagerly delete any `pending` AudioAsset rows + their bucket objects for
   * a single project. Used when the user explicitly abandons the project (e.g.
   * File → New Project) so failed-upload orphans don't wait for the global
   * hourly cron.
   */
  cleanupPendingAssets: (token: string, id: string) =>
    request<{ deletedRows: number; bucketDeleteFailures: number }>(
      projectsPath(`/${id}/cleanup-pending-assets`),
      { token, method: 'POST' },
    ),
};
