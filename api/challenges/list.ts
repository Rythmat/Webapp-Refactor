// ── POST /api/challenges/list ────────────────────────────────────────────
// Body: { profile } (client-derived interest profile). Returns the user's
// current daily + weekly challenge set, regenerating on day/week rollover and
// persisting to Redis. Also returns the pending/claimable boost state.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generate,
  type InterestGenre,
  type InterestProfile,
} from './_generate';
import {
  getRedis,
  verifyAuthToken,
  getState,
  setState,
  todayKey,
  weekKey,
  deriveStatus,
  type ChallengesState,
  type GenChallenge,
} from './_utils';

function isGenre(g: unknown): g is InterestGenre {
  if (!g || typeof g !== 'object') return false;
  const o = g as Record<string, unknown>;
  return (
    typeof o.key === 'string' &&
    typeof o.display === 'string' &&
    typeof o.slug === 'string'
  );
}

function parseProfile(body: unknown): InterestProfile {
  const root =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const p =
    root.profile && typeof root.profile === 'object'
      ? (root.profile as Record<string, unknown>)
      : {};
  const genres = Array.isArray(p.genres)
    ? (p.genres.filter(isGenre) as InterestGenre[]).slice(0, 5)
    : [];
  const focus = Array.isArray(p.focus)
    ? p.focus.filter((f): f is string => typeof f === 'string').slice(0, 10)
    : [];
  return { genres, focus };
}

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

  const profile = parseProfile(req.body);
  const redis = getRedis();
  const now = Date.now();
  const dKey = todayKey(now);
  const wKey = weekKey(now);

  let state = await getState(redis, auth.sub);
  if (!state) {
    state = {
      daily: {
        periodKey: dKey,
        challenges: generate(profile, auth.sub, 'daily', dKey),
      },
      weekly: {
        periodKey: wKey,
        challenges: generate(profile, auth.sub, 'weekly', wKey),
      },
      completed: {},
      boost: null,
    };
    await setState(redis, auth.sub, state);
  } else {
    let dirty = false;
    if (state.daily.periodKey !== dKey) {
      state.daily = {
        periodKey: dKey,
        challenges: generate(profile, auth.sub, 'daily', dKey),
      };
      dirty = true;
    }
    if (state.weekly.periodKey !== wKey) {
      state.weekly = {
        periodKey: wKey,
        challenges: generate(profile, auth.sub, 'weekly', wKey),
      };
      dirty = true;
    }
    if (dirty) await setState(redis, auth.sub, state);
  }

  const settled: ChallengesState = state;
  const toResponse = (c: GenChallenge) => {
    const completedAt = settled.completed[c.id];
    return {
      ...c,
      status: deriveStatus(c, completedAt, now),
      completedAt: completedAt
        ? new Date(completedAt).toISOString()
        : undefined,
    };
  };

  res.status(200).json({
    challenges: [
      ...settled.daily.challenges.map(toResponse),
      ...settled.weekly.challenges.map(toResponse),
    ],
    boost: settled.boost
      ? {
          pending: settled.boost.pending,
          multiplier: settled.boost.multiplier,
          claimableAt: settled.boost.claimableAt,
        }
      : null,
  });
}
