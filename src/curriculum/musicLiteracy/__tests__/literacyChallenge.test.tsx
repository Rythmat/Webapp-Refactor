// @vitest-environment jsdom
/**
 * Part 1's challenge, as a student meets it: after a step's result, the
 * offer ("Want a challenge just for fun? Go again and play ALL the
 * notes!"), the same run with PLAY ALONG over the teacher's turn, every
 * note graded, each segment's score, and its own best, kept apart from the
 * step's so it never holds up the lesson. The transport is faked as in the
 * Part 1 player test.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITERACY_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture';
import { challengeTargets } from '@/curriculum/engine/musicLiteracy/grading';
import { stepNotes } from '@/curriculum/engine/musicLiteracy/literacy';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';
import { typingLetterFor } from '../typingKeys';

const input = vi.hoisted(() => ({
  stable: {
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    start: async () => {},
    stop: () => {},
  },
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));
const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  cues: [] as unknown[],
  starts: 0,
  tick: null as number | null,
}));
vi.mock('@/curriculum/musicLiteracy/literacyRun', () => ({
  literacyClock: {
    soundingTicks: () => run.tick,
    playbackTicks: () => run.tick,
  },
  startLiteracyRun: async ({
    onCue,
    cues,
  }: {
    onCue: (cue: unknown) => void;
    cues: unknown[];
  }) => {
    run.onCue = onCue;
    run.cues = cues;
    run.starts += 1;
    return true;
  },
  addLiteracyRunCues: () => {},
  stopLiteracyRun: () => {},
  previewLiteracyGroove: async () => {},
}));
vi.mock('@/audio/pianoSampler', () => ({
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));
vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => ({ reportCompletion: () => {} }),
}));

const { MusicLiteracyPlayer } = await import('../MusicLiteracyPlayer');

const lesson = LITERACY_FIXTURE;
const step = lesson.steps[0];
const PROGRESS = `music_literacy_progress_${lesson.id}`;
const progress = () => JSON.parse(localStorage.getItem(PROGRESS) ?? '{}');
const headline = () =>
  document.querySelector('[data-literacy-turn]')?.textContent;

let fedTo = -1;
function feedTo(tick: number) {
  const cues = run.cues as RunCue[];
  act(() =>
    cues
      .filter((c) => c.tick <= tick && c.tick > fedTo)
      .forEach((c) => run.onCue!(c)),
  );
  fedTo = tick;
}
async function press(name: string | RegExp) {
  fedTo = -1;
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}
function typeAt(code: string, tick: number) {
  run.tick = tick;
  act(() => {
    fireEvent.keyDown(window, { code });
  });
  run.tick = tick + 200;
  act(() => {
    fireEvent.keyUp(window, { code });
  });
}
/** The letter key for a pitch, A = C4. */
const codeFor = (midi: number) => {
  const letter = typingLetterFor(midi, 4)!;
  return letter === ';' ? 'Semicolon' : `Key${letter}`;
};

/** The echo, answered right: three Cs in the answer's bar. */
async function passTheEcho() {
  render(
    <MemoryRouter initialEntries={[`/curriculum/music-literacy/${lesson.id}`]}>
      <MusicLiteracyPlayer lesson={lesson} />
    </MemoryRouter>,
  );
  await press('Play');
  feedTo(7680);
  for (const tick of [7680, 8160, 8640]) typeAt('KeyA', tick);
  feedTo(9600);
  expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
}

beforeEach(() => {
  localStorage.clear();
  run.onCue = null;
  run.starts = 0;
  run.tick = null;
  fedTo = -1;
});
afterEach(() => cleanup());

describe('the challenge', () => {
  it('is offered after a step’s result, just for fun', async () => {
    await passTheEcho();
    expect(
      document.querySelector('[data-literacy-offer="challenge"]')?.textContent,
    ).toBe('Want a challenge just for fun? Go again and play ALL the notes!');
    // Next stays the way on: the challenge never holds the lesson up.
    expect(
      document.querySelector('[data-guitar-bar] [data-primary]')?.textContent,
    ).toBe('Next');
    expect(
      screen.getByRole('button', { name: /Take the Challenge/ }),
    ).toBeTruthy();
  });

  it('says PLAY ALONG over the teacher’s turn, grades every note, and shows each segment', async () => {
    await passTheEcho();
    await press(/Take the Challenge/);
    expect(run.starts).toBe(2);
    const cues = run.cues as RunCue[];
    expect(
      cues.some(
        (c) => c.kind === 'note' && c.segment === 'words' && c.playAlong,
      ),
    ).toBe(true);

    feedTo(0);
    expect(headline()).toBe('Play Along');
    feedTo(1920 + 960);
    expect(headline()).toBe('Play Along');
    // Every note: the words, the call, then the answer.
    const targets = challengeTargets(stepNotes(lesson, step));
    expect(targets).toHaveLength(12 + 3 + 3);
    for (const target of targets) {
      feedTo(target.onset);
      if (target.segment === 'call' && target.index === 0) {
        expect(headline()).toBe('Get Ready');
      }
      typeAt(codeFor(target.midi), target.onset);
    }
    feedTo(9600);

    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    const segments = document.querySelector(
      '[data-literacy-challenge-segments]',
    )!;
    expect(
      [...segments.querySelectorAll('[data-segment]')].map((s) => [
        s.getAttribute('data-segment'),
        s.querySelector('dd')?.textContent,
      ]),
    ).toEqual([
      ['words', '12 of 12 notes'],
      ['call', '3 of 3 notes'],
      ['response', '3 of 3 notes'],
    ]);
    // Its own best, apart from the step's.
    expect(progress()['note-called-c:challenge']).toMatchObject({
      best: 100,
      passed: true,
      attempts: 1,
    });
    expect(progress()['note-called-c']).toMatchObject({
      best: 100,
      attempts: 1,
    });
  });

  it('keeps its best, and a miss never touches the step’s pass', async () => {
    await passTheEcho();
    await press(/Take the Challenge/);
    // Only the answer: the words and the call missed.
    feedTo(7680);
    for (const tick of [7680, 8160, 8640]) typeAt('KeyA', tick);
    feedTo(9600);
    const first = progress()['note-called-c:challenge'];
    expect(first.passed).toBe(false);
    expect(
      document.querySelector('[data-segment="words"] dd')?.textContent,
    ).toBe('0 of 12 notes');

    // Try again, worse still: the best stays.
    await press('Try Again');
    feedTo(9600);
    expect(progress()['note-called-c:challenge']).toMatchObject({
      best: first.best,
      attempts: 2,
    });
    expect(progress()['note-called-c']).toMatchObject({
      best: 100,
      passed: true,
      attempts: 1,
    });
    expect(
      document.querySelector('[data-literacy-challenge-segments]')?.textContent,
    ).toContain(`Your best: ${first.best}%.`);
  });

  it('marks a wrong key gray in the teacher’s turn, where the plain echo never does', async () => {
    await passTheEcho();
    await press(/Take the Challenge/);
    feedTo(1920 + 480);
    run.tick = 1920 + 480;
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyD' }); // E, not the words' C
    });
    const gray = [...document.querySelectorAll<HTMLElement>('div')].filter(
      (el) => el.style.backgroundColor === 'rgb(113, 113, 122)',
    );
    expect(gray.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.keyUp(window, { code: 'KeyD' });
    });
  });
});
