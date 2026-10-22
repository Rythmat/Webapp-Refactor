// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * An Echo (class) slide on the session's surfaces: a student's device puts
 * Echo's play screen in place of the slide's canvas, and the projector puts
 * up the class's round from `state.echo`, counts only. A student's own
 * results, though they're in the session's responses, never reach the
 * projector (Rule 2).
 */

vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => ({
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    start: async () => {},
    stop: () => {},
  }),
}));
vi.mock('@/audio/pianoSampler', () => ({
  startPianoSampler: async () => {},
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));
vi.mock('@/curriculum/musicLiteracy/literacyRun', () => ({
  literacyClock: { soundingTicks: () => null, playbackTicks: () => null },
  startLiteracyRun: async () => true,
  addLiteracyRunCues: () => {},
  stopLiteracyRun: () => {},
}));

const { publishDay } = await import('../../publish/publishDay');
const { emptyInteraction } = await import('../../plan/InteractionEditor');
const { StudentSlideView } = await import('../../live/slides/StudentSlideView');
const { ProjectorDeckView } = await import(
  '../../live/slides/ProjectorDeckView'
);
const { DEFAULT_ECHO_CLASS_SETTINGS } = await import('../types');
type Day = import('../../types').Day;
type SessionState = import('../../live/sessionsStore').SessionState;

const emptyCell = () => ({
  presentation: { title: { en: '' }, prompt: { en: '' }, launchTiles: [] },
  rationale: {
    assessment: null,
    standards: [],
    commonAnchors: [],
    selCompetencies: [],
    impactTags: [],
    cloRefs: [],
    notes: '',
    scaffoldLaneIds: [],
    createdBy: null,
    localContext: null,
  },
});

const day: Day = {
  id: 'day-echo',
  label: 'Echo Day',
  cells: {
    connectRegulate: emptyCell(),
    groupPractice: {
      ...emptyCell(),
      presentation: {
        ...emptyCell().presentation,
        interactions: [{ ...emptyInteraction('echo'), id: 'ix-echo' }],
      },
    },
    creativeProjects: emptyCell(),
    presentPerform: emptyCell(),
    respondReflectReset: emptyCell(),
  },
  deck: {
    id: 'deck-echo',
    title: { en: 'Echo' },
    slides: [
      {
        id: 'slide-echo',
        kind: 'interaction',
        phase: 'groupPractice',
        title: { en: 'Echo Atlas!' },
        interactionIds: ['ix-echo'],
      },
    ],
  },
};
const snapshot = publishDay(day);

const state: SessionState = {
  sessionId: 'local-sess-echo',
  classroomId: 'c1',
  publishedDayId: 'pd1',
  teacherId: 't1',
  currentPhase: 'groupPractice',
  slideIndex: 0,
  mode: 'teacher_paced',
  locked: false,
  sharedInteractionIds: ['ix-echo'],
  echo: {
    slideId: 'slide-echo',
    run: 1,
    section: 'melodyEcho',
    leader: 'atlas',
    level: 1,
    key: { tonic: 'C', mode: 'major' },
    tempo: 80,
    startsAt: Date.now() - 60_000,
    call: null,
    paused: false,
    settings: DEFAULT_ECHO_CLASS_SETTINGS,
    classResult: { run: 1, good: 21, answered: 24, joined: 27 },
  },
  status: 'live',
  startedAt: '2026-10-21T10:00:00Z',
  updatedAt: '2026-10-21T10:00:00Z',
};

afterEach(cleanup);

describe('an Echo (class) slide', { timeout: 15_000 }, () => {
  it('gives a student Echo’s play screen in place of the slide', async () => {
    render(
      <StudentSlideView
        snapshot={snapshot}
        state={state}
        language="en"
        submissions={{}}
        onSubmit={() => () => {}}
        classroomId="c1"
        sessionId="local-sess-echo"
      />,
    );
    expect(
      // The lazy chunk loads the first time: give it a moment.
      await screen.findByRole(
        'region',
        { name: /Echo: Melody Echo/ },
        { timeout: 10_000 },
      ),
    ).toBeTruthy();
    expect(document.querySelector('[data-echo-slide]')).toBeTruthy();
    expect(document.querySelector('[data-echo-join-in]')).toBeTruthy();
  });

  it('puts the class’s round on the projector, and no student’s results', async () => {
    render(
      <ProjectorDeckView
        snapshot={snapshot}
        state={state}
        sessionId="local-sess-echo"
        responsesByEnrollment={{
          'enr-ana-perez': {
            'ix-echo': {
              kind: 'echo',
              slideId: 'slide-echo',
              rounds: [
                {
                  run: 1,
                  passed: true,
                  score: 100,
                  asked: ['1'],
                  played: ['1'],
                },
              ],
              bestStreak: 1,
            },
          },
        }}
      />,
    );
    await screen.findByText('21 of 24 echoed it!', {}, { timeout: 10_000 });
    const projector = document.querySelector('[data-echo-projector]')!;
    expect(projector).toBeTruthy();
    expect(projector.textContent).not.toMatch(/enr-|ana|perez/i);
  });
});
