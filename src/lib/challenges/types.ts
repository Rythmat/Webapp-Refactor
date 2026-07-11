export type ChallengeStatus = 'active' | 'completed' | 'expired';

export type ChallengeCriteria =
  // `lessonId` → that exact lesson; else `genre` → any curriculum lesson in that
  // genre; else (neither) → any lesson completed.
  | { kind: 'complete_lesson'; lessonId?: string; genre?: string }
  | { kind: 'complete_activity'; activityId: string }
  // `game` → that game; else → any arcade game reaching the streak threshold.
  | { kind: 'arcade_streak'; game?: string; threshold: number }
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

/** A pending/claimable 2× boost earned by completing all of a day's challenges. */
export interface ChallengeBoost {
  pending: boolean;
  multiplier: number;
  claimableAt: number; // ms epoch — claimable once now ≥ this
}

export interface ChallengesListResponse {
  challenges: Challenge[];
  boost?: ChallengeBoost | null;
}

/** Client-derived interest profile sent to the generator. */
export interface InterestGenre {
  key: string; // CurriculumGenreId (e.g. 'JAZZ') — matches `complete_lesson.genre`
  display: string; // e.g. 'Jazz'
  slug: string; // e.g. 'jazz'
}
export interface InterestProfile {
  genres: InterestGenre[];
  focus: string[];
}

export type ChallengeEvent =
  | { kind: 'lesson_completed'; lessonId: string }
  | { kind: 'activity_completed'; activityId: string; lessonId?: string }
  | { kind: 'arcade_streak'; game: string; count: number }
  | { kind: 'studio_invite'; roomId?: string };
