// @vitest-environment jsdom
/**
 * The guitar lesson screen as the container wires it: GenreLessonContainerV2
 * keeps every hook and handler and, on guitar only, hands GuitarLessonLayout
 * its models. These tests hold the promises the redesign made:
 *
 * - piano never reaches the guitar layout, and guitar never shows piano's
 *   "Ready to start?" card;
 * - nothing opens by itself — not on arrival, a new step, entering Chords or
 *   after a take;
 * - the action bar follows the take (preview → practice → performance →
 *   result → preview), Stop ends a take, and the section-complete offer
 *   moves on only when asked;
 * - the arrow keys move one step, from the preview only, never out of a
 *   control or a sheet;
 * - the TAB box is one DOM node for the whole lesson, and a take's mistakes
 *   are marked on it straight away.
 *
 * GenrePianoRoll is a stub that draws the guitar TAB overlays over a fake
 * layout (jsdom can't run VexFlow), so the mistake markers can be seen.
 * Audio, the transport, the demo and the input provider are faked.
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
import { SettingsRoutes } from '@/constants/routes';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';

// ── Fakes ────────────────────────────────────────────────────────────────

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

const practiceTrack = vi.hoisted(() => ({
  openGenrePracticeTrack: vi.fn((..._args: unknown[]) => null),
}));
vi.mock(
  '@/features/practiceTracks/genre/openGenrePracticeTrack',
  () => practiceTrack,
);

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
      guitar: null as unknown,
      instrument: 'guitar',
    },
  };
});
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));

/** Tone's Part can throw from stop() (a stop a hair before tick 0). */
const tone = vi.hoisted(() => ({ stopThrows: false, stops: 0 }));
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
    stop() {
      tone.stops += 1;
      if (tone.stopThrows) {
        throw new RangeError('Value must be within [0, Infinity]');
      }
    }
    dispose() {}
  },
}));
vi.mock('@/audio/core/toneBridge', () => ({ startTone: async () => {} }));
vi.mock('@/audio/pianoSampler', () => ({
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  startPianoSampler: async () => {},
  triggerPianoAttackRelease: async () => {},
  getPianoSampler: async () => ({}),
  setPianoSamplerVolume: () => {},
  getPianoSamplerVolume: () => 0,
  releaseAllPianoNotes: async () => {},
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => ({
  loadGuitarVoice: async () => {},
  playGuitarGuideNote: () => {},
  strumGuitarChord: () => {},
  guitarNoteOn: () => {},
  guitarNoteOff: () => {},
  cancelScheduledGuitarNotes: () => {},
  releaseGuitarVoice: () => {},
  guitarLessonVoice: {
    load: async () => {},
    attackRelease: () => {},
    stop: () => {},
  },
}));
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

/** The demo, as a switch the test flips (isPlayingDemo is read per render). */
const demo = vi.hoisted(() => ({
  playing: false,
  highlights: new Set<number>(),
  playDemo: vi.fn(async (..._args: unknown[]) => {}),
  stopDemo: vi.fn(),
}));
vi.mock('@/curriculum/hooks/useDemoPlayback', () => ({
  useDemoPlayback: () => ({
    playDemo: demo.playDemo,
    stopDemo: demo.stopDemo,
    demoHighlightMidis: demo.highlights,
    isPlayingDemo: demo.playing,
  }),
}));

/** Twelve 4/4 bars on one system, as TabStaffView would report them. */
const roll = vi.hoisted(() => ({
  props: [] as Record<string, unknown>[],
  layout: {
    barlines: [],
    measures: Array.from({ length: 12 }, (_, i) => ({
      measureIndex: i,
      partIndex: 0,
      system: 0,
      x: 40 + i * 100,
      y: 0,
      width: 100,
      height: 80,
      startTick: i * 1920,
      endTick: (i + 1) * 1920,
    })),
    notes: [],
    rests: [],
    scale: 1,
    systemHeight: 120,
    stepPx: 5,
    topLineDrop: 20,
  },
}));
vi.mock('@/curriculum/components/GenrePianoRoll', () => ({
  default: (props: {
    instrument?: string;
    tabOverlay?: (layout: unknown) => ReactNode;
  }) => {
    roll.props.push(props);
    return (
      <div data-testid="tab" data-instrument={props.instrument}>
        {props.tabOverlay?.(roll.layout)}
      </div>
    );
  },
}));

const { GenreLessonContainerV2 } = await import(
  '@/curriculum/pages/GenreLessonContainerV2'
);

// ── Helpers ──────────────────────────────────────────────────────────────

const guitarC = () => buildGuitarAppliedTheoryFundamentalsFlow('C');

function lesson(flow: ActivityFlowV2, initialSection?: ActivitySectionId) {
  return (
    <MemoryRouter>
      <GenreLessonContainerV2
        flow={flow}
        genre={flow.genre}
        level={1}
        initialSection={initialSection}
      />
    </MemoryRouter>
  );
}

function renderLesson(
  flow: ActivityFlowV2,
  initialSection?: ActivitySectionId,
) {
  return render(lesson(flow, initialSection));
}

function emitNote(kind: 'on' | 'off', midi: number) {
  const event: MidiNoteEvent = {
    number: midi,
    velocity: kind === 'on' ? 90 : 0,
    duration: 0,
  };
  for (const cb of kind === 'on' ? input.on : input.off) cb(event);
}

/** Let an async start (several awaits, then a timer) run through. */
async function settle(ms = 600) {
  for (let t = 0; t < ms; t += 50) await vi.advanceTimersByTimeAsync(50);
}

const barState = () =>
  document.querySelector('[data-guitar-bar]')?.getAttribute('data-guitar-bar');
const stage = () => document.querySelector<HTMLElement>('[data-guitar-stage]');
const stepCount = () =>
  screen
    .getByRole('button', { name: /^Step \d+ of \d+/ })
    .getAttribute('aria-label');
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const aboutButton = () => button(/^About this step/);
const gear = () => button('Lesson settings');

function arrow(
  key: 'ArrowLeft' | 'ArrowRight',
  target: Element | Window = window,
) {
  act(() => {
    fireEvent.keyDown(target, { key });
  });
}

/** Nothing is open: no sheet, no dialog, and never the old start card. */
function expectNothingOpen() {
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('[data-guitar-sheet]')).toBeNull();
  expect(aboutButton()).toHaveAttribute('aria-expanded', 'false');
  expect(gear()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Ready to start?')).toBeNull();
}

/** The book's C major position, A1.1 (out of time). */
async function playTheScale() {
  await act(async () => {
    fireEvent.click(button('Play Now'));
  });
  for (const midi of [48, 50, 52, 53, 55, 57, 59, 60]) {
    act(() => emitNote('on', midi));
    act(() => vi.advanceTimersByTime(350));
    act(() => emitNote('off', midi));
  }
}

/** Play Now on an in-time step, play nothing, let the take run out. */
async function missATake() {
  await act(async () => {
    fireEvent.click(button('Play Now'));
    await settle();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
}

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

/** Progress the lesson saved (useGenreProgress). */
function savedProgress(): string {
  const saved: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (/progress/i.test(key)) {
      saved.push(`${key}=${localStorage.getItem(key)}`);
    }
  }
  return saved.sort().join('\n');
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  input.on.clear();
  input.off.clear();
  input.chords.clear();
  input.stable.guitar = null;
  roll.props = [];
  demo.playing = false;
  transport.bpm.value = 80;
  tone.stopThrows = false;
  tone.stops = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── Which screen ─────────────────────────────────────────────────────────

describe('the guitar layout, guitar only', () => {
  it('guitar gets the layout: TAB in the stage, visuals below, no start card', () => {
    const { container } = renderLesson(guitarC());
    expect(container.querySelector('[data-guitar-layout]')).not.toBeNull();
    expect(screen.queryByText('Ready to start?')).toBeNull();
    // The TAB is the stage's only content, without its own view toggle.
    expect(within(stage()!).getByTestId('tab')).toHaveAttribute(
      'data-instrument',
      'guitar',
    );
    expect(roll.props.at(-1)).toMatchObject({
      instrument: 'guitar',
      guitarViewToggle: false,
      // The preview: a paged TAB opens on the music, not the count-in bar.
      tabOpensOnMusic: true,
    });
    // The visuals, without their own chip row, in their slot under it.
    const slot = container.querySelector('[data-guitar-visuals-slot]')!;
    expect(slot.querySelector('[data-guitar-visuals]')).not.toBeNull();
    // Demo · Practice · Play Now are in the action bar.
    const bar = screen.getByRole('region', { name: 'Lesson controls' });
    expect(within(bar).getByRole('button', { name: 'Play Now' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Practice' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Demo' })).toBeTruthy();
  });

  it('piano keeps its own screen and start card', () => {
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    expect(container.querySelector('[data-guitar-layout]')).toBeNull();
    expect(container.querySelector('[data-guitar-bar]')).toBeNull();
    expect(screen.getByText('Ready to start?')).toBeTruthy();
    expect(roll.props.at(-1)).toMatchObject({ instrument: 'piano' });
    expect(roll.props.at(-1)).not.toHaveProperty('guitarViewToggle');
    expect(roll.props.at(-1)).not.toHaveProperty('tabOpensOnMusic');
  });
});

// ── Nothing opens by itself ──────────────────────────────────────────────

describe('nothing opens by itself', () => {
  it('not on arrival, a new step, entering Chords, or after a take', async () => {
    renderLesson(guitarC());
    expectNothingOpen();

    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 2 of/);
    expectNothingOpen();
    fireEvent.click(button('Next step'));
    expect(stepCount()).toMatch(/^Step 3 of/);
    expectNothingOpen();

    // Chords, the first time in this key: its news waits behind the dot.
    fireEvent.click(button(/^B Chords/));
    expectNothingOpen();
    expect(aboutButton()).toHaveAttribute('data-unseen', 'true');
    expect(
      screen.queryByRole('region', { name: 'Chords come from the scale' }),
    ).toBeNull();

    // B1.2 is in time: a take that runs out, scored.
    arrow('ArrowRight');
    await missATake();
    expect(barState()).toBe('result');
    expect(screen.getByRole('heading', { name: /0%/ })).toBeTruthy();
    expectNothingOpen();
  });

  it('About this step opens only from its button, and shows Section B there', () => {
    renderLesson(guitarC(), 'B');
    expectNothingOpen();
    fireEvent.click(aboutButton());
    const sheet = screen.getByRole('dialog', { name: /^About this step/ });
    expect(
      within(sheet).getByRole('region', { name: 'Chords come from the scale' }),
    ).toBeTruthy();
    // Reading it clears the dot.
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(aboutButton()).not.toHaveAttribute('data-unseen');
  });
});

// ── The action bar ───────────────────────────────────────────────────────

describe('the action bar follows the take', () => {
  it('preview → practice → performance → result → preview', async () => {
    renderLesson(guitarC());
    arrow('ArrowRight'); // A1.2, in time
    expect(barState()).toBe('preview');
    expect(screen.getByRole('group', { name: 'Tempo' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(button('Practice'));
      await settle();
    });
    expect(barState()).toBe('practice');
    expect(
      document.querySelector('[data-guitar-loop-status]')?.textContent,
    ).toMatch(/Tap a bar to loop it/);
    expect(button('Back')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Speed trainer' })).toBeTruthy();

    await act(async () => {
      fireEvent.click(button('Perform'));
      await settle();
    });
    expect(barState()).toBe('performance');
    expect(button('Stop')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play Now' })).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(barState()).toBe('result');
    expect(screen.getByRole('heading', { name: /0%/ })).toBeTruthy();
    // A miss: Try Again is the primary, Next is still there.
    expect(button('Try Again')).toHaveAttribute('data-primary');
    expect(button('Next')).toBeTruthy();

    fireEvent.click(button('Try Again'));
    expect(barState()).toBe('preview');
    expect(screen.queryByRole('heading', { name: /%/ })).toBeNull();
  });

  it('Stop ends a take part-way: back to the preview, nothing scored or saved', async () => {
    const handle = fakeGuitarHandle('idle');
    input.stable.guitar = handle;
    renderLesson(guitarC());
    arrow('ArrowRight'); // A1.2, in time
    const before = savedProgress();

    await act(async () => {
      fireEvent.click(button('Play Now'));
      await settle();
    });
    expect(barState()).toBe('performance');
    expect(handle.setEvaluationMode).toHaveBeenLastCalledWith('notes');

    fireEvent.click(button('Stop'));
    expect(barState()).toBe('preview');
    expect(handle.setEvaluationMode).toHaveBeenLastCalledWith('off');
    // The take's timer is gone with it: nothing is scored later.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(barState()).toBe('preview');
    expect(screen.queryByRole('heading', { name: /%/ })).toBeNull();
    expect(savedProgress()).toBe(before);
  });

  it('a wait-for-me take that hears nothing offers the setup and the self-count in the bar', async () => {
    const handle = fakeGuitarHandle('idle');
    input.stable.guitar = handle;
    renderLesson(guitarC());
    await act(async () => {
      fireEvent.click(button('Play Now'));
    });
    expect(barState()).toBe('performance');
    expect(screen.queryByText('Not hearing your guitar?')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    const bar = screen.getByRole('region', { name: 'Lesson controls' });
    expect(within(bar).getByText('Not hearing your guitar?')).toBeTruthy();
    expect(
      within(bar).getByRole('button', { name: 'Check the setup' }),
    ).toBeTruthy();
    fireEvent.click(
      within(bar).getByRole('button', { name: 'Count it myself' }),
    );
    expect(barState()).toBe('result');
    expect(
      screen.getByRole('heading', { name: '✓ Counted by you' }),
    ).toBeTruthy();
  });

  it('Demo plays the step, Stop demo stops it, and moving on stops it too', () => {
    const view = renderLesson(guitarC());
    fireEvent.click(button('Demo'));
    expect(demo.playDemo).toHaveBeenCalledTimes(1);
    expect(demo.playDemo.mock.calls[0][0]).toHaveLength(8);

    demo.playing = true;
    view.rerender(lesson(guitarC()));
    fireEvent.click(button('Stop demo'));
    expect(demo.stopDemo).toHaveBeenCalledTimes(1);

    arrow('ArrowRight');
    expect(demo.stopDemo).toHaveBeenCalledTimes(2);
  });

  it('tapping a bar mid-practice loops it, even when the guide stops badly', async () => {
    renderLesson(guitarC());
    arrow('ArrowRight'); // A1.2, in time
    await act(async () => {
      fireEvent.click(button('Practice'));
      await settle();
    });
    expect(barState()).toBe('practice');
    // Tone rejects the guide's stop (seen in the browser): the run still
    // restarts on the loop instead of taking the lesson down.
    tone.stopThrows = true;
    const before = roll.props.length;
    act(() => {
      fireEvent.click(within(stage()!).getByRole('button', { name: 'Bar 1' }));
    });
    await act(() => settle());
    expect(tone.stops).toBeGreaterThan(0);
    // Between the passes the TAB stays where the next count will be.
    expect(roll.props.length).toBeGreaterThan(before);
    for (const props of roll.props.slice(before)) {
      expect(props).toMatchObject({ tabOpensOnMusic: false });
    }
    expect(barState()).toBe('practice');
    expect(
      document.querySelector('[data-guitar-loop-status]')?.textContent,
    ).toMatch(/Loop bar 1 · pass 1/);
  });

  it('only in-time steps have a tempo', () => {
    renderLesson(guitarC());
    expect(screen.queryByRole('group', { name: 'Tempo' })).toBeNull();
    arrow('ArrowRight');
    const tempo = screen.getByRole('group', { name: 'Tempo' });
    const value = within(tempo).getByRole('spinbutton', { name: 'Tempo' });
    expect(value).toHaveAttribute('aria-valuenow', '60');
    fireEvent.click(within(tempo).getByRole('button', { name: 'Faster' }));
    expect(value).toHaveAttribute('aria-valuenow', '61');
  });

  it('Practice checks the guitar setup first, as Play Now does', async () => {
    // Real timers: the setup dialog is a lazy import.
    vi.useRealTimers();
    const handle = fakeGuitarHandle('needs-setup');
    input.stable.guitar = handle;
    renderLesson(guitarC());
    fireEvent.click(button('Practice'));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(barState()).toBe('preview');
    expect(handle.enable).not.toHaveBeenCalled();
    expect(handle.setEvaluationMode).not.toHaveBeenCalledWith('notes');
  });

  it('only a Music Map turns Practice into a menu of loops', () => {
    const chords = guitarC().sections.find((s) => s.id === 'B')!.steps;
    // B2.2 has four bars, so the practice tools have loops for it too.
    const wholeNotes = chords.findIndex((s) => s.activity.startsWith('B2.2'));
    renderLesson(guitarC(), 'B');
    for (let i = 0; i < wholeNotes; i++) arrow('ArrowRight');
    expect(
      screen.getByRole('heading', { level: 1, name: /^Play Chords 1,2,3,4/ }),
    ).toHaveAttribute('title', expect.stringMatching(/^B2\.2:/));
    expect(button('Practice')).not.toHaveAttribute('aria-haspopup');
  });

  it('a Music Map offers its loops from the Practice menu', async () => {
    renderLesson(guitarC(), 'D');
    // Plain steps: Practice is a button.
    expect(button('Practice')).not.toHaveAttribute('aria-haspopup');
    const mapIndex = guitarC()
      .sections.find((s) => s.id === 'D')!
      .steps.findIndex((s) => s.guitar?.musicMap);
    for (let i = 0; i < mapIndex; i++) arrow('ArrowRight');
    const trigger = button('Practice');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('Whole step');
    expect(items.length).toBeGreaterThan(1);
    await act(async () => {
      fireEvent.click(items[1]);
      await settle();
    });
    await act(() => settle());
    expect(barState()).toBe('practice');
    expect(
      document.querySelector('[data-guitar-loop-status]')?.textContent,
    ).toMatch(/Loop/);
  });
});

// ── The TAB and its marks ────────────────────────────────────────────────

describe('the TAB', () => {
  it('is one DOM node from the preview to the result and back', async () => {
    renderLesson(guitarC());
    const box = stage();
    expect(box).not.toBeNull();
    await playTheScale();
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
    expect(stage()).toBe(box);
    expect(box!.isConnected).toBe(true);
    expect(within(box!).getByTestId('tab')).toBeTruthy();
    fireEvent.click(button('Try Again'));
    expect(stage()).toBe(box);
  });

  it("a Music Map's pattern chips give way to a take's marks", async () => {
    renderLesson(guitarC(), 'D');
    const mapIndex = guitarC()
      .sections.find((s) => s.id === 'D')!
      .steps.findIndex((s) => s.guitar?.musicMap);
    for (let i = 0; i < mapIndex; i++) arrow('ArrowRight');
    const chips = () => stage()!.querySelector('[data-music-map-overlay]');
    expect(chips()).not.toBeNull();
    await missATake();
    expect(barState()).toBe('result');
    // The marks sit where the chips do: the chips step aside.
    expect(
      within(stage()!).getByRole('group', { name: 'Mistakes' }),
    ).toBeTruthy();
    expect(chips()).toBeNull();
    fireEvent.click(button('Try Again'));
    expect(chips()).not.toBeNull();
  });

  it("marks a take's mistakes at once; a mark loops its bar", async () => {
    renderLesson(guitarC());
    arrow('ArrowRight'); // A1.2, in time
    expect(within(stage()!).queryByRole('group', { name: 'Mistakes' })).toBe(
      null,
    );
    await missATake();
    expect(barState()).toBe('result');
    const marks = within(stage()!).getByRole('group', { name: 'Mistakes' });
    const first = within(marks).getByRole('button', {
      name: /^Missed at bar 1, beat 1\. Loop bar 1$/,
    });
    // Nothing to open to see them, and nothing hides the result.
    expect(screen.queryByRole('button', { name: 'Show mistakes' })).toBeNull();
    expect(screen.getByRole('heading', { name: /0%/ })).toBeTruthy();

    act(() => {
      fireEvent.click(first);
    });
    await act(() => settle());
    expect(barState()).toBe('practice');
    expect(
      document.querySelector('[data-guitar-loop-status]')?.textContent,
    ).toMatch(/Loop bar 1 · pass 1/);
    expect(button(/A bar either side/)).toHaveAttribute('aria-pressed', 'true');
  });
});

// ── Section complete ─────────────────────────────────────────────────────

describe('section complete', () => {
  /** Melody cut to its first step, so passing it finishes the section. */
  function oneStepMelody(): ActivityFlowV2 {
    const flow = guitarC();
    return {
      ...flow,
      sections: flow.sections.map((section) =>
        section.id === 'A'
          ? { ...section, steps: section.steps.slice(0, 1) }
          : section,
      ),
    };
  }

  async function finishMelody() {
    await playTheScale();
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
    fireEvent.click(button('Section Complete'));
  }

  it('offers the Practice Track, then Continue opens the next section', async () => {
    renderLesson(oneStepMelody());
    await finishMelody();
    expect(barState()).toBe('sectionComplete');
    // The offer takes the result's place (copy as before).
    expect(
      screen.getByRole('heading', { name: 'Melody complete!' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Take the groove into a Practice Track and improvise your own melodies over it — the scale lit up on the keyboard, and the take recorded if you want it.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /100%/ })).toBeNull();
    expect(button('Enter Practice Track')).toBeTruthy();
    expectNothingOpen();

    fireEvent.click(button('Continue to Chords'));
    expect(button(/^B Chords/)).toHaveAttribute('aria-current', 'true');
    expect(stepCount()).toMatch(/^Step 1 of 46/);
    expect(barState()).toBe('preview');
    expect(screen.queryByRole('heading', { name: 'Melody complete!' })).toBe(
      null,
    );
    expect(practiceTrack.openGenrePracticeTrack).not.toHaveBeenCalled();
  });

  it('Enter Practice Track opens the section’s track, as before', async () => {
    const flow = oneStepMelody();
    renderLesson(flow);
    await finishMelody();
    fireEvent.click(button('Enter Practice Track'));
    expect(practiceTrack.openGenrePracticeTrack).toHaveBeenCalledTimes(1);
    expect(practiceTrack.openGenrePracticeTrack.mock.calls[0][1]).toBe('A');
    expect(screen.queryByRole('heading', { name: 'Melody complete!' })).toBe(
      null,
    );
  });
});

// ── Arrow keys ───────────────────────────────────────────────────────────

describe('arrow keys', () => {
  it('move one step per press, from the preview only', async () => {
    renderLesson(guitarC());
    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 2 of/);
    arrow('ArrowLeft');
    expect(stepCount()).toMatch(/^Step 1 of/);

    arrow('ArrowRight'); // A1.2, in time
    await act(async () => {
      fireEvent.click(button('Play Now'));
      await settle();
    });
    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 2 of/);
    fireEvent.click(button('Stop'));
    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 3 of/);
  });

  it('stay out of the settings sheet and its controls', () => {
    renderLesson(guitarC());
    fireEvent.click(gear());
    const settings = screen.getByRole('dialog', { name: 'Lesson settings' });
    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 1 of/);
    const tab = within(settings).getByRole('radio', { name: 'Tablature' });
    act(() => tab.focus());
    arrow('ArrowRight', tab);
    expect(stepCount()).toMatch(/^Step 1 of/);
    fireEvent.click(gear());
    expect(screen.queryByRole('dialog')).toBeNull();
    arrow('ArrowRight');
    expect(stepCount()).toMatch(/^Step 2 of/);
  });

  it('stay out of About this step', () => {
    renderLesson(guitarC());
    fireEvent.click(aboutButton());
    const about = screen.getByRole('dialog', { name: /^About this step/ });
    arrow('ArrowRight');
    arrow('ArrowRight', about);
    // The modal sheet hides the lesson from the accessibility tree.
    fireEvent.click(within(about).getByRole('button', { name: 'Close' }));
    expect(stepCount()).toMatch(/^Step 1 of/);
  });

  it('stay out of the tempo field', () => {
    renderLesson(guitarC());
    arrow('ArrowRight'); // A1.2, in time
    const value = within(
      screen.getByRole('group', { name: 'Tempo' }),
    ).getByRole('spinbutton', { name: 'Tempo' });
    arrow('ArrowRight', value);
    expect(stepCount()).toMatch(/^Step 2 of/);
  });
});

// ── Settings wiring ──────────────────────────────────────────────────────

describe('settings', () => {
  it('Audio timing goes to the audio settings', () => {
    renderLesson(guitarC());
    fireEvent.click(gear());
    const settings = screen.getByRole('dialog', { name: 'Lesson settings' });
    fireEvent.click(
      within(settings).getByRole('button', { name: /^Audio timing/ }),
    );
    expect(navigate).toHaveBeenLastCalledWith(`${SettingsRoutes.root()}/audio`);
  });

  it('the crumbs go to Theory and the lesson overview', () => {
    const flow = guitarC();
    render(
      <MemoryRouter>
        <GenreLessonContainerV2
          flow={flow}
          genre={flow.genre}
          level={1}
          displayName="Guitar · Ionian (Major)"
          overviewRoute="/learn/guitar/ionian"
          rootCrumb={{ label: 'Theory', route: '/learn?tab=Theory' }}
        />
      </MemoryRouter>,
    );
    fireEvent.click(button('Theory'));
    expect(navigate).toHaveBeenLastCalledWith('/learn?tab=Theory');
    fireEvent.click(button('Guitar · Ionian (Major)'));
    expect(navigate).toHaveBeenLastCalledWith('/learn/guitar/ionian');
  });
});
