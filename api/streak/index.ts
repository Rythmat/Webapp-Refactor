// ── /api/streak ──────────────────────────────────────────────────────────
// GET  → the authenticated user's learning-streak state.
// POST → a "learning ping": marks today as a learning day (idempotent), returns
//        the updated state. The server is the source of truth (anti-cheat).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getRecord,
  recordActiveDay,
  toState,
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
    res.status(200).json(toState(await getRecord(redis, auth.sub)));
    return;
  }

  if (req.method === 'POST') {
    res.status(200).json(toState(await recordActiveDay(redis, auth.sub)));
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
