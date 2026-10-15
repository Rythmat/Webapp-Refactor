// @vitest-environment jsdom
/**
 * The lesson container's header and Practice Track hand-off, as the guitar
 * Ionian (Major) lesson sets them (rootCrumb, practiceReturnTo) and as every
 * other lesson leaves them: Courses, the flow's level slug and the genre
 * level route must not change for piano. Guitar's header is its own layout's
 * breadcrumb trail (guitar/layout/GuitarLessonHeader).
 *
 * Audio, the transport and the input provider are faked, as in
 * GenreLessonContainerV2.instruments.test.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import {
  buildGuitarAppliedTheoryFundamentalsFlow,
  buildGuitarModeFlow,
} from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import type { ActivitySectionId } from '@/curriculum/types/activity';

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

const input = vi.hoisted(() => ({
  stable: {
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    subscribeChord: () => () => {},
    start: async () => {},
    stop: () => {},
    guitar: null,
    instrument: 'piano',
  },
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));

vi.mock('tone', () => ({
  getTransport: () => ({
    state: 'stopped',
    position: 0,
    PPQ: 192,
    bpm: { value: 80 },
    start: () => {},
    stop: () => {},
    cancel: () => {},
    getTicksAtTime: () => 0,
  }),
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

/** The `returnTo` the last Practice Track was opened with. */
const practiceReturn = () =>
  (
    practiceTrack.openGenrePracticeTrack.mock.calls.at(-1)?.[2] as {
      returnTo: string;
    }
  ).returnTo;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe('GenreLessonContainerV2 header and Practice Track return', () => {
  it('piano: Courses, the level slug and the genre level route, as before', () => {
    const flow = buildAppliedTheoryFundamentalsFlow('C');
    render(
      <MemoryRouter>
        <GenreLessonContainerV2
          flow={flow}
          genre="applied-theory-fundamentals"
          level={1}
          displayName="Applied Theory Fundamentals"
          overviewRoute="/curriculum/applied-theory-fundamentals"
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/^applied-theory-fundamentals Level 1 · Step 1 of \d+$/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Courses' }));
    expect(navigate).toHaveBeenLastCalledWith('/learn');
    fireEvent.click(
      screen.getByRole('button', { name: 'Applied Theory Fundamentals' }),
    );
    expect(navigate).toHaveBeenLastCalledWith(
      '/curriculum/applied-theory-fundamentals',
    );

    fireEvent.click(screen.getByRole('button', { name: /Practice Track/ }));
    expect(practiceReturn()).toBe(
      '/curriculum/applied-theory-fundamentals/1?section=A',
    );
  });

  it('guitar: Theory, the key, and back to its own lesson section', () => {
    const flow = buildGuitarAppliedTheoryFundamentalsFlow('F#');
    const practiceReturnTo = (section: ActivitySectionId) =>
      `/learn/guitar/ionian/fsharp?section=${section}`;
    render(
      <MemoryRouter>
        <GenreLessonContainerV2
          flow={flow}
          genre={flow.genre}
          level={1}
          initialSection="B"
          displayName="Guitar · Ionian (Major)"
          overviewRoute="/learn/guitar/ionian"
          rootCrumb={{ label: 'Theory', route: '/learn?tab=Theory' }}
          practiceReturnTo={practiceReturnTo}
        />
      </MemoryRouter>,
    );
    // The trail names the key and the subsection; the pager, the step.
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail).toHaveTextContent(
      /Theory›Guitar · Ionian \(Major\)›F♯ major›B1 Arpeggiate Chords/,
    );
    expect(
      screen.getByRole('button', { name: /^Step 1 of \d+$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Level 1/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Courses' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Theory' }));
    expect(navigate).toHaveBeenLastCalledWith('/learn?tab=Theory');
    fireEvent.click(
      screen.getByRole('button', { name: 'Guitar · Ionian (Major)' }),
    );
    expect(navigate).toHaveBeenLastCalledWith('/learn/guitar/ionian');

    fireEvent.click(screen.getByRole('button', { name: /Practice Track/ }));
    expect(practiceReturn()).toBe('/learn/guitar/ionian/fsharp?section=B');
  });
  it.each(['A', 'B', 'D'] as const)(
    'a mode: D♭ Locrian, section %s, named for its key and mode',
    (section) => {
      const flow = buildGuitarModeFlow('Db', 'locrian');
      render(
        <MemoryRouter>
          <GenreLessonContainerV2
            flow={flow}
            genre={flow.genre}
            level={1}
            initialSection={section}
            displayName="Guitar · Locrian"
            overviewRoute="/learn/guitar/locrian"
            rootCrumb={{ label: 'Theory', route: '/learn?tab=Theory' }}
          />
        </MemoryRouter>,
      );
      const first = flow.sections.find((s) => s.id === section)!.steps[0];
      const subsection = first.subsection.replace(':', '');
      const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(trail).toHaveTextContent(
        `Theory›Guitar · Locrian›D♭ Locrian›${subsection}`,
      );
    },
  );
});
