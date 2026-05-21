export interface Challenge {
  id: string;
  name: string;
  durationLabel: string;
  xpReward: number;
  route?: string;
}

export interface ChallengesListResponse {
  challenges: Challenge[];
}
