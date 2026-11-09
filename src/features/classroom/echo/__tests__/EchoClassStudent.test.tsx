// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

/**
 * A student's device in a class's Echo (EchoClassStudent.tsx,
 * useEchoClassStudent.ts), the transport faked as EchoGame.test.tsx fakes
 * it: the test hands the run its cues and says where on it a key lands.
 * The device waits for the teacher, needs a tap to turn the sound on,
 * starts each round at the server's start time on its own clock, grades
 * the echo quantized and posts every round so far; sits out a round it got
 * too late; stops when the teacher pauses; and shows its result only as
 * the teacher allows.
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
vi.mock('@/curriculum/musicLiteracy/literacyGrooves', () => ({
  drumsForGroove: async () => null,
}));

const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  cues: [] as unknown[],
  starts: [] as (number | undefined)[],
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
    startsAtMs,
  }: {
    onCue: (cue: unknown) => void;
    cues: unknown[];
    startsAtMs?: number;
  }) => {
    run.onCue = onCue;
    run.cues = cues;
    run.starts.push(startsAtMs);
    return true;
  },
  addLiteracyRunCues: () => {},
  stopLiteracyRun: () => {
    run.stops += 1;
  },
}));

const { EchoClassStudent } = await import('../EchoClassStudent');
const { PAD_KEY_CODES } = await import('@/components/Games/Echo/input');
const { echoRandom, melodyCall, melodyPads, toEchoCallWire } = await import(
  '@/curriculum/engine/echo'
);
const { DEFAULT_ECHO_CLASS_SETTINGS, DEFAULT_ECHO_INTERACTION } = await import(
  '../types'
);
type SessionEcho = import('../types').SessionEcho;
type EchoResponsePayload = import('../types').EchoResponsePayload;

const C = { tonic: 'C', mode: 'major' } as const;
const call = melodyCall(1, C, echoRandom('student-test'), { tempo: 90 });
const interaction = {
  id: 'ix-echo',
  type: 'echo' as const,
  question: { en: 'Echo Atlas!' },
  shareable: false,
  echo: DEFAULT_ECHO_INTERACTION,
};
/** The device's clock is half a second behind the server's. */
const OFFSET = 500;
const clock = {
  offsetMs: OFFSET,
  synced: true,
  serverNow: () => Date.now() + OFFSET,
};

const lobby: SessionEcho = {
  slideId: 'sl-echo',
  run: 0,
  section: 'melodyEcho',
  leader: 'atlas',
  level: 1,
  key: C,
  tempo: 90,
  startsAt: 0,
  call: null,
  paused: false,
  settings: DEFAULT_ECHO_CLASS_SETTINGS,
};
const roundOne = (over: Partial<SessionEcho> = {}): SessionEcho => ({
  ...lobby,
  run: 1,
  startsAt: Date.now() + OFFSET + 2000,
  call: toEchoCallWire(call),
  ...over,
});

const $ = (selector: string) => document.querySelector(selector);
const status = () =>
  $('[data-echo-class-student]')?.getAttribute('data-echo-status');
const flush = () =>
  act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });

/** Hand the run its cues, up to (not including) `until`. */
function cues(until = Infinity) {
  for (const cue of run.cues as RunCue[]) {
    if (cue.tick >= until) continue;
    run.tick = cue.tick;
    act(() => run.onCue!(cue));
  }
}

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

function mount(echo: SessionEcho | null) {
  const onSubmit = vi.fn();
  const view = render(
    <EchoClassStudent
      interaction={interaction}
      echo={echo}
      slideId="sl-echo"
      clock={clock}
      onSubmit={onSubmit}
    />,
  );
  const update = (next: SessionEcho | null, submitted?: EchoResponsePayload) =>
    view.rerender(
      <EchoClassStudent
        interaction={interaction}
        echo={next}
        slideId="sl-echo"
        clock={clock}
        submittedPayload={submitted ?? null}
        onSubmit={onSubmit}
      />,
    );
  return { onSubmit, update };
}

async function joinIn() {
  fireEvent.click($('[data-echo-join-in]')!);
  await flush();
}

beforeEach(() => {
  run.starts = [];
  run.stops = 0;
  run.tick = null;
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('a student’s device in a class’s Echo', () => {
  it('waits for the teacher, and needs a tap to turn the sound on', async () => {
    const { update } = mount(lobby);
    expect(status()).toBe('waiting');
    expect(document.body.textContent).toContain('Waiting for your teacher…');
    // A round can't start before the tap.
    update(roundOne());
    await flush();
    expect(status()).toBe('tapToJoin');
    expect(run.starts).toHaveLength(0);
    await joinIn();
    expect(run.starts).toHaveLength(1);
  });

  it('starts the round at the server’s start time, on its own clock', async () => {
    const { update } = mount(lobby);
    await joinIn();
    const echo = roundOne();
    update(echo);
    await flush();
    expect(run.starts).toEqual([echo.startsAt - OFFSET]);
  });

  it('grades the echo quantized and posts every round so far', async () => {
    const { onSubmit, update } = mount(lobby);
    await joinIn();
    update(roundOne());
    await flush();
    const targets = JSON.parse(
      $('[data-echo-targets]')!.getAttribute('data-echo-targets')!,
    ) as { onset: number; pad: number }[];
    const answer = Math.min(...targets.map((t) => t.onset));
    cues(answer);
    for (const t of targets) pad(t.pad, t.onset + 20);
    cues();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0] as EchoResponsePayload;
    expect(payload).toMatchObject({
      kind: 'echo',
      slideId: 'sl-echo',
      bestStreak: 1,
    });
    expect(payload.rounds).toHaveLength(1);
    expect(payload.rounds[0]).toMatchObject({
      run: 1,
      passed: true,
      score: 100,
      asked: call.notes.map((n) => n.label),
    });
    // Each note 20 ticks late: about 28 ms at 90 BPM.
    expect(payload.rounds[0].timing).toEqual(call.notes.map(() => 28));
    expect($('[data-echo-result]')?.getAttribute('data-echo-result')).toBe(
      'pass',
    );
    expect(status()).toBe('result');

    // The next round adds to what was sent.
    update(roundOne({ run: 2, startsAt: Date.now() + OFFSET + 2000 }), payload);
    await flush();
    cues();
    const second = onSubmit.mock.calls[1][0] as EchoResponsePayload;
    expect(second.rounds.map((r) => [r.run, r.passed])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(second.rounds[1].played).toEqual([]);
  });

  it('sits out a round it got too late', async () => {
    const { update } = mount(lobby);
    await joinIn();
    update(roundOne({ startsAt: Date.now() + OFFSET - 3000 }));
    await flush();
    expect(run.starts).toHaveLength(0);
    expect(status()).toBe('sittingOut');
    expect(document.body.textContent).toContain('Join in on the next round.');
  });

  it('stops the music when the teacher pauses', async () => {
    const { update } = mount(lobby);
    await joinIn();
    const echo = roundOne();
    update(echo);
    await flush();
    const stops = run.stops;
    update({ ...echo, paused: true });
    await flush();
    expect(run.stops).toBeGreaterThan(stops);
    expect(status()).toBe('paused');
  });

  it('shows its own result only if the teacher allows it', async () => {
    const quiet = {
      ...DEFAULT_ECHO_CLASS_SETTINGS,
      afterRound: 'nothing' as const,
      classProgress: false,
    };
    const { update } = mount({ ...lobby, settings: quiet });
    await joinIn();
    update(roundOne({ settings: quiet }));
    await flush();
    cues();
    expect($('[data-echo-result]')).toBeNull();
    expect(document.body.textContent).toContain('Your echo is in.');
    expect($('[data-echo-class-result]')).toBeNull();
  });

  it('plays on the pads in the key the teacher set', () => {
    mount({ ...lobby, key: { tonic: 'G', mode: 'major' } });
    const pads = document.querySelectorAll('[data-echo-pad]');
    expect(pads.length).toBe(
      melodyPads({ tonic: 'G', mode: 'major' }).pads.length,
    );
  });
});
