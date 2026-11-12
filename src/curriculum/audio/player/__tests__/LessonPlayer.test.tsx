// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { audioModule } from '../../catalog';
import { doScreenFor, type LessonScript } from '../../lessons/types';
import { LessonPlayer, type StageProps } from '../LessonPlayer';

const stop = vi.fn();
const play = vi.fn();
vi.mock('../../mix/useMixEngine', () => ({
  useMixEngine: () => ({
    ready: true,
    playing: false,
    failed: false,
    needsTap: false,
    play,
    stop,
    apply: vi.fn(),
  }),
}));
const award = vi.fn(() =>
  Promise.resolve({ awarded: true, awardedExperience: 25 }),
);
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardLessonActivityExperience: () => ({ mutate: vi.fn() }),
  useAwardLessonCompletionExperience: () => ({ mutateAsync: award }),
}));
vi.mock('@/hooks/data/progress/useUpdateActivityProgress', () => ({
  useUpdateActivityProgress: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/data/useStreak', () => ({
  useStreak: () => ({ data: { activeToday: false, currentStreak: 0 } }),
}));
vi.mock('../../lab/LabControls', () => ({
  LabVolumeRow: () => null,
  TapToHear: () => null,
}));

interface Scene {
  n: number;
}
const doScreen = doScreenFor<Scene>();
const WHY = { title: 'Why it is', paragraphs: ['Because of this.'] };

const SCRIPT: LessonScript<Scene> = {
  id: 'test-lesson',
  needs: ['kick'],
  initial: { n: 0 },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'x',
    title: 'A question?',
    body: 'Hook',
  },
  screens: [
    doScreen<'low'>({
      id: 'act',
      view: 'x',
      body: 'Make it 5',
      right: 'Yes, five',
      feedback: { low: 'Too low' },
      evaluate: (s) =>
        s.n === 5 ? { ok: true } : { ok: false, mistake: 'low' },
      answer: { n: 5 },
      probes: [],
      why: WHY,
    }),
    {
      kind: 'choose',
      id: 'pick',
      view: 'x',
      body: 'Pick',
      question: 'Which?',
      correct: 'a',
      right: 'That one',
      choices: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B', feedback: 'Not B' },
      ],
      why: WHY,
    },
    {
      kind: 'ab',
      id: 'listen',
      view: 'x',
      body: 'Listen',
      question: 'Which?',
      a: { n: 10 },
      b: { n: 20 },
      correct: 'a',
      choiceA: 'this one',
      choiceB: 'this one',
      right: 'That side',
      wrong: 'Not that side',
      why: WHY,
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'end',
    view: 'x',
    body: 'So',
    points: ['One'],
    inSession: 'Do this',
    limits: 'Limits',
    next: 'Next',
  },
  practice: [
    {
      kind: 'choose',
      id: 'p1',
      view: 'x',
      body: 'P1',
      question: 'Q1',
      correct: 'a',
      right: 'R1',
      choices: [{ id: 'a', text: 'Right 1' }],
      why: WHY,
    },
    {
      kind: 'choose',
      id: 'p2',
      view: 'x',
      body: 'P2',
      question: 'Q2',
      correct: 'a',
      right: 'R2',
      choices: [{ id: 'a', text: 'Right 2' }],
      why: WHY,
    },
    {
      kind: 'choose',
      id: 'p3',
      view: 'x',
      body: 'P3',
      question: 'Q3',
      correct: 'a',
      right: 'R3',
      choices: [{ id: 'a', text: 'Right 3' }],
      why: WHY,
    },
  ],
};

function Stage({ scene, setScene }: StageProps<Scene>) {
  return (
    <button
      type="button"
      data-testid="value"
      onClick={() => setScene({ n: scene.n + 1 })}
    >
      {scene.n}
    </button>
  );
}

const open = (at = '/') =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <LessonPlayer
        script={SCRIPT}
        Stage={Stage}
        module={audioModule('sound-basics')!}
        lessonId="test-lesson"
        ratio={[2, 3]}
      />
    </MemoryRouter>,
  );

const press = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

const onScreen = () =>
  document.querySelector('[data-lesson-player]')?.getAttribute('data-screen');

const done = () => Object.keys(useTutorialProgressStore.getState().completedAt);

beforeEach(() => {
  useTutorialProgressStore.setState({ completedAt: {} });
  stop.mockClear();
  play.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the lesson player', () => {
  it('holds Check back until the student’s done something', () => {
    open('/?screen=act');
    const check = screen.getByRole('button', { name: 'Check' });
    expect((check as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('value'));
    expect((check as HTMLButtonElement).disabled).toBe(false);
  });

  it('answers a wrong try with its own message, keeping the attempt', () => {
    open('/?screen=act');
    fireEvent.click(screen.getByTestId('value'));
    press('Check');
    expect(screen.getByRole('status').textContent).toContain('Too low');
    press('Try again');
    expect(screen.getByTestId('value').textContent).toBe('1');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('plays their answer when they check it', () => {
    open('/?screen=act');
    fireEvent.click(screen.getByTestId('value'));
    press('Check');
    expect(play).toHaveBeenCalled();
  });

  it('sets the right answer on See answer', () => {
    open('/?screen=act');
    fireEvent.click(screen.getByTestId('value'));
    press('Check');
    press('See answer');
    expect(screen.getByTestId('value').textContent).toBe('5');
    expect(screen.getByRole('status').textContent).toContain('Yes, five');
    press('Why?');
    expect(screen.getByText('Because of this.')).toBeTruthy();
  });

  it('crosses off a wrong choice for the next try', () => {
    open('/?screen=pick');
    fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
    press('Check');
    expect(screen.getByRole('status').textContent).toContain('Not B');
    press('Try again');
    expect(
      (screen.getByRole('radio', { name: 'Option B' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('records each screen, then the finish, with the XP really awarded', async () => {
    vi.useFakeTimers();
    open();
    press('Continue');
    expect(done()).toContain('audio:sound-basics:test-lesson:hook');
    fireEvent.click(screen.getByTestId('value'));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByTestId('value'));
    press('Check');
    press('Continue');
    fireEvent.click(screen.getByRole('radio', { name: 'Option A' }));
    press('Check');
    press('Continue');
    expect(onScreen()).toBe('listen');
    fireEvent.click(screen.getByRole('radio', { name: 'A: this one' }));
    press('Check');
    // The sides are shuffled: wrong or right, this gets past it.
    if (screen.queryByRole('button', { name: 'See answer' })) {
      press('See answer');
    }
    press('Continue');
    expect(onScreen()).toBe('end');
    press('Continue');
    // The skill check's short pause.
    expect(document.querySelector('[data-skill-intro]')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    for (const label of ['Right 1', 'Right 2', 'Right 3']) {
      fireEvent.click(screen.getByRole('radio', { name: label }));
      press('Check');
      press('Continue');
    }
    expect(award).toHaveBeenCalledWith('audio:sound-basics:test-lesson');
    expect(done()).toContain('audio:sound-basics:test-lesson:done');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(
      document
        .querySelector('[data-finish-xp]')
        ?.getAttribute('data-finish-xp'),
    ).toBe('25');
    expect(document.querySelector('[data-finish-stats]')).toBeNull();
  });

  describe('a two-sided screen', () => {
    // On this roll of the shuffle, side A is the correct one.
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('moves to the right answer once it’s answered', () => {
      open('/?screen=listen');
      press('Hear B');
      expect(screen.getByTestId('value').textContent).toBe('20');
      fireEvent.click(screen.getByRole('radio', { name: 'A: this one' }));
      press('Check');
      expect(screen.getByTestId('value').textContent).toBe('10');
      expect(screen.getByRole('status').textContent).toContain('That side');
    });

    it('moves to it on See answer too', () => {
      open('/?screen=listen');
      press('Hear B');
      fireEvent.click(screen.getByRole('radio', { name: 'B: this one' }));
      press('Check');
      expect(screen.getByTestId('value').textContent).toBe('20');
      press('See answer');
      expect(screen.getByTestId('value').textContent).toBe('10');
    });
  });

  it('resumes at the first screen still to do', () => {
    useTutorialProgressStore.setState({
      completedAt: { 'audio:sound-basics:test-lesson:hook': 1 },
    });
    open();
    expect(onScreen()).toBe('act');
  });

  it('opens a finished lesson at the start, for going over it', () => {
    useTutorialProgressStore.setState({
      completedAt: { 'audio:sound-basics:test-lesson:done': 1 },
    });
    open();
    expect(onScreen()).toBe('hook');
  });
});
