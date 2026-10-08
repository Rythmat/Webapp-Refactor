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

async function request<T>(
  path: string,
  params: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const response = await authFetch(`${apiBase()}${path}`, params.token, {
    method: params.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: params.body != null ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let message: string;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? text.slice(0, 200);
    } catch {
      message = text.slice(0, 200) || `HTTP ${response.status}`;
    }
    throw new Error(
      `${params.method ?? 'GET'} ${path} failed (${response.status}): ${message}`,
    );
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
  list: (token: string) =>
    request<StudioProjectSummary[]>(projectsPath(), { token }),

  get: (token: string, id: string) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), { token }),

  create: (token: string, body: StudioProjectInput) =>
    request<StudioProjectDetail>(projectsPath(), {
      token,
      method: 'POST',
      body,
    }),

  update: (token: string, id: string, body: StudioProjectInput) =>
    request<StudioProjectDetail>(projectsPath(`/${id}`), {
      token,
      method: 'PUT',
      body,
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
      new CustomEvent('ma-studio-project-deleted', { detail: { id } }),
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
