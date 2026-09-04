// Client for the per-user music bio in music-atlas-api (`user_bio` table).
//
// This replaces the serverless `api/bio/*` routes, which stored each bio in
// Upstash Redis under the caller's Auth0 `sub` while every id they were asked
// about was a `User.id` UUID — so `bio/list` never resolved anyone and Connect
// discovery was permanently empty. Both sides are now the application user id.
import type {
  ProfileVisibility,
  UserBioPreferences,
} from '@/types/userProfile';
import { apiRequest, apiSectionPath } from '../experience/api';

function bioPath(path = '') {
  return apiSectionPath('bio', path);
}

export const EMPTY_BIO: UserBioPreferences = {
  instruments: [],
  genres: [],
  focus: [],
  visibility: 'public',
};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

/** Coerce an API/localStorage value into a safe UserBioPreferences. */
export function normalizeBio(value: unknown): UserBioPreferences {
  const bio = (value ?? {}) as Record<string, unknown>;
  return {
    instruments: asStrings(bio.instruments),
    genres: asStrings(bio.genres),
    focus: asStrings(bio.focus),
    visibility: (bio.visibility === 'private'
      ? 'private'
      : 'public') as ProfileVisibility,
  };
}

export const bioApi = {
  /** The authenticated user's own bio. */
  fetchSelf: async (token: string): Promise<UserBioPreferences> =>
    normalizeBio(await apiRequest<unknown>(bioPath(), { token })),

  /** Replace the authenticated user's bio. */
  putSelf: async (
    token: string,
    bio: UserBioPreferences,
  ): Promise<UserBioPreferences> =>
    normalizeBio(
      await apiRequest<unknown>(bioPath(), {
        token,
        method: 'PUT',
        body: normalizeBio(bio),
      }),
    ),

  /**
   * Public bios among the given ids, keyed by id. Private profiles and users
   * with no stored bio are omitted server-side.
   */
  list: async (
    token: string,
    ids: string[],
  ): Promise<Record<string, UserBioPreferences>> => {
    if (ids.length === 0) return {};
    const raw = await apiRequest<Record<string, unknown>>(bioPath('/list'), {
      token,
      method: 'POST',
      body: { ids },
    });
    const out: Record<string, UserBioPreferences> = {};
    for (const [id, bio] of Object.entries(raw ?? {})) {
      out[id] = normalizeBio(bio);
    }
    return out;
  },
};
