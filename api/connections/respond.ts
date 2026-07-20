// ── POST /api/connections/respond ────────────────────────────────────────
// Accept or decline a pending incoming connection request. Applied atomically
// (Lua): accept adds both accepted sides and clears both pendings; decline
// clears both pendings — never a half-applied state.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, respondConnectionTx } from './_utils';

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

  const me = auth.sub;
  const { requesterId, accept } = req.body ?? {};
  if (
    !requesterId ||
    typeof requesterId !== 'string' ||
    typeof accept !== 'boolean'
  ) {
    res.status(400).json({
      error: 'Invalid body: need requesterId (string) and accept (boolean)',
    });
    return;
  }

  const redis = getRedis();
  const result = await respondConnectionTx(redis, me, requesterId, accept);
  if (result === 'notfound') {
    res.status(404).json({ error: 'No pending request from that user' });
    return;
  }

  res.status(200).json({ success: true, accepted: accept });
}
