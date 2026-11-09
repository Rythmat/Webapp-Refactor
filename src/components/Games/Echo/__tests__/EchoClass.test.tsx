// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

/**
 * Echo presented to a class (docs/echo-classroom.md, Presenter mode), the
 * transport faked as EchoGame.test.tsx fakes it: a teacher's setup (Who's
 * Playing?, Who Leads?, every level open), the teacher judging an answer
 * the class played off the screen, the teacher's own call (Your Call, then
 * the class's answer to it), "No call heard", and an answer played here
 * graded the class's way. No XP and no High Score move.
 */

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
vi.mock('@/audio/pianoSampler', () => ({
  startPianoSampler: async () => {},
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));
vi.mock('@/contexts/AuthContext/hooks/useUserRole', () => ({
  useUserRole: () => 'teacher',
}));

/** The fake run: the latest start's cues and handler, and the clock's tick. */
const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  cues: [] as unknown[],
  added: [] as unknown[],
  starts: 0,
  stops: 0,
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
    run.added = [];
    run.starts += 1;
    return true;
  },
  addLiteracyRunCues: (cues: unknown[]) => {
    run.added.push(...cues);
  },
  stopLiteracyRun: () => {
    run.stops += 1;
  },
}));
vi.mock('../makeYourSong/MakeYourSong', () => import('./MakeYourSongStandIn'));
const xp = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => {}) }));
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardArcadeExperience: () => xp,
}));

const { default: EchoGame, INTRO_MS, RESULT_MS } = await import('../EchoGame');
const { PAD_KEY_CODES } = await import('../input');
const { ECHO_SETTINGS_KEY, resetEchoSettingsCache } = await import(
  '../echoSettings'
);
const { readEchoProgress } = await import('../echoProgress');
const { melodyPads } = await import('@/curriculum/engine/echo');

const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const $ = (selector: string) => document.querySelector(selector);
const stage = () => $('[data-echo-targets]')!;
const screenKind = () =>
  $('[data-echo-screen]')?.getAttribute('data-echo-screen');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() =>
    Promise.resolve(),
  );
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  localStorage.clear();
  localStorage.setItem(
    ECHO_SETTINGS_KEY,
    JSON.stringify({ input: 'pads', groove: false }),
  );
  resetEchoSettingsCache();
  xp.mutateAsync.mockClear();
  run.starts = 0;
  run.stops = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Hand the run its cues, from `from` up to (not including) `until`. */
async function cues({ from = -Infinity, until = Infinity } = {}) {
  await flush();
  for (const cue of run.cues as RunCue[]) {
    if (cue.tick < from || cue.tick >= until) continue;
    run.tick = cue.tick;
    if (cue.kind === 'drum') continue;
    act(() => run.onCue!(cue));
  }
}

/** A pad pressed and let go at a tick of the run. */
function pad(index: number, tick: number) {
  run.tick = tick;
  act(() => {
    fireEvent.keyDown(window, { code: PAD_KEY_CODES[index] });
  });
  run.tick = tick + 100;
  act(() => {
    fireEvent.keyUp(window, { code: PAD_KEY_CODES[index] });
  });
}

/** The run's ticks: the call, the count-off, the answer. */
const spans = () => {
  const beats = (run.cues as RunCue[]).filter((c) => c.kind === 'beat');
  const call = beats.find((b) => b.kind === 'beat' && b.phase === 'call')!.tick;
  const answer = beats.find(
    (b) => b.kind === 'beat' && b.phase === 'response',
  )!.tick;
  return { call, countOff: answer - 1920, answer };
};

function present(leader: 'atlas' | 'teacher' = 'atlas') {
  render(
    <MemoryRouter>
      <EchoGame makeSeed={() => 'class-seed'} />
    </MemoryRouter>,
  );
  fireEvent.click($('[data-echo-audience="class"]')!);
  if (leader === 'teacher')
    fireEvent.click($('[data-echo-leader-pick="teacher"]')!);
  fireEvent.click($('[data-echo-start]')!);
}

describe('Echo presented to a class', () => {
  it('lets a teacher present, every level open, and choose who leads', () => {
    render(
      <MemoryRouter>
        <EchoGame makeSeed={() => 'class-seed'} />
      </MemoryRouter>,
    );
    expect($('[data-echo-leader-pick]')).toBeNull();
    expect(($('[data-echo-level="3"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click($('[data-echo-audience="class"]')!);
    expect($('[data-echo-leader-pick="atlas"]')).toBeTruthy();
    expect(($('[data-echo-level="3"]') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect($('[data-echo-start]')!.textContent).toMatch(/Present Echo/);
    fireEvent.click($('[data-echo-start]')!);
    expect(screenKind()).toBe('intro');
    // The header: who leads, and no XP.
    expect($('[data-echo-leader]')?.getAttribute('data-echo-leader')).toBe(
      'atlas',
    );
    expect(document.body.textContent).not.toMatch(/\+0XP|XP\+0/);
  });

  it('asks the teacher how the class did, and goes on with the verdict', async () => {
    present('atlas');
    await wait(INTRO_MS);
    expect(screenKind()).toBe('round');
    await cues();
    // Nothing was played here: the teacher judges.
    expect($('[data-echo-judge]')).toBeTruthy();
    expect($('[data-echo-result]')).toBeNull();
    // Still there however long it waits.
    await wait(RESULT_MS * 3);
    expect(stage().getAttribute('data-echo-round')).toBe('0');
    const starts = run.starts;
    // Y: Got It!
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyY' });
    });
    await flush();
    expect($('[data-echo-judge]')).toBeNull();
    expect(stage().getAttribute('data-echo-round')).toBe('1');
    expect(run.starts).toBe(starts + 1);
    expect($('[data-echo-streak]')?.getAttribute('data-echo-streak')).toBe('1');
    // Again plays round 1 once more.
    await cues();
    fireEvent.click($('[data-echo-verdict="again"]')!);
    await flush();
    expect(stage().getAttribute('data-echo-round')).toBe('1');
    expect(run.starts).toBe(starts + 2);
    // No High Score is kept for a class.
    expect(readEchoProgress().highScores[1] ?? 0).toBe(0);
  });

  it('grades an answer played on the teacher’s screen the class’s way', async () => {
    present('atlas');
    await wait(INTRO_MS);
    await flush();
    const targets = JSON.parse(stage().getAttribute('data-echo-targets')!) as {
      onset: number;
      pad: number;
    }[][];
    const { answer } = spans();
    await cues({ until: answer });
    // Each note a little late, but inside half the subdivision.
    for (const t of targets[0]) pad(t.pad, t.onset + 50);
    await cues({ from: answer });
    expect($('[data-echo-result]')?.getAttribute('data-echo-result')).toBe(
      'pass',
    );
    expect($('[data-echo-judge]')).toBeNull();
  });

  it('plays the teacher’s call: Your Call, then the class answers it', async () => {
    present('teacher');
    expect($('[data-echo-leader]')?.getAttribute('data-echo-leader')).toBe(
      'teacher',
    );
    await wait(INTRO_MS);
    await flush();
    const { call, countOff } = spans();
    await cues({ until: call + 1 });
    expect($('[data-literacy-cue="yourCall"]')).toBeTruthy();
    // The teacher plays 1 3 5 on the pads, over the call's bar.
    pad(0, call);
    pad(2, call + 480);
    pad(4, call + 960);
    await cues({ from: call + 1, until: countOff + 1 });
    // The call is the teacher's now: on the stage, and lit in the answer.
    const tonic = melodyPads({ tonic: 'C', mode: 'major' }).tonic;
    const targets = JSON.parse(stage().getAttribute('data-echo-targets')!) as {
      midis: number[];
    }[][];
    expect(targets[0].map((t) => t.midis[0] - tonic)).toEqual([0, 4, 7]);
    expect(run.added.length).toBeGreaterThan(0);
    // The class answers off the screen: the teacher judges.
    await cues({ from: countOff + 1 });
    expect($('[data-echo-judge]')?.textContent).toMatch(/1 · 3 · 5/);
    fireEvent.click($('[data-echo-verdict="good"]')!);
    await flush();
    expect(stage().getAttribute('data-echo-round')).toBe('1');
  });

  it('says No call heard when the teacher plays nothing, and runs again', async () => {
    present('teacher');
    await wait(INTRO_MS);
    await flush();
    const { countOff } = spans();
    const starts = run.starts;
    await cues({ until: countOff + 1 });
    expect($('[data-echo-no-call]')).toBeTruthy();
    expect(run.stops).toBeGreaterThan(0);
    await wait(RESULT_MS);
    await flush();
    expect($('[data-echo-no-call]')).toBeNull();
    expect(run.starts).toBe(starts + 1);
    expect(stage().getAttribute('data-echo-round')).toBe('0');
  });
});
