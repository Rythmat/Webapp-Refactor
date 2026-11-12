import type { Rich, Why } from '@/curriculum/audio/lessons/types';

// ── A guided lesson, as data ───────────────────────────────────────────────
// The Audio lessons' format, for music that's played: one idea a screen, the
// student playing by the second. It lies over the lesson's existing steps, which
// stay exactly as they are, so that the console, the CDN's overrides and the
// golden snapshots never notice: a screen only says which steps it runs, in what
// order, and what to say about them.

export type { Rich, Why };

/** A step of the lesson underneath: "A1.2" in a flow, "asc-pa" in Theory. */
export type StepRef = string;

/** One thing to play on a screen. */
export interface Rung {
  step: StepRef;
  /** On its pill: "In time", "1 maj". */
  label: string;
  /**
   * Done by passing this: playing a scale in time also proves it out of time.
   * Each of these gets marked, so that totals and resuming still add up.
   */
  credits?: readonly StepRef[];
}

/** How a take went wrong, from what scoring reports. */
export type TakeFault =
  | 'silent'
  | 'unclear'
  | 'wrong'
  | 'missed'
  | 'early'
  | 'late'
  | 'uneven'
  | 'short'
  | 'long'
  | 'other';

interface Base {
  id: string;
  body: Rich;
  caption?: Rich;
}

export interface HookScreen extends Base {
  kind: 'hook';
  title: string;
  /** The step whose demo is the thing to hear. */
  hear?: StepRef;
}

export interface ExplainScreen extends Base {
  kind: 'explain';
  /** What's under the words: a step's notes, or the lesson's own overview. */
  show?: { step: StepRef } | { overview: StepRef };
}

export interface PlayScreen extends Base {
  kind: 'play';
  rungs: readonly Rung[];
  /** Said on passing the last of them. */
  right: Rich;
  why: Why;
  /** What this screen says about a fault, over the general words. */
  faults?: Partial<Record<TakeFault, Rich>>;
  /** The skill check: no notes shown, nothing lit, no demo before they try. */
  fromMemory?: boolean;
}

export interface ChooseScreen extends Base {
  kind: 'choose';
  question: Rich;
  correct: string;
  right: Rich;
  /** Every wrong choice says what's wrong with it. */
  choices: readonly { id: string; text: string; feedback?: Rich }[];
  why: Why;
  /** A step to keep on show while they think. */
  step?: StepRef;
}

/** Choose the notes of a scale, with the mouse, and Check them. */
export interface PickNotesScreen extends Base {
  kind: 'pick';
  question: Rich;
  /** Keys on keyboard; note names on an instrument without them. */
  face: 'keys' | 'names';
  tonicPc: number;
  /** Every pitch class of the scale, its tonic included. */
  scale: readonly number[];
  nameOf: (pc: number) => string;
  right: Rich;
  /** Some of what's chosen doesn't belong. */
  extra: (names: readonly string[]) => Rich;
  /** All of it belongs, and some is still to find. */
  missing: (found: number, total: number) => Rich;
  why: Why;
}

export interface TakeawayScreen extends Base {
  kind: 'takeaway';
  points: readonly Rich[];
  /** What to do with this at the instrument. */
  inSession: Rich;
  /** Where the simple picture stops being true. */
  limits: Rich;
  next: Rich;
}

export type CheckedScreen = PlayScreen | ChooseScreen | PickNotesScreen;

export type GuidedScreen =
  | HookScreen
  | ExplainScreen
  | PlayScreen
  | ChooseScreen
  | PickNotesScreen
  | TakeawayScreen;

/** One sitting: a lesson's section, from its hook to its skill check. */
export interface GuidedChapter {
  /** The section it covers: "A". */
  id: string;
  name: string;
  hook: HookScreen;
  screens: readonly GuidedScreen[];
  takeaway: TakeawayScreen;
  practice: readonly [CheckedScreen, CheckedScreen, CheckedScreen];
}

/** Every screen, in the order they're met. */
export const chapterScreens = (
  chapter: GuidedChapter,
): readonly GuidedScreen[] => [
  chapter.hook,
  ...chapter.screens,
  chapter.takeaway,
  ...chapter.practice,
];

/** Where the skill check starts. */
export const chapterPracticeStart = (chapter: GuidedChapter) =>
  chapterScreens(chapter).length - chapter.practice.length;

export const isCheckedScreen = (
  screen: GuidedScreen,
): screen is CheckedScreen =>
  screen.kind === 'play' || screen.kind === 'choose' || screen.kind === 'pick';

/** Every step a chapter runs or credits. */
export function chapterSteps(chapter: GuidedChapter): Set<StepRef> {
  const steps = new Set<StepRef>();
  for (const screen of chapterScreens(chapter)) {
    if (screen.kind !== 'play') continue;
    for (const rung of screen.rungs) {
      steps.add(rung.step);
      rung.credits?.forEach((credited) => steps.add(credited));
    }
  }
  return steps;
}

/**
 * A chapter for what the lesson really has. The steps come from the flow, which a
 * console edit or a CDN override can change: a step that's gone drops out and one
 * that's new gets a plain screen of its own, so that nothing silently vanishes and
 * a section can still be finished.
 */
export function resolveChapter(
  chapter: GuidedChapter,
  steps: readonly { ref: StepRef; title: string; direction: string }[],
): GuidedChapter {
  const known = new Set(steps.map((step) => step.ref));
  const keepRungs = (screen: PlayScreen): PlayScreen | null => {
    const rungs = screen.rungs
      .filter((rung) => known.has(rung.step))
      .map((rung) =>
        rung.credits
          ? { ...rung, credits: rung.credits.filter((c) => known.has(c)) }
          : rung,
      );
    return rungs.length ? { ...screen, rungs } : null;
  };
  const keep = (screen: GuidedScreen): GuidedScreen | null => {
    if (screen.kind === 'play') return keepRungs(screen);
    if (screen.kind === 'choose' && screen.step && !known.has(screen.step)) {
      return { ...screen, step: undefined };
    }
    if (screen.kind === 'explain' && screen.show && 'step' in screen.show) {
      return known.has(screen.show.step)
        ? screen
        : { ...screen, show: undefined };
    }
    return screen;
  };
  const screens = chapter.screens.flatMap((screen) => keep(screen) ?? []);
  const covered = chapterSteps({ ...chapter, screens });
  const added: PlayScreen[] = steps
    .filter((step) => !covered.has(step.ref))
    .map((step) => ({
      kind: 'play',
      id: `step-${step.ref}`,
      body: step.direction || step.title,
      rungs: [{ step: step.ref, label: step.title }],
      right: 'That’s it.',
      why: { title: step.title, paragraphs: [step.direction || step.title] },
    }));
  const hookHeard =
    chapter.hook.hear && !known.has(chapter.hook.hear)
      ? { ...chapter.hook, hear: undefined }
      : chapter.hook;
  return {
    ...chapter,
    hook: hookHeard,
    screens: [...screens, ...added],
    // A skill-check step that's gone falls back on a question-free pass of the
    // last step it can still run; failing that, the screen stays as it was.
    practice: chapter.practice.map((screen) => {
      if (screen.kind !== 'play') return screen;
      const kept = keepRungs(screen);
      if (kept) return kept;
      const last = steps.at(-1);
      return last
        ? { ...screen, rungs: [{ step: last.ref, label: last.title }] }
        : screen;
    }) as unknown as GuidedChapter['practice'],
  };
}
