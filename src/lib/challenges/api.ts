// Client for the backend-owned challenge system in music-atlas-api. Generation,
// storage, statuses, and XP now all live server-side (deterministic per-period
// generator ported from our old serverless api/challenges/*, persisted in
// user_challenge_state). Completion grants XP directly; claiming a boost
// activates it directly. See docs/challenges-rewards-contract.md.
import { apiRequest, apiSectionPath } from '../experience/api';
import type { ExperienceSummaryResponse } from '../experience/types';
import type {
  Challenge,
  ChallengesListResponse,
  InterestProfile,
} from './types';

function challengesPath(path: string) {
  return apiSectionPath('challenges', path);
}

export const challengesApi = {
  fetchList: (token: string, profile: InterestProfile) =>
    apiRequest<ChallengesListResponse>(challengesPath('/list'), {
      token,
      method: 'POST',
      body: { profile },
    }),

  complete: (token: string, id: string, evidence?: Record<string, unknown>) =>
    apiRequest<{
      challenge: Challenge;
      boostEarned?: boolean;
      experience?: ExperienceSummaryResponse;
    }>(challengesPath(`/${encodeURIComponent(id)}/complete`), {
      token,
      method: 'POST',
      body: { evidence },
    }),

  /**
   * Claim the earned Double-XP boost — activates it directly on the backend
   * and returns the active window `{ multiplier, expiresAt }`. (Pre-cutover
   * this returned `{ multiplier, durationMs }` and required a follow-up
   * `startBoost` call; that dance is now server-side.)
   */
  claimBoost: (token: string) =>
    apiRequest<{ multiplier: number; expiresAt: string | null }>(
      challengesPath('/boost/claim'),
      { token, method: 'POST' },
    ),
};
