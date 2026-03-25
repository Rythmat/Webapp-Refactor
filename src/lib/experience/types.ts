export interface DailyExperienceSummary {
  date: string;
  lessonActivityExperience: number;
  lessonExperience: number;
  arcadeExperience: number;
  totalExperience: number;
  arcadeCompletions: number;
}

export type ExperienceAwardReason =
  | 'granted'
  | 'already_completed'
  | 'daily_cap_reached';

export interface ExperienceAwardResponse {
  awarded: boolean;
  awardedExperience: number;
  reason: ExperienceAwardReason;
  totalExperience: number;
  level: number;
  today: DailyExperienceSummary;
}

export interface ArcadeAwardResponse extends ExperienceAwardResponse {
  remainingArcadeCapToday: number;
}

export interface ExperienceSummaryResponse {
  totalExperience: number;
  level: number;
  today: DailyExperienceSummary;
  timeline: DailyExperienceSummary[];
}
