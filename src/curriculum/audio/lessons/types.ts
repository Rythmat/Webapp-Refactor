import type { StemId } from '../mix/stems';

// ── A lesson, as data ──────────────────────────────────────────────────────
// One idea a screen, the student doing something by the second. Each lesson opens
// on a studio problem and ends with what to do in a real session, and each checked
// screen has to say why, and what each wrong answer means: leave one out and it
// won't compile, or lintLesson's test fails. `S` is everything on the lesson's
// stage: Check grades what's actually there and playing.

/** Text with **bold** for a term as it's introduced. */
export type Rich = string;

/** The depth behind "Why?": as much as it takes, out of the way until asked. */
export interface Why {
  title: string;
  paragraphs: readonly Rich[];
}

export type Verdict<M extends string = string> =
  | { ok: true }
  | { ok: false; mistake: M };

interface Base<S> {
  id: string;
  body: Rich;
  /** Which of its faces the lesson's stage shows. */
  view: string;
  /** What changes on the stage on arriving. */
  scene?: Partial<S>;
  caption?: Rich;
  /** Nothing to listen to here: the groove stops and its button goes. */
  quiet?: boolean;
}

export interface HookScreen<S> extends Base<S> {
  kind: 'hook';
  title: string;
}

export interface ExplainScreen<S> extends Base<S> {
  kind: 'explain';
}

export interface DoScreen<S, M extends string = string> extends Base<S> {
  kind: 'do';
  evaluate: (scene: S) => Verdict<M>;
  /** Said on getting it right, before Why? is opened. */
  right: Rich;
  /** What each way of getting it wrong means. */
  feedback: Readonly<Record<M, Rich>>;
  /** What See answer sets, and what a later screen assumes was done. */
  answer: Partial<S>;
  /** One for each mistake and one that passes: a test runs them all. */
  probes: readonly { scene: Partial<S>; expect: M | 'ok' }[];
  why: Why;
}

export interface ChooseScreen<S> extends Base<S> {
  kind: 'choose';
  question: Rich;
  correct: string;
  right: Rich;
  /** Every wrong choice says what's wrong with it. */
  choices: readonly { id: string; text: string; feedback?: Rich }[];
  why: Why;
}

/** Listen to two versions, labelled only A and B, and say which is which. */
export interface AbScreen<S> extends Base<S> {
  kind: 'ab';
  question: Rich;
  a: Partial<S>;
  b: Partial<S>;
  /** What each side really is: the player shuffles them on each try. */
  correct: 'a' | 'b' | 'same';
  /** For a question that can't be told apart. */
  sameLabel?: string;
  choiceA: string;
  choiceB: string;
  right: Rich;
  wrong: Rich;
  why: Why;
}

export type AnatomyScreen<S> = Base<S> & { kind: 'anatomy' } & (
    | {
        mode: 'show';
        /** The term lifted out and named. */
        term: string;
      }
    | {
        mode: 'identify';
        /** The term to find on the drawing. */
        target: string;
        right: Rich;
        /** What pressing some other part means. */
        wrong: (term: string) => Rich;
        why: Why;
      }
  );

export interface TakeawayScreen<S> extends Base<S> {
  kind: 'takeaway';
  points: readonly Rich[];
  /** What to do with this in a real session. */
  inSession: Rich;
  /** Where the simple picture stops being true. */
  limits: Rich;
  next: Rich;
}

/** Anything with a right answer. */
export type CheckedScreen<S> =
  | DoScreen<S>
  | ChooseScreen<S>
  | AbScreen<S>
  | (AnatomyScreen<S> & { mode: 'identify' });

export type Screen<S> =
  | HookScreen<S>
  | ExplainScreen<S>
  | DoScreen<S>
  | ChooseScreen<S>
  | AbScreen<S>
  | AnatomyScreen<S>
  | TakeawayScreen<S>;

export interface LessonScript<S> {
  id: string;
  initial: S;
  hook: HookScreen<S>;
  screens: readonly Screen<S>[];
  takeaway: TakeawayScreen<S>;
  /** The skill check, with no hints before answering. */
  practice: readonly [CheckedScreen<S>, CheckedScreen<S>, CheckedScreen<S>];
  needs: readonly StemId[];
}

/**
 * Makes `do` screens for one lesson's scene, so that a mistake with no feedback
 * is a compile error.
 */
export const doScreenFor =
  <S>() =>
  <M extends string>(screen: Omit<DoScreen<S, M>, 'kind'>): DoScreen<S> =>
    ({ kind: 'do', ...screen }) as unknown as DoScreen<S>;

/** Every screen, in the order they're met. */
export const allScreens = <S>(
  script: LessonScript<S>,
): readonly Screen<S>[] => [
  script.hook,
  ...script.screens,
  script.takeaway,
  ...script.practice,
];

/** Where the skill check starts. */
export const practiceStart = <S>(script: LessonScript<S>) =>
  allScreens(script).length - script.practice.length;

export const isChecked = <S>(screen: Screen<S>): screen is CheckedScreen<S> =>
  screen.kind === 'do' ||
  screen.kind === 'choose' ||
  screen.kind === 'ab' ||
  (screen.kind === 'anatomy' && screen.mode === 'identify');

/**
 * What's on the stage on reaching a screen, for opening a lesson part way: each
 * earlier screen's changes in turn, with its right answer in place.
 */
export function sceneAt<S>(script: LessonScript<S>, index: number): S {
  const screens = allScreens(script);
  let scene = script.initial;
  for (let i = 0; i <= index && i < screens.length; i++) {
    const screen = screens[i];
    scene = { ...scene, ...screen.scene };
    if (i < index && screen.kind === 'do') {
      scene = { ...scene, ...screen.answer };
    }
  }
  return scene;
}
