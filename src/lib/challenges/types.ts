export type ChallengeStatus = 'active' | 'completed' | 'expired';

export type ChallengeCriteria =
  | { kind: 'complete_lesson'; lessonId: string }
  | { kind: 'complete_activity'; activityId: string }
  | { kind: 'arcade_streak'; game: string; threshold: number }
  | { kind: 'studio_invite'; minInvites: number }
  | { kind: 'studio_session'; minMinutes: number };

export interface Challenge {
  id: string;
  name: string;
  xpReward: number;
  route?: string;
  deadline: string;
  status: ChallengeStatus;
  criteria: ChallengeCriteria;
  completedAt?: string;
}

export interface ChallengesListResponse {
  challenges: Challenge[];
}

export type ChallengeEvent =
  | { kind: 'lesson_completed'; lessonId: string }
  | { kind: 'activity_completed'; activityId: string; lessonId?: string }
  | { kind: 'arcade_streak'; game: string; count: number }
  | { kind: 'studio_invite'; roomId?: string };
