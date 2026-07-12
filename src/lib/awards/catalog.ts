// ── Awards catalog ───────────────────────────────────────────────────────
// Achievement badges derived from the user's real progress. Each award has a
// numeric target and reads its current value from the shared AwardStats; a badge
// is "unlocked" once value >= target. Metrics are chosen to be sticky (level,
// XP, lessons, plays only go up; streak uses the historical longest) so a badge
// never un-earns. Titles/descriptions are celebratory (no pressure).

export type AwardCategory =
  | 'Streak'
  | 'Level'
  | 'Lessons'
  | 'Arcade'
  | 'Social';

export const AWARD_CATEGORY_ORDER: AwardCategory[] = [
  'Streak',
  'Level',
  'Lessons',
  'Arcade',
  'Social',
];

export interface AwardStats {
  level: number;
  totalXp: number;
  longestStreak: number;
  lessonsCompleted: number;
  arcadePlays: number;
  connections: number;
}

export interface AwardDef {
  id: string;
  title: string;
  description: string;
  category: AwardCategory;
  target: number;
  /** Current value of this award's metric for the given stats. */
  value: (s: AwardStats) => number;
}

export const AWARDS_CATALOG: AwardDef[] = [
  // ── Streak ──
  {
    id: 'streak-3',
    title: 'Getting Warm',
    description: '3-day learning streak',
    category: 'Streak',
    target: 3,
    value: (s) => s.longestStreak,
  },
  {
    id: 'streak-7',
    title: 'On a Roll',
    description: '7-day learning streak',
    category: 'Streak',
    target: 7,
    value: (s) => s.longestStreak,
  },
  {
    id: 'streak-30',
    title: 'Unstoppable',
    description: '30-day learning streak',
    category: 'Streak',
    target: 30,
    value: (s) => s.longestStreak,
  },
  {
    id: 'streak-100',
    title: 'Centurion',
    description: '100-day learning streak',
    category: 'Streak',
    target: 100,
    value: (s) => s.longestStreak,
  },
  // ── Level ──
  {
    id: 'level-2',
    title: 'Rising Star',
    description: 'Reach Level 2',
    category: 'Level',
    target: 2,
    value: (s) => s.level,
  },
  {
    id: 'level-5',
    title: 'Virtuoso',
    description: 'Reach Level 5',
    category: 'Level',
    target: 5,
    value: (s) => s.level,
  },
  {
    id: 'level-10',
    title: 'Maestro',
    description: 'Reach Level 10',
    category: 'Level',
    target: 10,
    value: (s) => s.level,
  },
  {
    id: 'level-25',
    title: 'Legend',
    description: 'Reach Level 25',
    category: 'Level',
    target: 25,
    value: (s) => s.level,
  },
  // ── Lessons ──
  {
    id: 'lessons-1',
    title: 'First Steps',
    description: 'Complete your first lesson',
    category: 'Lessons',
    target: 1,
    value: (s) => s.lessonsCompleted,
  },
  {
    id: 'lessons-10',
    title: 'Bookworm',
    description: 'Complete 10 lessons',
    category: 'Lessons',
    target: 10,
    value: (s) => s.lessonsCompleted,
  },
  {
    id: 'lessons-25',
    title: 'Scholar',
    description: 'Complete 25 lessons',
    category: 'Lessons',
    target: 25,
    value: (s) => s.lessonsCompleted,
  },
  {
    id: 'lessons-50',
    title: 'Master Student',
    description: 'Complete 50 lessons',
    category: 'Lessons',
    target: 50,
    value: (s) => s.lessonsCompleted,
  },
  // ── Arcade ──
  {
    id: 'arcade-1',
    title: 'Game On',
    description: 'Play your first Arcade game',
    category: 'Arcade',
    target: 1,
    value: (s) => s.arcadePlays,
  },
  {
    id: 'arcade-10',
    title: 'Arcade Regular',
    description: 'Play 10 Arcade games',
    category: 'Arcade',
    target: 10,
    value: (s) => s.arcadePlays,
  },
  {
    id: 'arcade-50',
    title: 'High Scorer',
    description: 'Play 50 Arcade games',
    category: 'Arcade',
    target: 50,
    value: (s) => s.arcadePlays,
  },
  // ── Social ──
  {
    id: 'social-1',
    title: 'First Connection',
    description: 'Connect with a musician',
    category: 'Social',
    target: 1,
    value: (s) => s.connections,
  },
  {
    id: 'social-5',
    title: 'Bandmate',
    description: 'Connect with 5 musicians',
    category: 'Social',
    target: 5,
    value: (s) => s.connections,
  },
  {
    id: 'social-10',
    title: 'Networker',
    description: 'Connect with 10 musicians',
    category: 'Social',
    target: 10,
    value: (s) => s.connections,
  },
];
