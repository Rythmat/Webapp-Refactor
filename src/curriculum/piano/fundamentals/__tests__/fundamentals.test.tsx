// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurriculumRoutes } from '@/constants/routes';
import { lessonDoneId } from '@/curriculum/audio/lab/audioProgress';
import { lintLesson } from '@/curriculum/audio/lessons/lintLesson';
import { allScreens } from '@/curriculum/audio/lessons/types';
import { coursePercent } from '@/features/learn/paths/courseProgress';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { FundamentalsLessonPage } from '../LessonPage';
import {
  FUNDAMENTALS_COURSE,
  fundamentalsLesson,
  fundamentalsLessonKey,
  isFundamentalsLessonPath,
} from '../course';
import { fundamentalsCoursePath } from '../coursePath';
import MeetYourInstrumentLesson from '../lessons/meet-your-instrument';
import { MEET_SCRIPT } from '../lessons/meet-your-instrument/script';

vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardLessonActivityExperience: () => ({ mutate: vi.fn() }),
  useAwardLessonCompletionExperience: () => ({
    mutateAsync: () => Promise.resolve({ awarded: false }),
  }),
}));
vi.mock('@/hooks/data/progress/useUpdateActivityProgress', () => ({
  useUpdateActivityProgress: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/data/experience/useLearnXp', () => ({
  useLearnXp: () => vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@/hooks/data/useStreak', () => ({
  useStreak: () => ({ data: { activeToday: false, currentStreak: 0 } }),
}));
vi.mock('@/contexts/PianoContext', () => ({
  usePlayNote: () => vi.fn(),
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useLearnInputStable: () => ({
    subscribeNoteOn: () => () => {},
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));
// The keys, as buttons: a click is a played note.
vi.mock('@/learn/components/LessonKeyboard', () => ({
  LessonKeyboard: ({ onKeyClick }: { onKeyClick?: (midi: number) => void }) => (
    <div>
      {[48, 72].map((midi) => (
        <button key={midi} type="button" onClick={() => onKeyClick?.(midi)}>
          key {midi}
        </button>
      ))}
    </div>
  ),
}));

beforeEach(() => useTutorialProgressStore.setState({ completedAt: {} }));
afterEach(cleanup);

describe('Piano Fundamentals, the course', () => {
  it('keeps every written lesson to the house rules', () => {
    expect(lintLesson(MEET_SCRIPT)).toEqual([]);
  });

  it('tells the course how many screens each written lesson has', () => {
    expect(fundamentalsLesson(MEET_SCRIPT.id)?.screens).toBe(
      allScreens(MEET_SCRIPT).length,
    );
  });

  it('shows lessons not yet written as coming soon, and counts only the rest', () => {
    const path = fundamentalsCoursePath({});
    expect(path.rows.map((row) => row.id)).toEqual(
      FUNDAMENTALS_COURSE.lessons.map((lesson) => lesson.id),
    );
    const [first, ...rest] = path.rows;
    expect(first).toMatchObject({ soon: false, tracked: true, locked: false });
    expect(first.side?.route).toBe('/learn/audio/anatomy/piano');
    expect(rest.every((row) => row.soon && !row.tracked)).toBe(true);
    expect(path.stats).toEqual(['5 lessons', 'Free']);
  });

  it('keeps progress under piano:fundamentals, and the course reads it', () => {
    const key = fundamentalsLessonKey('meet-your-instrument');
    expect(key).toBe('piano:fundamentals:meet-your-instrument');
    const path = fundamentalsCoursePath({ [lessonDoneId(key)]: 1 });
    expect(path.rows[0].percent).toBe(100);
    // Four lessons still to come: the course isn't finished.
    expect(coursePercent(path)).toBe(20);
  });

  it('takes the whole window for a written lesson only', () => {
    expect(
      isFundamentalsLessonPath(
        '/curriculum/piano-fundamentals/meet-your-instrument',
      ),
    ).toBe(true);
    expect(
      isFundamentalsLessonPath('/curriculum/piano-fundamentals/note-names'),
    ).toBe(false);
    expect(isFundamentalsLessonPath('/curriculum/piano-fundamentals')).toBe(
      false,
    );
  });
});

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

const openLesson = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={CurriculumRoutes.fundamentalsLesson.definition}
          element={<FundamentalsLessonPage />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('the lesson page', () => {
  it('sends an old numbered section, or a lesson not yet written, to the course', () => {
    openLesson('/curriculum/piano-fundamentals/3');
    expect(screen.getByTestId('where').textContent).toBe(
      '/curriculum/piano-fundamentals',
    );
    cleanup();
    openLesson('/curriculum/piano-fundamentals/note-names');
    expect(screen.getByTestId('where').textContent).toBe(
      '/curriculum/piano-fundamentals',
    );
  });
});

const onScreen = () =>
  document.querySelector('[data-lesson-player]')?.getAttribute('data-screen');

const openMeet = (at: string) =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <MeetYourInstrumentLesson />
    </MemoryRouter>,
  );

describe('Meet your instrument', () => {
  it('opens on the grand piano, with no groove to play', () => {
    openMeet('/curriculum/piano-fundamentals/meet-your-instrument');
    expect(onScreen()).toBe('hook');
    expect(document.querySelector('[data-stage="anatomy"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Volume' })).toBeNull();
  });

  it('records a screen under the course’s own id', () => {
    openMeet('/curriculum/piano-fundamentals/meet-your-instrument');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onScreen()).toBe('what-sounds');
    expect(
      Object.keys(useTutorialProgressStore.getState().completedAt),
    ).toEqual(['piano:fundamentals:meet-your-instrument:hook']);
  });

  it('grades low then high on the keys', () => {
    openMeet(
      '/curriculum/piano-fundamentals/meet-your-instrument?screen=low-high',
    );
    expect(onScreen()).toBe('low-high');
    fireEvent.click(screen.getByRole('button', { name: 'key 72' }));
    fireEvent.click(screen.getByRole('button', { name: 'key 48' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(
      document
        .querySelector('[data-lesson-player]')
        ?.getAttribute('data-phase'),
    ).toBe('wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'key 72' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(
      document
        .querySelector('[data-lesson-player]')
        ?.getAttribute('data-phase'),
    ).toBe('right');
  });
});
