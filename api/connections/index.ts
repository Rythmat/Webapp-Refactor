// ── GET /api/connections ─────────────────────────────────────────────────
// Returns the authenticated user's connection graph: accepted (mutual)
// connections, plus pending incoming (awaiting my accept) and outgoing
// (awaiting their accept) requests.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, getConnectionSets } from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = verifyAuthToken(req.headers.authorization ?? null);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const redis = getRedis();
  const sets = await getConnectionSets(redis, auth.sub);
  res.status(200).json(sets);
}
