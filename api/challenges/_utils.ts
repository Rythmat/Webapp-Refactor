// ── Shared helpers for the Challenges generator API ──────────────────────
// Generates + persists a per-user daily/weekly challenge set (personalized from
// a client-supplied interest profile) in Upstash Redis, keyed by user id.
// Mirrors api/avatar-config/*; auth + Redis client reused from ../collab.

import type { Redis } from '@upstash/redis';

export { getRedis, verifyAuthToken } from '../collab/_utils';

// Kept in sync with src/lib/challenges/types.ts (the subset we generate).
export type ChallengeCriteria =
  | { kind: 'complete_lesson'; lessonId?: string; genre?: string }
  | { kind: 'arcade_streak'; game?: string; threshold: number }
  | { kind: 'studio_invite'; minInvites: number };

export interface GenChallenge {
  id: string;
  name: string;
  xpReward: number;
  route?: string;
  deadline: string; // ISO
  criteria: ChallengeCriteria;
}

export interface BoostState {
  pending: boolean;
  multiplier: number;
  durationMs: number;
  claimableAt: number; // ms epoch
  claimedAt?: number;
  earnedForDate?: string; // dateKey the boost was earned (dedupe per day)
}

export interface ChallengesState {
  daily: { periodKey: string; challenges: GenChallenge[] };
  weekly: { periodKey: string; challenges: GenChallenge[] };
  completed: Record<string, number>; // challengeId → completedAt ms
  boost: BoostState | null;
}

const PREFIX = 'challenges:';
export const challengesKey = (userId: string): string => `${PREFIX}${userId}`;

export async function getState(
  redis: Redis,
  userId: string,
): Promise<ChallengesState | null> {
  return redis.get<ChallengesState>(challengesKey(userId));
}

export async function setState(
  redis: Redis,
  userId: string,
  state: ChallengesState,
): Promise<void> {
  await redis.set(challengesKey(userId), state);
}

// ── Period keys (UTC) ────────────────────────────────────────────────────
export function todayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
}

/** The Monday (UTC) of the given time's week — stable weekly period key. */
export function weekKey(now = Date.now()): string {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff),
  );
  return monday.toISOString().slice(0, 10);
}

export function endOfDayISO(dateKey: string): string {
  return `${dateKey}T23:59:59.999Z`;
}

export function endOfWeekISO(mondayKey: string): string {
  const d = new Date(`${mondayKey}T00:00:00.000Z`);
  const sun = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 6,
      23,
      59,
      59,
      999,
    ),
  );
  return sun.toISOString();
}

export type ChallengeStatus = 'active' | 'completed' | 'expired';

export function deriveStatus(
  c: GenChallenge,
  completedAt: number | undefined,
  now: number,
): ChallengeStatus {
  if (completedAt) return 'completed';
  if (Date.parse(c.deadline) < now) return 'expired';
  return 'active';
}
