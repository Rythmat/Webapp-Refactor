// @vitest-environment jsdom
/**
 * The one lesson container, played on both instruments.
 *
 * Piano must behave exactly as it always has: its keyboard, MIDI in, no
 * microphone, piano scoring. Guitar reads from TAB with the guitar visuals,
 * and a MIDI guitar playing the book's scale position finishes an
 * out-of-time step through the guitar evaluation hook.
 *
 * Audio, the transport and the input provider are faked; VexFlow never
 * loads (jsdom has no layout), so the TAB shows its loading state.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';

// ── Fakes ────────────────────────────────────────────────────────────────

const input = vi.hoisted(() => {
  const on = new Set<(e: unknown) => void>();
  const off = new Set<(e: unknown) => void>();
  const chords = new Set<(e: unknown) => void>();
  const sub =
    (set: Set<(e: unknown) => void>) => (cb: (e: unknown) => void) => {
      set.add(cb);
      return () => set.delete(cb);
    };
  return {
    on,
    off,
    chords,
    stable: {
      subscribeNoteOn: sub(on),
      subscribeNoteOff: sub(off),
      subscribeChord: sub(chords),
      start: async () => {},
      stop: () => {},
      guitar: null,
      instrument: 'piano',
    },
  };
});

vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));

const transport = vi.hoisted(() => ({
  state: 'stopped',
  position: 0,
  PPQ: 192,
  bpm: { value: 80 },
  start: () => {},
  stop: () => {},
  cancel: () => {},
  getTicksAtTime: () => 0,
}));
vi.mock('tone', () => ({
  getTransport: () => transport,
  getContext: () => ({
    rawContext: { currentTime: 0, outputLatency: 0, baseLatency: 0 },
  }),
  getDraw: () => ({ schedule: () => {} }),
  now: () => 0,
  immediate: () => 0,
  Part: class {
    start() {}
    stop() {}
    dispose() {}
  },
}));
vi.mock('@/audio/core/toneBridge', () => ({ startTone: async () => {} }));

const piano = vi.hoisted(() => ({
  triggerPianoAttack: vi.fn(async () => {}),
  triggerPianoRelease: vi.fn(async () => {}),
  startPianoSampler: vi.fn(async () => {}),
  triggerPianoAttackRelease: vi.fn(async () => {}),
  getPianoSampler: vi.fn(async () => ({})),
  setPianoSamplerVolume: vi.fn(),
  getPianoSamplerVolume: () => 0,
  releaseAllPianoNotes: vi.fn(async () => {}),
}));
vi.mock('@/audio/pianoSampler', () => piano);

const guitar = vi.hoisted(() => ({
  loadGuitarVoice: vi.fn(async () => {}),
  playGuitarGuideNote: vi.fn(),
  strumGuitarChord: vi.fn(),
  guitarNoteOn: vi.fn(),
  guitarNoteOff: vi.fn(),
  cancelScheduledGuitarNotes: vi.fn(),
  releaseGuitarVoice: vi.fn(),
  guitarLessonVoice: {
    load: async () => {},
    attackRelease: () => {},
    stop: () => {},
  },
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => guitar);

vi.mock('@/curriculum/hooks/useMetronome', () => ({
  useMetronome: () => ({ setBpm: () => {}, prepare: async () => {} }),
}));
vi.mock('@/curriculum/hooks/useBackingTrack', () => ({
  BACKING_LEAD_SEC: 0.1,
  useBackingTrack: () => ({
    startBacking: async () => {},
    stopBacking: () => {},
    initSF2: async () => {},
  }),
}));
vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => ({ reportCompletion: () => {} }),
}));
vi.mock('@/learn/components/LessonVolumeDial', () => ({
  LessonVolumeDial: () => null,
}));
vi.mock('@/learn/components/MetronomeToggle', () => ({
  MetronomeToggle: () => null,
}));

const { GenreLessonContainerV2 } = await import(
  '@/curriculum/pages/GenreLessonContainerV2'
);

function emitNote(kind: 'on' | 'off', midi: number) {
  const event: MidiNoteEvent = {
    number: midi,
    velocity: kind === 'on' ? 90 : 0,
    duration: 0,
  };
  for (const cb of kind === 'on' ? input.on : input.off) cb(event);
}

function renderLesson(
  flow: ReturnType<typeof buildAppliedTheoryFundamentalsFlow>,
) {
  return render(
    <MemoryRouter>
      <GenreLessonContainerV2 flow={flow} genre={flow.genre} level={1} />
    </MemoryRouter>,
  );
}

describe('GenreLessonContainerV2 on piano and guitar', () => {
  const getUserMedia = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    input.on.clear();
    input.off.clear();
    input.chords.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('piano: keyboard, piano sound, piano scoring, no microphone', async () => {
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    expect(container.querySelector('[data-guitar-visuals]')).toBeNull();
    expect(container.querySelector('[data-guitar-mode]')).toBeNull();
    expect(container.querySelector('[data-guitar-theory]')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Piano roll' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    });
    // C major scale, out of time: hold each note past 80% of its length.
    for (const midi of [60, 62, 64, 65, 67, 69, 71, 72]) {
      act(() => emitNote('on', midi));
      act(() => vi.advanceTimersByTime(500));
      act(() => emitNote('off', midi));
    }
    expect(piano.triggerPianoAttack).toHaveBeenCalled();
    expect(guitar.guitarNoteOn).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('guitar: TAB and guitar visuals; a MIDI guitar finishes the scale step', async () => {
    const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
    const { container } = renderLesson(flow);
    expect(container.querySelector('[data-guitar-visuals]')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Tablature' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Piano roll' })).toBeNull();
    // How the step listens, and its pass mark, before the take.
    expect(container.querySelector('[data-guitar-mode]')?.textContent).toMatch(
      /Wait for me.*Pass mark 75%/,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    });
    // The book's C major position: C3 D3 E3 F3 G3 A3 B3 C4, out of time.
    const scale = flow.sections[0].steps[0].targetNotes!.map((n) => n.midi);
    expect(scale).toEqual([48, 50, 52, 53, 55, 57, 59, 60]);
    for (const midi of scale) {
      act(() => emitNote('on', midi));
      act(() => vi.advanceTimersByTime(350));
      act(() => emitNote('off', midi));
    }
    expect(guitar.guitarNoteOn).toHaveBeenCalledWith(48, 90);
    expect(piano.triggerPianoAttack).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('guitar: a strummed chord step completes from chords of any voicing', async () => {
    const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
    renderLesson(flow);
    fireEvent.click(screen.getByRole('button', { name: /^B Chords/ }));
    // Entering Section B the first time in a key: where the chords come
    // from, in place of the start card, until it's closed — once per key.
    const card = () =>
      screen.queryByRole('region', { name: 'Chords come from the scale' });
    expect(card()).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Play Now' })).toBeNull();
    fireEvent.click(within(card()!).getByRole('button', { name: 'Got it' }));
    expect(card()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^A Melody/ }));
    fireEvent.click(screen.getByRole('button', { name: /^B Chords/ }));
    expect(card()).toBeNull();
    // B2.1 — Play Chords 1,2,3,4 (Out of Time).
    for (let i = 0; i < 8; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }
    expect(screen.getByText(/B2\.1: Play Chords 1,2,3,4/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    });
    const chords = [
      { rootPc: 0, quality: 'major', pcs: [0, 4, 7] },
      { rootPc: 2, quality: 'minor', pcs: [2, 5, 9] },
      { rootPc: 4, quality: 'minor', pcs: [4, 7, 11] },
      { rootPc: 5, quality: 'major', pcs: [0, 5, 9] },
    ];
    chords.forEach((c, i) => {
      act(() => {
        for (const cb of input.chords) {
          cb({
            phase: 'on',
            strumId: i + 1,
            confidence: 1,
            onsetPerfMs: 0,
            source: 'midi',
            ...c,
          });
        }
      });
      act(() => vi.advanceTimersByTime(1100));
    });
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
  });
});

// ── Guitar practice tools and detection trust ──────────────────────────────

/** Progress the lesson saved (useGenreProgress), to prove passes aren't. */
function savedProgress(): string {
  const saved: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (/progress/i.test(key))
      saved.push(`${key}=${localStorage.getItem(key)}`);
  }
  return saved.sort().join('\n');
}

describe('GenreLessonContainerV2 guitar practice tools', () => {
  const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
  const inTimeIndex = flow.sections[0].steps.findIndex(
    (s) => s.assessment !== 'pitch_only',
  );

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    input.on.clear();
    input.off.clear();
    input.chords.clear();
    transport.bpm.value = 80;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /** Let an async start (several awaits, then a timer) run through. */
  async function settle(ms = 600) {
    for (let t = 0; t < ms; t += 50) await vi.advanceTimersByTimeAsync(50);
  }

  async function openInTimeScale() {
    renderLesson(flow);
    for (let i = 0; i < inTimeIndex; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }
  }

  /** Play Now, play nothing, let the take run out. */
  async function missATake() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
      await settle();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
  }

  it('a missed take shows sub-scores, marks the mistakes and suggests a loop', async () => {
    await openInTimeScale();
    await missATake();
    expect(screen.getByRole('heading', { name: /0%/ })).toBeTruthy();
    const extras = document.querySelector('[data-guitar-result-extras]')!;
    expect(extras.textContent).toMatch(/Notes\s*0%/);
    expect(extras.textContent).toMatch(/Timing/);
    expect(
      screen.queryByRole('button', { name: 'Count it myself' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show mistakes' }));
    expect(screen.queryByRole('heading', { name: /0%/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to result' }));
    expect(screen.getByRole('heading', { name: /0%/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Loop bars? 1/ })).toBeTruthy();
  });

  it('the suggested loop practises its bars at 70%, again and again, never recorded', async () => {
    await openInTimeScale();
    await missATake();
    const afterTake = savedProgress();

    // The loop starts practice from an effect, flushed as act() ends.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Loop bars? 1/ }));
    });
    await act(() => settle());
    const status = () =>
      document.querySelector('[data-guitar-loop-status]')?.textContent ?? '';
    expect(status()).toMatch(/Loop bars 1–2 · pass 1/);
    // The step plays at 60 BPM; the speed trainer starts the loop at 70%.
    expect(transport.bpm.value).toBe(42);
    expect(screen.getByRole('switch', { name: 'Speed trainer' })).toBeTruthy();

    // A pass runs out: scored silently, and the loop goes round again.
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await act(() => settle());
    expect(status()).toMatch(/pass 2/);
    expect(screen.queryByRole('heading', { name: /%/ })).toBeNull();
    expect(savedProgress()).toBe(afterTake);

    // Stop looping: practice goes on over the whole step.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop looping' }));
    });
    await act(() => settle());
    expect(status()).toMatch(/Tap a bar to loop it/);
    // Back leaves practice; Play Now would grade the whole step.
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('button', { name: 'Play Now' })).toBeTruthy();
  });

  it('after three missed takes the student may count the step themselves', async () => {
    await openInTimeScale();
    for (let take = 0; take < 3; take++) {
      if (take > 0)
        fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      await missATake();
      const offered = !!screen.queryByRole('button', {
        name: 'Count it myself',
      });
      expect(offered).toBe(take === 2);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Count it myself' }));
    expect(
      screen.getByRole('heading', { name: '✓ Counted by you' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /A1\.\d.*: counted by you$/ }),
    ).toBeTruthy();
  });
});

// ── Guitar input: setup, microphone, what the engine listens for ──────────

function fakeGuitarHandle(status: 'needs-setup' | 'idle') {
  return {
    status,
    prefs: {
      source: 'audio' as const,
      deviceId: null,
      channel: 0,
      trimDb: 0,
      gateRms: 0.01,
      inputLatencyMs: 0,
      bleedDetected: false,
      monitorThroughAmp: false,
    },
    level: 0,
    error: null,
    enable: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    setEvaluationMode: vi.fn(),
    setSuppressed: vi.fn(),
    setExpectedNotes: vi.fn(),
    setKeyContext: vi.fn(),
    setClickFilter: vi.fn(),
    calibrateGate: vi.fn(async () => 0.01),
    getTunerAnalyser: () => null,
    getLastChroma: () => null,
    getRig: () => null,
  };
}

describe('GenreLessonContainerV2 guitar input', () => {
  const stable = input.stable as { guitar: unknown };

  afterEach(() => {
    cleanup();
    stable.guitar = null;
    vi.clearAllMocks();
  });

  it('opens the setup on the first run instead of starting, never asking for the mic by itself', async () => {
    const handle = fakeGuitarHandle('needs-setup');
    stable.guitar = handle;
    renderLesson(buildGuitarAppliedTheoryFundamentalsFlow('C'));
    expect(handle.setEvaluationMode).toHaveBeenLastCalledWith('off');
    expect(
      screen.getByRole('button', { name: /set up|guitar input/i }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(handle.enable).not.toHaveBeenCalled();
    expect(handle.setEvaluationMode).not.toHaveBeenCalledWith('notes');
  });

  it('switches the microphone on from Play Now and listens for the step only during the take', async () => {
    const handle = fakeGuitarHandle('idle');
    stable.guitar = handle;
    renderLesson(buildGuitarAppliedTheoryFundamentalsFlow('C'));
    expect(handle.enable).not.toHaveBeenCalled();
    expect(handle.setKeyContext).toHaveBeenLastCalledWith(
      0,
      [0, 2, 4, 5, 7, 9, 11],
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    });
    expect(handle.enable).toHaveBeenCalledTimes(1);
    expect(handle.setEvaluationMode).toHaveBeenLastCalledWith('notes');
    expect(handle.setExpectedNotes).toHaveBeenLastCalledWith([
      48, 50, 52, 53, 55, 57, 59, 60,
    ]);
    expect(handle.setSuppressed).toHaveBeenLastCalledWith(false);
  });
});
