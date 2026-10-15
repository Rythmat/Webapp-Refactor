// ── Production lesson catalog ──────────────────────────────────────────────
// What a lesson tile shows, and whether the lesson needs Premium, without its
// steps. The Studio dashboard's Production tab imports only this, so it stays
// free of the step checks and the prism-engine barrel that tutorials.ts
// carries (audit practice-tutorial-25); tutorials.ts adds the steps to these
// entries by id.
//
// Pure data and functions on purpose: no imports, so the dashboard chunk can
// take it as is.

export type TutorialDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface TutorialCatalogEntry {
  id: string;
  title: string;
  subtitle: string;
  difficulty: TutorialDifficulty;
  estMinutes: number;
  /**
   * The lesson has steps in Prism, which is part of Premium, so a free
   * student gets the upgrade prompt instead of the lesson (owner decision 8:
   * Prism is not unlocked during lessons). tutorialCatalog.test.ts derives
   * this from the steps, so it can't drift from them.
   */
  requiresPremium: boolean;
}

/** Every Production lesson, in the order the dashboard lists them. */
export const TUTORIAL_CATALOG = [
  {
    id: 'make-first-track',
    title: 'Make your first track',
    subtitle:
      'Add an instrument, build a progression, shape the feel, and hear it play.',
    difficulty: 'Beginner',
    estMinutes: 5,
    requiresPremium: true,
  },

  // ── Genre pack: one lesson per genre, each a different craft area ──────
  {
    id: 'jazz-color-your-chords',
    title: 'Jazz — Color your chords',
    subtitle: 'Modes, seventh chords, and swing — harmony with flavor.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: true,
  },
  {
    id: 'hiphop-build-the-beat',
    title: 'Hip Hop — Build the beat',
    subtitle: 'Program drums, slow the tempo, and find the pocket.',
    difficulty: 'Beginner',
    estMinutes: 4,
    requiresPremium: false,
  },
  {
    id: 'pop-flip-a-sample',
    title: 'Pop — Flip a sample',
    subtitle: 'Load a one-shot and play it like an instrument.',
    difficulty: 'Beginner',
    estMinutes: 3,
    requiresPremium: false,
  },
  {
    id: 'edm-design-the-drop',
    title: 'EDM — Design the drop',
    subtitle: 'Wobble bass, minor keys, and saturation — our take on dubstep.',
    difficulty: 'Intermediate',
    estMinutes: 5,
    requiresPremium: true,
  },
  {
    id: 'house-make-it-pump',
    title: 'House — Make it pump',
    subtitle: 'Sidechain the bass to the kick — the classic pumping groove.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: false,
  },
  {
    id: 'rnb-mix-and-polish',
    title: 'R&B — Mix & polish',
    subtitle: 'Reverb, balance, and a mastering touch — make it smooth.',
    difficulty: 'Intermediate',
    estMinutes: 4,
    requiresPremium: true,
  },
  {
    id: 'indie-movement-and-dynamics',
    title: 'Indie — Movement & dynamics',
    subtitle: 'Automate volume, pan and sends so your mix breathes.',
    difficulty: 'Intermediate',
    estMinutes: 3,
    requiresPremium: false,
  },
] as const satisfies readonly TutorialCatalogEntry[];

/** A lesson's id: tutorials.ts must give steps to exactly these. */
export type TutorialId = (typeof TUTORIAL_CATALOG)[number]['id'];

export function getTutorialEntry(
  id: string | null,
): TutorialCatalogEntry | null {
  if (!id) return null;
  return TUTORIAL_CATALOG.find((t) => t.id === id) ?? null;
}

/** True when a student on this plan must upgrade before lesson `id` runs. */
export function lessonNeedsUpgrade(
  id: string | null,
  isPremium: boolean,
): boolean {
  return !isPremium && Boolean(getTutorialEntry(id)?.requiresPremium);
}

/**
 * What opening lesson `id` should do, given the student's plan (callers get
 * it through useLessonAccess, which reads useIsPremium()):
 * - 'open': start it (a free lesson, a premium student, or an id the
 *   catalog doesn't know, which the editor's boot turns away itself);
 * - 'wait': a Premium lesson while the plan is still loading, during which
 *   useIsPremium reports false for everyone, so deciding now would turn a
 *   premium student away;
 * - 'upgrade': a Premium lesson for a free student: show the upgrade prompt.
 */
export type LessonAccess = 'open' | 'wait' | 'upgrade';

export function lessonAccess(
  id: string | null,
  premium: { isPremium: boolean; isLoading: boolean },
): LessonAccess {
  if (!lessonNeedsUpgrade(id, premium.isPremium)) return 'open';
  return premium.isLoading ? 'wait' : 'upgrade';
}
