// ── Shared helpers for the Project Meta API ──────────────────────────────
// Persists per-project library metadata the external projects backend can't
// hold — tags (genre / status / instruments) and a collaborator roster — in
// Upstash Redis, keyed by project id. Mirrors api/avatar-config/*; auth + Redis
// client reused from ../collab.

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils.js';

const PREFIX = 'project:meta:';
export const projectMetaKey = (projectId: string): string =>
  `${PREFIX}${projectId}`;

export interface StoredProjectMeta {
  ownerId: string; // auth.sub of the first writer; enforced on write/delete
  genre: string; // library label, separate from the DAW's prism.genre
  status: string; // one of PROJECT_STATUSES (or '' when unset)
  instruments: string[];
  collaborators: string[]; // app user ids (chosen from connections)
  updatedAt: number;
}

export async function getProjectMeta(
  redis: Redis,
  projectId: string,
): Promise<StoredProjectMeta | null> {
  return redis.get<StoredProjectMeta>(projectMetaKey(projectId));
}

export async function setProjectMeta(
  redis: Redis,
  projectId: string,
  meta: StoredProjectMeta,
): Promise<void> {
  await redis.set(projectMetaKey(projectId), meta);
}

export async function deleteProjectMeta(
  redis: Redis,
  projectId: string,
): Promise<void> {
  await redis.del(projectMetaKey(projectId));
}

/** Resolve many projects' meta in one round-trip; ids without one are omitted. */
export async function getProjectMetas(
  redis: Redis,
  projectIds: string[],
): Promise<Record<string, StoredProjectMeta>> {
  if (projectIds.length === 0) return {};
  const values = await redis.mget<(StoredProjectMeta | null)[]>(
    ...projectIds.map(projectMetaKey),
  );
  const out: Record<string, StoredProjectMeta> = {};
  projectIds.forEach((id, i) => {
    const v = values[i];
    if (v) out[id] = v;
  });
  return out;
}
