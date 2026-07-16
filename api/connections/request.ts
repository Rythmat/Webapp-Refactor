// ── POST /api/connections/request ────────────────────────────────────────
// Send a connection request to another user (by their app user id). If that
// user has already requested me (reciprocal), we connect immediately. The
// state change is applied atomically (Lua) so the graph stays symmetric.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, requestConnectionTx } from './_utils';

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

  const me = auth.sub;
  const { targetUserId } = req.body ?? {};
  if (!targetUserId || typeof targetUserId !== 'string') {
    res.status(400).json({ error: 'Invalid body: need targetUserId' });
    return;
  }
  if (targetUserId === me) {
    res.status(400).json({ error: 'Cannot connect with yourself' });
    return;
  }

  const redis = getRedis();
  const status = await requestConnectionTx(redis, me, targetUserId);
  res.status(200).json({ status });
}
