import { useState } from 'react';
import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import type {
  LiteracyMode,
  LiteracyTonic,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  keyFor,
  type LiteracyChoices,
} from '@/curriculum/engine/musicLiteracy/choices';
import {
  lessonModules,
  roundMark,
} from '@/curriculum/engine/musicLiteracy/modules';
import { pitchClassOf } from '@/curriculum/engine/musicLiteracy/pitch';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  openingBandProgression,
  readBandProgressions,
} from './bandProgressions';
import {
  literacyStepDone,
  literacyStepRequired,
  literacyStepTried,
} from './stepDone';
import { readStopDone } from './stopDone';
import { readLiteracyChoices } from './useLiteracyChoices';
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
// outside Learn, its route). A stop with a route has no steps: it is done
// once the student has done what it opens (stopDone.ts), and it wears the
// key its page plays in.

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
  /** One line: what the stop is (left out when the title says it). */
  description?: string;
  /** Open to students. A lesson stop also needs its lesson published. */
  live: boolean;
  /** A Music Literacy lesson: the stop opens it and wears its progress. */
  lessonId?: string;
  /** Otherwise, where the stop opens once it is live. */
  route?: string;
}

/** Part 3: a Band plays the student's progression in the Studio. */
export const BAND_STOP_ID = 'hear-it-with-your-band';

export const LITERACY_PATH: readonly LiteracyPathStop[] = [
  {
    id: 'call-and-response',
    title: 'Part 1 · Call and Response',
    module: 'Learn',
    live: true,
    lessonId: 'music-literacy-part-1',
  },
  {
    id: 'choose-a-color',
    title: 'Part 2 · Choose a Color',
    module: 'Learn',
    description: 'Melodies and chord progressions in a key you pick.',
    live: true,
    lessonId: 'music-literacy-part-2',
  },
  {
    id: BAND_STOP_ID,
    title: 'Hear It with Your Band',
    module: 'Studio',
    place: 'Practice',
    description: 'Your chord progression, played by a Band.',
    live: true,
    route: CurriculumRoutes.musicLiteracyBand(),
  },
  {
    id: 'studio-basics',
    title: 'Studio Basics',
    module: 'Studio',
    description: 'Nine guided tutorials around the Studio.',
    live: false,
  },
  {
    id: 'echo',
    title: 'Echo',
    module: 'Arcade',
    description: 'A Call-and-Response music creation game.',
    live: false,
  },
];

/**
 * soon     not open yet
 * new      open, nothing tried
 * started  a step tried, not every required step done
 * done     every step done but those nothing waits for, a replay
 *          (stepDone.ts); a stop with a route, once what it opens is done
 *          (stopDone.ts)
 */
export type LiteracyStopStatus = 'soon' | 'new' | 'started' | 'done';

/** How each of a lesson's steps stands, in order. */
export type LiteracyStepMark = 'passed' | 'tried' | 'todo';

/**
 * A lesson's module rounds: how many there are to play, how many are done
 * (every round step passed), and what kind they are.
 */
export interface LiteracyStopRounds {
  done: number;
  total: number;
  /** 'create', 'challenge', or both kinds. */
  kind: 'create' | 'challenge' | 'mixed';
}

/** A lesson's key, as the circle of fifths draws it. */
export interface LiteracyStopKey {
  /** The 1's pitch class (C = 0), and its name ("C", "E♭"). */
  pitch: number;
  tonic: string;
  mode: 'major' | 'minor';
  /** "C Major". */
  name: string;
  /** Its color (KEY_OF_COLORS): C Major's red. */
  color: string;
}

export interface LiteracyStopState {
  stop: LiteracyPathStop;
  status: LiteracyStopStatus;
  /** A lesson stop's steps, in order; empty for any other stop. */
  steps: readonly LiteracyStepMark[];
  passed: number;
  /** The first step not yet passed, a replay aside: where Continue opens. */
  next: { index: number; title: string } | null;
  /** Its module rounds; null for a stop without a lesson, or none. */
  rounds: LiteracyStopRounds | null;
  /** Where Start / Continue goes; null while the stop is coming soon. */
  to: string | null;
  /**
   * The lesson's key (Part 1 is in C: red), or the one the student chose
   * (Part 2); a route stop's, the key its page plays in (the band: the
   * progression it opens on); null otherwise.
   */
  key: LiteracyStopKey | null;
}

/** How a stop with a route stands on this device. */
export interface RouteStopState {
  done: boolean;
  /** The key its page plays in, when it has one. */
  key: { tonic: LiteracyTonic; mode: LiteracyMode } | null;
}

const keyOf = (
  lesson: MusicLiteracyLesson,
  choices: LiteracyChoices | null,
): LiteracyStopKey => stopKeyOf(keyFor(lesson, choices));

function stopKeyOf({
  tonic,
  mode,
}: {
  tonic: LiteracyTonic;
  mode: LiteracyMode;
}): LiteracyStopKey {
  const shown = displayAccidentals(tonic);
  return {
    pitch: pitchClassOf(tonic),
    tonic: shown,
    mode,
    name: `${shown} ${mode === 'minor' ? 'Minor' : 'Major'}`,
    color: colorForKeyMode(tonic, mode === 'minor' ? 'aeolian' : 'ionian'),
  };
}

/**
 * One stop, from its lesson (if published), the progress saved for it and,
 * for a lesson whose key is the student's, what they chose; a stop with a
 * route, from how it stands (`route`).
 */
export function literacyStopState(
  stop: LiteracyPathStop,
  lesson: MusicLiteracyLesson | undefined,
  progress: LiteracyProgress,
  choices: LiteracyChoices | null = null,
  route: RouteStopState | null = null,
): LiteracyStopState {
  const key = lesson
    ? keyOf(lesson, choices)
    : route?.key
      ? stopKeyOf(route.key)
      : null;
  if (!stop.live || (stop.lessonId && !lesson)) {
    return {
      stop,
      status: 'soon',
      steps: [],
      passed: 0,
      next: null,
      rounds: null,
      to: null,
      key,
    };
  }
  if (!lesson) {
    return {
      stop,
      status: route?.done ? 'done' : 'new',
      steps: [],
      passed: 0,
      next: null,
      rounds: null,
      to: stop.route ?? null,
      key,
    };
  }

  const steps = lesson.steps.map(
    (step): LiteracyStepMark =>
      literacyStepDone(step, progress)
        ? 'passed'
        : literacyStepTried(step, progress)
          ? 'tried'
          : 'todo',
  );
  const passed = steps.filter((mark) => mark === 'passed').length;
  // A replay is there to listen to: nothing waits for it.
  const nextIndex = steps.findIndex(
    (mark, i) => mark !== 'passed' && literacyStepRequired(lesson.steps[i]),
  );
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
    rounds: roundsOf(lesson, progress),
    to: CurriculumRoutes.musicLiteracyLesson(
      { id: lesson.id },
      at === null ? undefined : { step: lesson.steps[at].tag },
    ),
    key,
  };
}

/** A lesson's module rounds, as its saved progress has them. */
function roundsOf(
  lesson: MusicLiteracyLesson,
  progress: LiteracyProgress,
): LiteracyStopRounds | null {
  const played = lessonModules(lesson).flatMap((module) => {
    const mark = roundMark(module, lesson, progress);
    return mark === null ? [] : [{ round: module.round, mark }];
  });
  if (played.length === 0) return null;
  const kinds = new Set(played.map((p) => p.round));
  return {
    done: played.filter((p) => p.mark === 'passed').length,
    total: played.length,
    kind:
      kinds.size > 1
        ? 'mixed'
        : kinds.has('challenge')
          ? 'challenge'
          : 'create',
  };
}

/**
 * A route stop as this device has it: done once its page has done its job
 * (stopDone.ts); the band's stop in the key of the progression its page
 * opens on (bandProgressions.ts).
 */
export function readRouteStop(stopId: string): RouteStopState {
  const done = readStopDone(stopId);
  if (stopId !== BAND_STOP_ID) return { done, key: null };
  const { progression } = openingBandProgression(readBandProgressions());
  return { done, key: { tonic: progression.tonic, mode: progression.mode } };
}

/** Every stop, as this device's saved progress (and choices) have it. */
export function literacyPath(
  findLesson: (
    id: string,
  ) => MusicLiteracyLesson | undefined = getLiveMusicLiteracy,
  readProgress: (lessonId: string) => LiteracyProgress = readLiteracyProgress,
  readChoices: (lessonId: string) => LiteracyChoices = readLiteracyChoices,
  readRoute: (stopId: string) => RouteStopState = readRouteStop,
): LiteracyStopState[] {
  return LITERACY_PATH.map((stop) => {
    const lesson = stop.lessonId ? findLesson(stop.lessonId) : undefined;
    return literacyStopState(
      stop,
      lesson,
      lesson ? readProgress(lesson.id) : {},
      lesson?.keyChoice === 'student' ? readChoices(lesson.id) : null,
      !stop.lessonId && stop.route && stop.live ? readRoute(stop.id) : null,
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
