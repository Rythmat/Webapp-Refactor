// ── Shared helpers for the Avatar Config API ─────────────────────────────
// Persists each user's avatar config (an opaque JSON blob — the frontend
// AvatarConfig, incl. custom palette colours) in Upstash Redis, keyed by user
// id. Mirrors api/connections/*; auth + Redis client reused from ../collab.

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils.js';

const PREFIX = 'avatar:config:';
export const avatarKey = (userId: string): string => `${PREFIX}${userId}`;

/** The stored config is treated as an opaque JSON object here (validated FE-side). */
export type StoredAvatarConfig = Record<string, unknown>;

export async function getAvatarConfig(
  redis: Redis,
  userId: string,
): Promise<StoredAvatarConfig | null> {
  return redis.get<StoredAvatarConfig>(avatarKey(userId));
}

export async function setAvatarConfig(
  redis: Redis,
  userId: string,
  config: StoredAvatarConfig,
): Promise<void> {
  await redis.set(avatarKey(userId), config);
}

/** Resolve many users' configs in one round-trip; ids without one are omitted. */
export async function getAvatarConfigs(
  redis: Redis,
  userIds: string[],
): Promise<Record<string, StoredAvatarConfig>> {
  if (userIds.length === 0) return {};
  const values = await redis.mget<(StoredAvatarConfig | null)[]>(
    ...userIds.map(avatarKey),
  );
  const out: Record<string, StoredAvatarConfig> = {};
  userIds.forEach((id, i) => {
    const v = values[i];
    if (v) out[id] = v;
  });
  return out;
}
