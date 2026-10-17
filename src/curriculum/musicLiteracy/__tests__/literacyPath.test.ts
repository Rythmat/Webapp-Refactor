import { describe, expect, it } from 'vitest';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import {
  currentStop,
  LITERACY_PATH,
  literacyPath,
  literacyStopState,
  startHereRoute,
} from '../literacyPath';
import { withTry, type LiteracyProgress } from '../useLiteracyProgress';

/**
 * The Music Literacy path: five stops across Learn, the Studio and the
 * Arcade, Part 1 the only one open, and each stop's state from the progress
 * this device has saved for its lesson.
 */

/** The test fixture, as the lesson Part 1's stop opens. */
const lesson: MusicLiteracyLesson = {
  ...LITERACY_FIXTURE,
  id: 'music-literacy-part-1',
};
const part1 = LITERACY_PATH[0];
const tags = lesson.steps.map((s) => s.tag);

/** Progress with these steps passed, and these only tried. */
function progressOf(
  passed: readonly string[],
  tried: readonly string[] = [],
): LiteracyProgress {
  let progress: LiteracyProgress = {};
  for (const tag of passed) progress = withTry(progress, tag, 90, true);
  for (const tag of tried) progress = withTry(progress, tag, 30, false);
  return progress;
}

describe('the Music Literacy path', () => {
  it('runs Part 1, Part 2, the band, Studio basics, then Echo', () => {
    expect(LITERACY_PATH.map((s) => [s.title, s.module, s.live])).toEqual([
      ['Part 1 · Call and response', 'Learn', true],
      ['Part 2 · Choose a color', 'Learn', false],
      ['Hear it with your band', 'Studio', false],
      ['Studio basics', 'Studio', false],
      ['Echo', 'Arcade', false],
    ]);
    expect(part1.lessonId).toBe('music-literacy-part-1');
    expect(startHereRoute()).toBe('/learn?tab=StartHere');
  });

  it('starts Part 1 at its first step, in C’s red', () => {
    const state = literacyStopState(part1, lesson, {});
    expect(state).toMatchObject({
      status: 'new',
      passed: 0,
      next: { index: 0, title: 'A note called C' },
      to: '/curriculum/music-literacy/music-literacy-part-1',
      key: { pitch: 0, tonic: 'C', mode: 'major', name: 'C Major' },
    });
    expect(state.key?.color).toBe('#D2404A');
    expect(state.steps).toEqual(tags.map(() => 'todo'));
  });

  it('continues at the first step not passed', () => {
    const state = literacyStopState(
      part1,
      lesson,
      progressOf(['note-called-c', 'root-is-1', 'go-to-5'], ['add-the-3']),
    );
    expect(state.status).toBe('started');
    expect(state.passed).toBe(3);
    expect(state.next).toEqual({ index: 2, title: 'Add the 3: Major' });
    expect(state.to).toBe(
      '/curriculum/music-literacy/music-literacy-part-1?step=add-the-3',
    );
    expect(state.steps.slice(0, 4)).toEqual([
      'passed',
      'passed',
      'tried',
      'passed',
    ]);
  });

  it('is started, at step 1, once step 1 is tried but not passed', () => {
    const state = literacyStopState(
      part1,
      lesson,
      progressOf([], tags.slice(0, 1)),
    );
    expect(state.status).toBe('started');
    expect(state.passed).toBe(0);
    expect(state.to).toBe('/curriculum/music-literacy/music-literacy-part-1');
  });

  it('is done when every step is passed, and plays again from step 1', () => {
    const state = literacyStopState(part1, lesson, progressOf(tags));
    expect(state).toMatchObject({
      status: 'done',
      passed: 7,
      next: null,
      to: '/curriculum/music-literacy/music-literacy-part-1',
    });
  });

  it('counts only the lesson’s own steps', () => {
    const state = literacyStopState(
      part1,
      lesson,
      progressOf(['a-step-since-removed', 'note-called-c']),
    );
    expect(state.passed).toBe(1);
  });

  it('keeps a stop coming soon until it is live, and its lesson published', () => {
    expect(literacyStopState(LITERACY_PATH[4], undefined, {})).toMatchObject({
      status: 'soon',
      to: null,
      steps: [],
    });
    // Live, but its lesson is a draft (or gone): still to come.
    expect(literacyStopState(part1, undefined, {}).status).toBe('soon');
    // Live with a route of its own (a Studio or Arcade stop).
    expect(
      literacyStopState(
        { ...LITERACY_PATH[4], live: true, route: '/arcade/echo' },
        undefined,
        {},
      ),
    ).toMatchObject({ status: 'new', to: '/arcade/echo' });
  });

  it('reads each lesson stop’s progress by its lesson', () => {
    const read: string[] = [];
    const states = literacyPath(
      (id) => (id === lesson.id ? lesson : undefined),
      (id) => {
        read.push(id);
        return progressOf(['note-called-c']);
      },
    );
    expect(read).toEqual(['music-literacy-part-1']);
    expect(states.map((s) => s.status)).toEqual([
      'started',
      'soon',
      'soon',
      'soon',
      'soon',
    ]);
  });
});

describe('where a student stands', () => {
  const draft = {
    ...lesson,
    id: 'music-literacy-part-2',
  } as MusicLiteracyLesson;

  it('is the first open stop not done', () => {
    const states = literacyPath(
      () => lesson,
      () => progressOf(['note-called-c']),
    );
    const { current, upNext } = currentStop(states);
    expect(current?.stop.id).toBe('call-and-response');
    expect(upNext).toBeNull();
  });

  it('stays on the last open stop once it is done, with the next to come', () => {
    const states = literacyPath(
      () => lesson,
      () => progressOf(tags),
    );
    const { current, upNext } = currentStop(states);
    expect(current?.status).toBe('done');
    expect(upNext?.stop.title).toBe('Part 2 · Choose a color');
    expect(upNext?.status).toBe('soon');
  });

  it('moves on when the next stop opens', () => {
    const path = [
      part1,
      { ...LITERACY_PATH[1], live: true, lessonId: draft.id },
    ];
    const states = path.map((stop) =>
      literacyStopState(
        stop,
        stop.lessonId === draft.id ? draft : lesson,
        stop.lessonId === draft.id ? {} : progressOf(tags),
      ),
    );
    expect(currentStop(states).current?.stop.id).toBe('choose-a-color');
  });

  it('is nowhere while no stop is open', () => {
    const states = literacyPath(
      () => undefined,
      () => ({}),
    );
    expect(currentStop(states)).toEqual({ current: null, upNext: null });
  });
});
