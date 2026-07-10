// ── Shared helpers for the Bio API ───────────────────────────────────────
// Per-user music bio (instruments / genres / focus / visibility) persisted in
// Upstash Redis, mirroring api/connections/*. Auth (Auth0 `sub` == app user id)
// and the Redis client are reused from ../collab/_utils.

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils';

export type ProfileVisibility = 'public' | 'private';

// Kept in sync with src/types/userProfile.ts (the api/ build can't import from
// src/, same as api/connections/_utils redefining ConnectionSets).
export interface UserBioPreferences {
  instruments: string[];
  genres: string[];
  focus: string[];
  visibility?: ProfileVisibility;
}

export const EMPTY_BIO: UserBioPreferences = {
  instruments: [],
  genres: [],
  focus: [],
  visibility: 'public',
};

// Redis key, one JSON value per user:  bio:<id>
const BIO_PREFIX = 'bio:';
export const bioKey = (userId: string): string => `${BIO_PREFIX}${userId}`;

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Coerce arbitrary request input into a safe UserBioPreferences. */
export function sanitizeBio(input: unknown): UserBioPreferences {
  const b = (input ?? {}) as Record<string, unknown>;
  return {
    instruments: asStrings(b.instruments),
    genres: asStrings(b.genres),
    focus: asStrings(b.focus),
    visibility: b.visibility === 'private' ? 'private' : 'public',
  };
}

export async function getBio(
  redis: Redis,
  userId: string,
): Promise<UserBioPreferences> {
  const bio = await redis.get<UserBioPreferences>(bioKey(userId));
  return bio ?? EMPTY_BIO;
}

export async function setBio(
  redis: Redis,
  userId: string,
  bio: UserBioPreferences,
): Promise<void> {
  await redis.set(bioKey(userId), bio);
}

/**
 * Public bios for the given ids, keyed by id. Users with no stored bio or with
 * `visibility: 'private'` are omitted — so a private user never leaks into
 * another user's discovery list.
 */
export async function getPublicBios(
  redis: Redis,
  ids: string[],
): Promise<Record<string, UserBioPreferences>> {
  if (ids.length === 0) return {};
  const raw = await Promise.all(
    ids.map((id) => redis.get<UserBioPreferences>(bioKey(id))),
  );
  const out: Record<string, UserBioPreferences> = {};
  ids.forEach((id, i) => {
    const bio = raw[i];
    if (bio && bio.visibility !== 'private') out[id] = bio;
  });
  return out;
}
