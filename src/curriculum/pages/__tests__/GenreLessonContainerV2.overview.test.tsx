// @vitest-environment jsdom
/**
 * A genre level in Theory's style (owner, 2026-10-27): it opens on its
 * Overview (About › Theory › Technique, once the course page's tabs) unless
 * the link names a section; a section pages its steps by a tab row of its
 * exercise groups, ending with its Practice Track; the rail lists every
 * section at once.
 *
 * Audio, the transport and the input provider are faked, as in
 * guitarModeContainer.test.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { funkL1 } from '@/curriculum/data/activityFlows/funk_v2';
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

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

/** A wide window: the lesson rail shows. */
function wide() {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: true,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderFunk(initialSection?: ActivitySectionId) {
  return render(
    <MemoryRouter>
      <GenreLessonContainerV2
        flow={funkL1}
        genre="funk"
        level={1}
        initialSection={initialSection}
      />
    </MemoryRouter>,
  );
}

const tabRow = (name: string) => screen.getByRole('group', { name });

describe('a genre level in Theory style', () => {
  it('opens on its Overview, About first, and starts Melody from the bar', () => {
    wide();
    renderFunk();

    const overview = tabRow('Overview');
    const about = within(overview).getByRole('button', { name: 'About' });
    expect(about).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('heading', { name: 'History' }),
    ).toBeInTheDocument();
    // No pager, no step roll under the Overview.
    expect(
      screen.queryByRole('button', { name: /^Step 1 of \d+$/ }),
    ).not.toBeInTheDocument();

    // The rail: the Overview, then every section, all open.
    const rail = screen.getByRole('complementary');
    for (const name of [
      'Overview',
      'Melody',
      'Chords',
      'Bass',
      'Performance',
    ]) {
      expect(within(rail).getAllByText(name).length).toBeGreaterThan(0);
    }

    fireEvent.click(
      within(overview).getByRole('button', { name: 'Technique' }),
    );
    expect(screen.getAllByRole('button', { name: /Jump In/ })).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Start Melody' }));
    expect(screen.queryByRole('group', { name: 'Overview' })).toBeNull();
    const melody = tabRow('Melody');
    expect(
      within(melody).getByRole('button', {
        name: '1. Scale (D Minor Pentatonic)',
      }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('a section named in the link opens it, tabbed by exercise group, its Practice Track last', () => {
    wide();
    renderFunk('B');

    expect(screen.queryByRole('group', { name: 'Overview' })).toBeNull();
    const chords = tabRow('Chords');
    const tabs = within(chords)
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('data-lesson-tab'));
    expect(tabs[0]).toHaveTextContent('1');
    expect(tabs.at(-1)).toHaveTextContent('Practice Track');

    fireEvent.click(tabs.at(-1)!);
    expect(practiceTrack.openGenrePracticeTrack).toHaveBeenCalled();
  });

  it('a step segment opens its step; the Overview comes back from the rail', () => {
    wide();
    renderFunk('A');

    const melody = tabRow('Melody');
    const segments = within(melody)
      .getAllByRole('button', {
        current: false,
      })
      .filter((b) => b.closest('[data-lesson-tab-steps]'));
    fireEvent.click(segments[0]);
    expect(
      within(tabRow('Melody'))
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'step'),
    ).toHaveLength(1);

    const rail = screen.getByRole('complementary');
    fireEvent.click(within(rail).getByRole('button', { name: /Theory/ }));
    expect(
      within(tabRow('Overview')).getByRole('button', { name: 'Theory' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('button', { name: /Play Scale/ }),
    ).toBeInTheDocument();
  });
});
