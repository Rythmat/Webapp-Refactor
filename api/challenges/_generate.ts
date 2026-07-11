// ── Challenge generation ─────────────────────────────────────────────────
// Deterministic per (user, period): a mix of universal templates and
// interest-based genre templates (from the client-supplied profile). Degrades
// to universal-only when the profile has no genres (new users).

import { endOfDayISO, endOfWeekISO, type GenChallenge } from './_utils';

export interface InterestGenre {
  key: string; // CurriculumGenreId, e.g. 'JAZZ' — matches criteria.genre
  display: string; // e.g. 'Jazz'
  slug: string; // e.g. 'jazz' (for the route)
}
export interface InterestProfile {
  genres: InterestGenre[];
  focus: string[];
}

interface Template {
  key: string;
  build: () => Omit<GenChallenge, 'id' | 'deadline'>;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function genreTemplate(g: InterestGenre, xp: number): Template {
  return {
    key: `g-${g.key}`,
    build: () => ({
      name: `Complete a ${g.display} lesson`,
      xpReward: xp,
      route: `/learn?genre=${encodeURIComponent(g.slug)}`,
      criteria: { kind: 'complete_lesson', genre: g.key },
    }),
  };
}

const DAILY_UNIVERSAL: Template[] = [
  {
    key: 'u-lesson',
    build: () => ({
      name: 'Complete a lesson today',
      xpReward: 20,
      route: '/learn',
      criteria: { kind: 'complete_lesson' },
    }),
  },
  {
    key: 'u-arcade',
    build: () => ({
      name: 'Reach a 5-note streak in the Arcade',
      xpReward: 15,
      route: '/arcade',
      criteria: { kind: 'arcade_streak', threshold: 5 },
    }),
  },
];

const WEEKLY_UNIVERSAL: Template[] = [
  {
    key: 'u-invite',
    build: () => ({
      name: 'Invite a friend to a Studio session',
      xpReward: 30,
      route: '/studio',
      criteria: { kind: 'studio_invite', minInvites: 1 },
    }),
  },
  {
    key: 'u-lesson-week',
    build: () => ({
      name: 'Complete a lesson this week',
      xpReward: 20,
      route: '/learn',
      criteria: { kind: 'complete_lesson' },
    }),
  },
];

const COUNT = 3;

export function generate(
  profile: InterestProfile,
  userId: string,
  scope: 'daily' | 'weekly',
  periodKey: string,
): GenChallenge[] {
  const deadline =
    scope === 'daily' ? endOfDayISO(periodKey) : endOfWeekISO(periodKey);
  const seed = hash(`${userId}:${scope}:${periodKey}`);

  const universal = scope === 'daily' ? DAILY_UNIVERSAL : WEEKLY_UNIVERSAL;
  const maxInterest = scope === 'daily' ? 2 : 1;
  const interest = profile.genres
    .slice(0, maxInterest)
    .map((g) => genreTemplate(g, scope === 'daily' ? 25 : 35));

  // Interest first, then fill with universal — up to COUNT. Degrades to
  // universal-only when there are no interest genres.
  const chosen: Template[] = [...seededShuffle(interest, seed)];
  for (const u of seededShuffle(universal, seed ^ 0x9e3779b9)) {
    if (chosen.length >= COUNT) break;
    chosen.push(u);
  }

  return chosen.slice(0, COUNT).map((t) => {
    const base = t.build();
    return {
      ...base,
      id: `${scope === 'daily' ? 'd' : 'w'}:${periodKey}:${t.key}`,
      deadline,
    };
  });
}
