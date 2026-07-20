// ── POST /api/challenges/boost/claim ─────────────────────────────────────
// Claims a pending 2× boost once it's claimable (next day). Marks it claimed in
// our Redis and returns { multiplier, durationMs } for the client to activate on
// the external experience backend (which owns the real XP multiplier).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, verifyAuthToken, getState, setState } from '../_utils';

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

  const redis = getRedis();
  const state = await getState(redis, auth.sub);
  const now = Date.now();
  if (
    !state ||
    !state.boost ||
    !state.boost.pending ||
    now < state.boost.claimableAt
  ) {
    res.status(400).json({ error: 'No boost to claim' });
    return;
  }

  const { multiplier, durationMs } = state.boost;
  state.boost = { ...state.boost, pending: false, claimedAt: now };
  await setState(redis, auth.sub, state);

  res.status(200).json({ multiplier, durationMs });
}
