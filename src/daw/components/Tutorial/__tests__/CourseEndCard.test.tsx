// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportCompletion = vi.hoisted(() => vi.fn());
const openSession = vi.hoisted(() => vi.fn());

vi.mock('@/features/classroom/msp', async () => ({
  studioTutorialActivityRef: (
    await vi.importActual<typeof import('@/features/classroom/msp')>(
      '@/features/classroom/msp',
    )
  ).studioTutorialActivityRef,
  useMspModuleCompletion: () => ({ reportCompletion }),
}));
vi.mock('@/daw/session/openSession', () => ({ openSession }));

import { useStore } from '@/daw/store';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { TutorialLayer } from '../TutorialLayer';
import { TUTORIAL_COURSES } from '../tutorialCatalog';
import { getTutorial } from '../tutorials';

// ── A course lesson's end card ─────────────────────────────────────────────
// A Studio Production lesson ends on its end card: it's done, where it sits
// in the course, and the way on. "Next: <title>" opens the next lesson on a
// project of its own, as every lesson starts from a blank one (owner,
// 2026-11-09); the course's last lesson ends the course instead.

const s = () => useStore.getState();
const COURSE = TUTORIAL_COURSES[0];
const FIRST = COURSE.lessonIds[0];
const LAST = COURSE.lessonIds[COURSE.lessonIds.length - 1];
const card = () => screen.getByTestId('tutorial-coach-card');

/** Runs lesson `id` from its last step and finishes it. */
async function finish(id: string) {
  const last = getTutorial(id)!.steps.length - 1;
  act(() => s().resumeTutorial(id, last));
  act(() => s().completeTutorialStep(false));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  useTutorialProgressStore.setState({ completedAt: {} });
  act(() => s().quitTutorial());
});
afterEach(() => {
  act(() => s().quitTutorial());
  cleanup();
  reportCompletion.mockClear();
  openSession.mockClear();
  vi.useRealTimers();
});

describe('a course lesson’s end', () => {
  it('offers the next lesson, on a new project', async () => {
    render(<TutorialLayer />);
    await finish(FIRST);

    const end = screen.getByTestId('tutorial-end-card');
    expect(end).toHaveTextContent(COURSE.title);
    expect(end).toHaveTextContent(`Lesson 1 of ${COURSE.lessonIds.length}`);
    expect(end).toHaveTextContent(getTutorial(FIRST)!.title);
    expect(end).toHaveTextContent('Up next, on a new project');
    expect(s().activeTutorialId).toBeNull();
    expect(s().finishedTutorialId).toBe(FIRST);
    expect(useTutorialProgressStore.getState().completedAt[FIRST]).toEqual(
      expect.any(Number),
    );
    expect(reportCompletion).toHaveBeenCalledWith(undefined, {
      module: 'studio',
      activityRef: `studio:tutorial:${FIRST}`,
    });

    const next = getTutorial(COURSE.lessonIds[1])!;
    fireEvent.click(
      within(end).getByRole('button', { name: `Next: ${next.title}` }),
    );
    expect(openSession).toHaveBeenCalledWith(
      { kind: 'tutorial', tutorialId: next.id },
      { source: 'panel' },
    );
    expect(s().finishedTutorialId).toBeNull();
    expect(screen.queryByTestId('tutorial-end-card')).toBeNull();
  });

  it('finishes Studio Basics from its last card with Finish', () => {
    const last = getTutorial(FIRST)!.steps.length - 1;
    act(() => s().resumeTutorial(FIRST, last));
    render(<TutorialLayer />);
    fireEvent.click(within(card()).getByRole('button', { name: /Finish/ }));
    expect(screen.getByTestId('tutorial-end-card')).toBeInTheDocument();
  });

  it('ends the course on its last lesson: Back to the course or Done', async () => {
    render(<TutorialLayer />);
    await finish(LAST);
    const end = screen.getByTestId('tutorial-end-card');
    expect(end).toHaveTextContent('Course complete');
    expect(end).toHaveTextContent(
      `Lesson ${COURSE.lessonIds.length} of ${COURSE.lessonIds.length}`,
    );
    expect(within(end).queryByRole('button', { name: /Next:/ })).toBeNull();
    expect(
      within(end).getByRole('button', { name: 'Back to the course' }),
    ).toBeInTheDocument();
    fireEvent.click(within(end).getByRole('button', { name: 'Done' }));
    expect(s().finishedTutorialId).toBeNull();
    expect(screen.queryByTestId('tutorial-end-card')).toBeNull();
    expect(openSession).not.toHaveBeenCalled();
  });

  it('goes back to the course’s listing on the Production tab', async () => {
    function Where() {
      return <output aria-label="where">{useLocation().pathname}</output>;
    }
    render(
      <MemoryRouter initialEntries={['/studio']}>
        <Routes>
          <Route path="*" element={<TutorialLayer />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    );
    await finish(FIRST);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the course' }));
    expect(screen.getByLabelText('where')).toHaveTextContent(
      '/studio/production',
    );
    expect(s().finishedTutorialId).toBeNull();
  });
});
