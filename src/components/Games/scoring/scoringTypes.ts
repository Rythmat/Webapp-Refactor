export interface GameScoreReport {
  gameId: string;
  score: number;
  accuracy: number; // 0–1
  streak: number;
  maxStreak: number;
  timeSpent: number; // seconds
  difficulty: number; // 1–4
  skillTags: string[];
}

export interface GameScoreState {
  score: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  hits: number;
  misses: number;
  startTime: number;
}

/** XP multipliers per difficulty level */
export const DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 2.5,
};

/** Base XP per game */
export const BASE_XP: Record<string, number> = {
  chroma: 15,
  foli: 12,
  boardChoice: 10,
  chordConnection: 12,
  chordPress: 15,
  majorArcanum: 20,
  contourTrace: 18,
  grooveLab: 20,
  waveSculptor: 10,
  harmonicStrings: 8,
  soundSpinner: 12,
};
