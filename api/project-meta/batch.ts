// ── POST /api/project-meta/batch ─────────────────────────────────────────
// Resolve many projects' library metadata in one request (for the Studio
// Library list). Body: { ids: string[] } → { metas: { [id]: meta } }; ids
// without stored meta are omitted.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, getProjectMetas } from './_utils';

const MAX_IDS = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { ids } = (req.body ?? {}) as { ids?: unknown };
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    res.status(400).json({ error: 'Invalid body: need ids (string[])' });
    return;
  }

  const unique = [...new Set(ids as string[])].slice(0, MAX_IDS);
  const redis = getRedis();
  const metas = await getProjectMetas(redis, unique);
  res.status(200).json({ metas });
}
