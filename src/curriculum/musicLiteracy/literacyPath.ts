import { useState } from 'react';
import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { tonicPitchClass } from '@/curriculum/engine/musicLiteracy/stepColor';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  readLiteracyProgress,
  type LiteracyProgress,
} from './useLiteracyProgress';

// ── Start here: the Music Literacy path ────────────────────────────────────
// The series a beginner (or a class) meets first. It crosses modules (two
// Learn lessons, then the Studio, then the Arcade), so it belongs to none of
// them: Learn → Start Here draws the whole path, and Home's "Start here"
// card points at its next stop. This list is the one place the stops are
// named; a stop lights up by turning `live` on and naming its lesson (or,
// outside Learn, its route).

/** The Learn tab (`?tab=`) that draws the path. */
export const START_HERE_TAB = 'StartHere';

/** Learn → Start Here. */
export const startHereRoute = () =>
  LearnRoutes.root(undefined, { tab: START_HERE_TAB });

export type LiteracyPathModule = 'Learn' | 'Studio' | 'Arcade';

export interface LiteracyPathStop {
  id: string;
  title: string;
  module: LiteracyPathModule;
  /** Where in the module, when that says more than its name ("Practice"). */
  place?: string;
  /** One line: what the stop is. */
  description: string;
  /** Open to students. A lesson stop also needs its lesson published. */
  live: boolean;
  /** A Music Literacy lesson: the stop opens it and wears its progress. */
  lessonId?: string;
  /** Otherwise, where the stop opens once it is live. */
  route?: string;
}

export const LITERACY_PATH: readonly LiteracyPathStop[] = [
  {
    id: 'call-and-response',
    title: 'Part 1 · Call and response',
    module: 'Learn',
    description:
      'Hear a call, play it back: 1, 3, 5 and ♭3, and the triads they make.',
    live: true,
    lessonId: 'music-literacy-part-1',
  },
  {
    id: 'choose-a-color',
    title: 'Part 2 · Choose a color',
    module: 'Learn',
    description: 'Melodies and chord progressions in a key you pick.',
    live: false,
  },
  {
    id: 'hear-it-with-your-band',
    title: 'Hear it with your band',
    module: 'Studio',
    place: 'Practice',
    description: 'Your chord progression, played by a Band.',
    live: false,
  },
  {
    id: 'studio-basics',
    title: 'Studio basics',
    module: 'Studio',
    description: 'Nine guided tutorials around the Studio.',
    live: false,
  },
  {
    id: 'echo',
    title: 'Echo',
    module: 'Arcade',
    description: 'An endless call-and-response game.',
    live: false,
  },
];

/**
 * soon     not open yet
 * new      open, nothing tried
 * started  a step tried, not every step passed
 * done     every step passed (a stop with no lesson is never done)
 */
export type LiteracyStopStatus = 'soon' | 'new' | 'started' | 'done';

/** How each of a lesson's steps stands, in order. */
export type LiteracyStepMark = 'passed' | 'tried' | 'todo';

/** A lesson's key, as the circle of fifths draws it. */
export interface LiteracyStopKey {
  /** The 1's pitch class (C = 0), and its name ("C", "E♭"). */
  pitch: number;
  tonic: string;
  mode: 'major' | 'minor';
  /** "C Major". */
  name: string;
  /** Its colour (KEY_OF_COLORS): C Major's red. */
  color: string;
}

export interface LiteracyStopState {
  stop: LiteracyPathStop;
  status: LiteracyStopStatus;
  /** A lesson stop's steps, in order; empty for any other stop. */
  steps: readonly LiteracyStepMark[];
  passed: number;
  /** The first step not yet passed: where Continue opens. */
  next: { index: number; title: string } | null;
  /** Where Start / Continue goes; null while the stop is coming soon. */
  to: string | null;
  /** The lesson's key (Part 1 is in C: red); null without a lesson. */
  key: LiteracyStopKey | null;
}

function keyOf(lesson: MusicLiteracyLesson): LiteracyStopKey {
  const { tonic, mode } = lesson.key;
  const shown = displayAccidentals(tonic);
  return {
    pitch: tonicPitchClass(lesson),
    tonic: shown,
    mode,
    name: `${shown} ${mode === 'minor' ? 'Minor' : 'Major'}`,
    color: colorForKeyMode(tonic, mode === 'minor' ? 'aeolian' : 'ionian'),
  };
}

/** One stop, from its lesson (if published) and the progress saved for it. */
export function literacyStopState(
  stop: LiteracyPathStop,
  lesson: MusicLiteracyLesson | undefined,
  progress: LiteracyProgress,
): LiteracyStopState {
  const key = lesson ? keyOf(lesson) : null;
  if (!stop.live || (stop.lessonId && !lesson)) {
    return {
      stop,
      status: 'soon',
      steps: [],
      passed: 0,
      next: null,
      to: null,
      key,
    };
  }
  if (!lesson) {
    return {
      stop,
      status: 'new',
      steps: [],
      passed: 0,
      next: null,
      to: stop.route ?? null,
      key,
    };
  }

  const steps = lesson.steps.map((step): LiteracyStepMark => {
    const saved = progress[step.tag];
    return saved?.passed ? 'passed' : saved ? 'tried' : 'todo';
  });
  const passed = steps.filter((mark) => mark === 'passed').length;
  const nextIndex = steps.findIndex((mark) => mark !== 'passed');
  const status: LiteracyStopStatus =
    nextIndex === -1
      ? 'done'
      : steps.some((mark) => mark !== 'todo')
        ? 'started'
        : 'new';
  // Continue opens the first step not passed; Start and Play again, step 1.
  const at = status === 'started' && nextIndex > 0 ? nextIndex : null;
  return {
    stop,
    status,
    steps,
    passed,
    next:
      nextIndex === -1
        ? null
        : { index: nextIndex, title: lesson.steps[nextIndex].title },
    to: CurriculumRoutes.musicLiteracyLesson(
      { id: lesson.id },
      at === null ? undefined : { step: lesson.steps[at].tag },
    ),
    key,
  };
}

/** Every stop, as this device's saved progress has it. */
export function literacyPath(
  findLesson: (
    id: string,
  ) => MusicLiteracyLesson | undefined = getLiveMusicLiteracy,
  readProgress: (lessonId: string) => LiteracyProgress = readLiteracyProgress,
): LiteracyStopState[] {
  return LITERACY_PATH.map((stop) => {
    const lesson = stop.lessonId ? findLesson(stop.lessonId) : undefined;
    return literacyStopState(
      stop,
      lesson,
      lesson ? readProgress(lesson.id) : {},
    );
  });
}

/**
 * Where a student stands on the path: the first open stop not yet done, or,
 * when every open stop is done, the last of them, with the stop after it
 * (coming soon, until it opens).
 */
export function currentStop(states: readonly LiteracyStopState[]): {
  current: LiteracyStopState | null;
  upNext: LiteracyStopState | null;
} {
  const open = states.filter((s) => s.status !== 'soon');
  const current =
    open.find((s) => s.status !== 'done') ?? open[open.length - 1] ?? null;
  const upNext =
    current?.status === 'done'
      ? (states[states.indexOf(current) + 1] ?? null)
      : null;
  return { current, upNext };
}

/**
 * The path as this device has it. Read once when the page opens: progress
 * is saved as the lesson is played, and leaving the lesson remounts the path.
 */
export function useLiteracyPath(): readonly LiteracyStopState[] {
  const [states] = useState(() => literacyPath());
  return states;
}
