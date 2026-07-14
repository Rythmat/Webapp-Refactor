// ── POST /api/challenges/:id/complete ────────────────────────────────────
// Marks a challenge complete (trusts the client's criteria match — same model
// as the external backend's evidence). Completing ALL of today's daily items
// earns a 2× XP boost claimable tomorrow.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRedis,
  verifyAuthToken,
  getState,
  setState,
  todayKey,
  deriveStatus,
} from '../_utils';

const BOOST_MULTIPLIER = 2;
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;

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

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: 'Missing challenge id' });
    return;
  }

  const redis = getRedis();
  const state = await getState(redis, auth.sub);
  if (!state) {
    res.status(404).json({ error: 'No challenges' });
    return;
  }

  const now = Date.now();
  const challenge = [
    ...state.daily.challenges,
    ...state.weekly.challenges,
  ].find((c) => c.id === id);
  if (!challenge) {
    res.status(404).json({ error: 'Unknown challenge' });
    return;
  }

  if (!state.completed[id]) state.completed[id] = now;

  // Earn a boost when every daily challenge is done (once per day).
  const dKey = todayKey(now);
  const dailyAllDone = state.daily.challenges.every(
    (c) => state.completed[c.id],
  );
  const alreadyEarnedToday = state.boost?.earnedForDate === dKey;
  let boostEarned = false;
  if (dailyAllDone && !alreadyEarnedToday) {
    const tomorrow = Date.parse(`${dKey}T00:00:00.000Z`) + 24 * 60 * 60 * 1000;
    state.boost = {
      pending: true,
      multiplier: BOOST_MULTIPLIER,
      durationMs: BOOST_DURATION_MS,
      claimableAt: tomorrow,
      earnedForDate: dKey,
    };
    boostEarned = true;
  }

  await setState(redis, auth.sub, state);

  res.status(200).json({
    challenge: {
      ...challenge,
      status: deriveStatus(challenge, state.completed[id], now),
      completedAt: new Date(state.completed[id]).toISOString(),
    },
    boostEarned,
  });
}
