// @vitest-environment jsdom
/**
 * Part 1's challenge round, as a student meets it: never after a step's
 * result, but once Part 1 is done ("Part 1 Done! Want a challenge just for
 * fun? Go again and play ALL the notes!"), a second time through its
 * steps, each the same run with PLAY ALONG over the teacher's turn, every
 * note graded, each segment's score, and its own best, kept apart from
 * the step's so it never holds up the lesson. Then from the step list's
 * header, any time after. The transport is faked as in the Part 1 player
 * test.
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
const bar = () => document.querySelector('[data-guitar-bar]')!;
const primary = () => bar().querySelector('[data-primary]')?.textContent;
const counter = () =>
  document
    .querySelector('[data-guitar-step-count]')
    ?.getAttribute('aria-label');
// The step's name, in the lesson's subtitle (its title is the key, "C Major").
const title = () => document.querySelector('[data-subtitle-step]')?.textContent;

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

/** Every step but the first passed, as if played earlier. */
function passTheRest() {
  localStorage.setItem(
    PROGRESS,
    JSON.stringify(
      Object.fromEntries(
        lesson.steps
          .slice(1)
          .map((s) => [s.tag, { best: 90, passed: true, attempts: 1 }]),
      ),
    ),
  );
}

/** Step 1's echo, answered right: three Cs in the answer's bar. */
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
}

/** Part 1 done (its last step to pass, step 1), into its challenge round. */
async function intoTheRound() {
  passTheRest();
  await passTheEcho();
  await press(/Play ALL the Notes/);
  expect(title()).toBe(step.title);
}

beforeEach(() => {
  localStorage.clear();
  run.onCue = null;
  run.starts = 0;
  run.tick = null;
  fedTo = -1;
});
afterEach(() => cleanup());

describe('the challenge round', () => {
  it('is not offered after a step’s result', async () => {
    await passTheEcho();
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(document.querySelector('[data-literacy-offer]')).toBeNull();
    expect(document.querySelector('[data-literacy-passes]')).toBeNull();
    expect(screen.queryByRole('button', { name: /Play ALL the Notes/ })).toBe(
      null,
    );
    expect(primary()).toBe('Next');
  });

  it('is offered once Part 1 is done, just for fun', async () => {
    passTheRest();
    await passTheEcho();
    const card = document.querySelector('[data-literacy-module-done]')!;
    expect(card.getAttribute('data-round')).toBe('challenge');
    expect(screen.getByRole('heading', { name: 'Part 1 Done!' })).toBeTruthy();
    expect(
      card.querySelector('[data-literacy-offer="challenge"]')?.textContent,
    ).toBe('Want a challenge just for fun? Go again and play ALL the notes!');
    expect(card.textContent).toContain('A note called C · 100% · Passed');
    expect(card.textContent).toContain('Challenge Round: 7 steps');
    // The round first; Finish beside it, back to the path.
    expect(primary()).toContain('Play ALL the Notes');
    expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
  });

  it('goes through Part 1 again under its banner, counting its own steps', async () => {
    await intoTheRound();
    const banner = document.querySelector('[data-literacy-round-banner]')!;
    expect(banner.getAttribute('data-literacy-round-banner')).toBe('challenge');
    expect(banner.textContent).toContain('Challenge Round');
    expect(banner.textContent).toContain('Play ALL the notes!');
    expect(counter()).toBe('Step 1 of 7');
    expect(
      document.querySelector('[data-literacy-run-lead]')?.textContent,
    ).toBe('Play ALL the notes, along with Atlas');
    expect(primary()).toBe('Play');
    // Its step list is the round's.
    await act(async () => {
      fireEvent.click(document.querySelector('[data-guitar-step-count]')!);
    });
    const list = document.querySelector('[data-guitar-step-list]')!;
    expect([...list.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Challenge Round',
    ]);
    expect(list.querySelectorAll('li')).toHaveLength(7);
    expect(document.querySelector('[data-group-action]')).toBeNull();
  });

  it('says PLAY ALONG over the teacher’s turn, grades every note, and shows each segment', async () => {
    await intoTheRound();
    await press('Play');
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
    // Next is the round's next step.
    expect(primary()).toBe('Next');
    await press(/^Next$/);
    expect(counter()).toBe('Step 2 of 7');
    expect(title()).toBe(lesson.steps[1].title);
  });

  it('keeps its best, and a miss never touches the step’s pass', async () => {
    await intoTheRound();
    await press('Play');
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
    await intoTheRound();
    await press('Play');
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

  it('ends with Finish on its last step, and is left from its banner', async () => {
    await intoTheRound();
    // The pager, to the round's last step.
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(counter()).toBe('Step 7 of 7');
    await press('Play');
    feedTo(13440);
    expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
    // Leave the round: the same step, as its echo, in the whole lesson.
    await press(/Leave Round/);
    expect(document.querySelector('[data-literacy-round-banner]')).toBeNull();
    expect(counter()).toMatch(/^Step 7 of 7/);
    expect(screen.getByRole('button', { name: 'Practice' })).toBeTruthy();
  });

  it('stays open from the step list’s header once Part 1 is done', async () => {
    passTheRest();
    localStorage.setItem(
      PROGRESS,
      JSON.stringify({
        ...progress(),
        'note-called-c': { best: 90, passed: true, attempts: 1 },
        // Part of the round played before.
        'note-called-c:challenge': { best: 80, passed: true, attempts: 1 },
      }),
    );
    render(
      <MemoryRouter
        initialEntries={[`/curriculum/music-literacy/${lesson.id}`]}
      >
        <MusicLiteracyPlayer lesson={lesson} />
      </MemoryRouter>,
    );
    await act(async () => {
      fireEvent.click(document.querySelector('[data-guitar-step-count]')!);
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: `Play ALL the Notes: ${lesson.name}`,
        }),
      );
    });
    // From its first step not yet passed.
    expect(counter()).toBe('Step 2 of 7');
    expect(title()).toBe(lesson.steps[1].title);
    expect(document.querySelector('[data-literacy-round-banner]')).toBeTruthy();
  });
});
