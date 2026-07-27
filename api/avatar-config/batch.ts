// ── POST /api/avatar-config/batch ────────────────────────────────────────
// Resolve many users' avatar configs in one request (for showing other users'
// avatars in Connect). Body: { ids: string[] } → { configs: { [id]: config } };
// ids without a stored config are omitted.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, getAvatarConfigs } from './_utils';

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

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
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
  const configs = await getAvatarConfigs(redis, unique);
  res.status(200).json({ configs });
}
