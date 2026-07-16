// ── /api/bio ─────────────────────────────────────────────────────────────
// GET  → the authenticated user's music bio (instruments/genres/focus/visibility).
// PUT  → replace the authenticated user's bio (only ever writes your own).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getBio,
  setBio,
  sanitizeBio,
} from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const auth = await verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const redis = getRedis();

  if (req.method === 'GET') {
    const bio = await getBio(redis, auth.sub);
    res.status(200).json(bio);
    return;
  }

  if (req.method === 'PUT') {
    const bio = sanitizeBio(req.body);
    await setBio(redis, auth.sub, bio);
    res.status(200).json(bio);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
