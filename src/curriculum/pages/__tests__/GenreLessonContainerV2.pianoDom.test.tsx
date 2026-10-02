// @vitest-environment jsdom
/**
 * Piano's lesson screen, pinned. The guitar lesson gets its own layout, and
 * none of that may reach piano: these file snapshots hold the piano
 * container's DOM in the states a student meets. They were written before the
 * guitar layout work began; never update them with `-u` as part of guitar
 * work — a diff here means piano changed.
 *
 * Audio, the transport and the input provider are faked as in the
 * instruments test; VexFlow never loads (jsdom has no layout).
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
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import { funkL1 } from '@/curriculum/data/activityFlows/funk_v2';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';

// ── Fakes (as in GenreLessonContainerV2.instruments.test.tsx) ─────────────

const input = vi.hoisted(() => {
  const on = new Set<(e: unknown) => void>();
  const off = new Set<(e: unknown) => void>();
  const sub =
    (set: Set<(e: unknown) => void>) => (cb: (e: unknown) => void) => {
      set.add(cb);
      return () => set.delete(cb);
    };
  return {
    on,
    off,
    stable: {
      subscribeNoteOn: sub(on),
      subscribeNoteOff: sub(off),
      subscribeChord: sub(new Set()),
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

const { GenreLessonContainerV2 } = await import(
  '@/curriculum/pages/GenreLessonContainerV2'
);

// ── Helpers ────────────────────────────────────────────────────────────────

const SNAP_DIR = './__snapshots__/pianoDom';

/** One tag per line, so a diff points at the element that changed. */
const html = (host: HTMLElement) => host.innerHTML.replace(/></g, '>\n<');

function renderLesson(flow: ActivityFlowV2, level = 1) {
  return render(
    <MemoryRouter>
      <GenreLessonContainerV2 flow={flow} genre={flow.genre} level={level} />
    </MemoryRouter>,
  );
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

describe('piano lesson DOM (pinned before the guitar layout)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    input.on.clear();
    input.off.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('Applied Theory C: preview, playing, result', async () => {
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-preview.html`,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
    });
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-performance.html`,
    );

    for (const midi of [60, 62, 64, 65, 67, 69, 71, 72]) {
      act(() => emitNote('on', midi));
      act(() => vi.advanceTimersByTime(500));
      act(() => emitNote('off', midi));
    }
    expect(screen.getByRole('heading', { name: /100%/ })).toBeTruthy();
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-result.html`,
    );
  });

  it('Applied Theory C: practice', async () => {
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Practice' }));
    });
    await act(() => settle());
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-practice.html`,
    );
  });

  it('Applied Theory C: Section B preview (the clef toggle)', async () => {
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    fireEvent.click(screen.getByRole('button', { name: /^B Chords/ }));
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-section-b.html`,
    );
  });

  it('Applied Theory C: the notation view', async () => {
    localStorage.setItem('musicAtlas:rollView:learn', 'notation');
    const { container } = renderLesson(buildAppliedTheoryFundamentalsFlow('C'));
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-notation.html`,
    );
  });

  it('Applied Theory C: an in-time step, its result and the section-complete offer', async () => {
    const flow = buildAppliedTheoryFundamentalsFlow('C');
    const { container } = renderLesson(flow);
    const last = flow.sections[0].steps.length - 1;
    for (let i = 0; i < last; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-in-time-preview.html`,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play Now' }));
      await settle();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-in-time-result.html`,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Section Complete' }));
    });
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/atf-section-complete.html`,
    );
  });

  it('a genre course (Funk L1): header, tabs and preview', async () => {
    const { container } = renderLesson(funkL1, 1);
    await expect(html(container)).toMatchFileSnapshot(
      `${SNAP_DIR}/funk-preview.html`,
    );
  });
});
