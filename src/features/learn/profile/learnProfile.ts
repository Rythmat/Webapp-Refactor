import type { LearnChoice } from '@/features/learn/useInstrumentStore';
import { ALL_GENRES } from '@/types/userProfile';

// ── What a student told us about their learning ────────────────────────────
// Asked once on /welcome and editable there after. Kept on the account under
// the game option `learnProfile` (the API shallow-merges, so each save sends
// only what changed) and mirrored per user on the device. Genres live in the
// Bio, which /user and the challenge interests already read.

export type LearnLevel = 'new' | 'basics' | 'comfortable' | 'advanced';

export type LearnGoal = 'songs' | 'theory' | 'create' | 'improvise' | 'class';

export interface LearnProfile {
  /** When they finished or skipped /welcome (ms). Unset: never asked. */
  welcomedAt?: number;
  /** What they want to learn on, the main one first. */
  instruments?: LearnChoice[];
  level?: LearnLevel | null;
  goals?: LearnGoal[];
  /** Their weekly target, in days. */
  daysPerWeek?: number | null;
  /** Course and item ids they said they're not interested in. */
  dismissed?: string[];
}

export const LEARN_PROFILE_GAME_ID = 'learnProfile';

/** How many "not interested" marks are kept, newest last. */
export const MAX_DISMISSED = 60;

export const LEVEL_LABELS: Readonly<Record<LearnLevel, string>> = {
  new: 'New to it',
  basics: 'I know some basics',
  comfortable: "I'm comfortable",
  advanced: "I'm advanced",
};

export const GOAL_LABELS: Readonly<Record<LearnGoal, string>> = {
  songs: 'Play songs I love',
  theory: 'Understand how music works',
  create: 'Write and produce',
  improvise: 'Improvise',
  class: 'Keep up with my class',
};

const CHOICES: readonly LearnChoice[] = [
  'piano',
  'guitar',
  'bass',
  'ukulele',
  'audio',
];
const LEVELS = Object.keys(LEVEL_LABELS) as LearnLevel[];
const GOALS = Object.keys(GOAL_LABELS) as LearnGoal[];

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(value)
    ? value.filter((v): v is T => allowed.includes(v as T))
    : [];

/** Anything read back from the account or the device, made safe. */
export function normalizeLearnProfile(value: unknown): LearnProfile {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    unknown
  >;
  const out: LearnProfile = {};
  if (typeof raw.welcomedAt === 'number' && raw.welcomedAt > 0)
    out.welcomedAt = raw.welcomedAt;
  if (Array.isArray(raw.instruments))
    out.instruments = pick(raw.instruments, CHOICES);
  if (raw.level === null || LEVELS.includes(raw.level as LearnLevel))
    out.level = raw.level as LearnLevel | null;
  if (Array.isArray(raw.goals)) out.goals = pick(raw.goals, GOALS);
  if (
    raw.daysPerWeek === null ||
    (typeof raw.daysPerWeek === 'number' &&
      raw.daysPerWeek >= 1 &&
      raw.daysPerWeek <= 7)
  )
    out.daysPerWeek = raw.daysPerWeek as number | null;
  if (Array.isArray(raw.dismissed))
    out.dismissed = raw.dismissed
      .filter((v): v is string => typeof v === 'string')
      .slice(-MAX_DISMISSED);
  return out;
}

/** The account's answers over the device's: each field the newer side set. */
export const mergeLearnProfiles = (
  device: LearnProfile,
  account: LearnProfile,
): LearnProfile => ({ ...device, ...account });

// ── Bio genres ↔ genre courses ─────────────────────────────────────────────

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A Bio genre's course slug ('Hip-Hop' → 'hip-hop'), among the given slugs. */
export function genreSlugOf(
  bioGenre: string,
  slugs: readonly string[],
): string | null {
  const want = fold(bioGenre.replace('&', 'n'));
  return slugs.find((slug) => fold(slug.replace('&', 'n')) === want) ?? null;
}

/** A course slug's Bio genre ('rnb' → 'R&B'). */
export function bioGenreOf(slug: string): string | null {
  const want = fold(slug.replace('&', 'n'));
  return (
    ALL_GENRES.find((genre) => fold(genre.replace('&', 'n')) === want) ?? null
  );
}

/** Learn's choices as the Bio names instruments; Ukulele and Audio have none. */
export const BIO_INSTRUMENT: Readonly<Partial<Record<LearnChoice, string>>> = {
  piano: 'Piano',
  guitar: 'Guitar',
  bass: 'Bass',
};

/** What the Bio's focus gains from an answer (Audio is a focus there). */
export function bioFocusFor(
  instruments: readonly LearnChoice[],
  goals: readonly LearnGoal[],
): string[] {
  const focus = new Set<string>();
  if (instruments.includes('audio')) focus.add('Audio');
  if (goals.includes('create')) focus.add('Producing');
  if (goals.includes('songs')) focus.add('Performing');
  return [...focus];
}
