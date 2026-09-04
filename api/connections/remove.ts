// ── POST /api/connections/remove ─────────────────────────────────────────
// Remove an accepted connection (both directions) or cancel a pending request
// (either direction) with the given user. Applied atomically (Lua).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, removeConnectionTx } from './_utils.js';

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
  const { userId } = req.body ?? {};
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Invalid body: need userId' });
    return;
  }

  const redis = getRedis();
  await removeConnectionTx(redis, me, userId);
  res.status(200).json({ success: true });
}
