// @vitest-environment jsdom
/**
 * A genre course's page as a level picker (owner, 2026-10-27), as Theory's
 * mode page picks a key: Start opens the level's lesson on its Overview;
 * saved progress turns it into Continue at the first unfinished section; an
 * unbuilt level can't be started.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { funkL1 } from '@/curriculum/data/activityFlows/funk_v2';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

// Level 1 built; levels 2 and 3 still "Coming Soon".
vi.mock('@/curriculum/data/activityFlows', () => ({
  getActivityFlow: async (_genre: string, level: number) =>
    level === 1
      ? funkL1
      : {
          sections: [
            {
              id: 'A',
              steps: [{ subsection: 'Coming Soon', activity: 'Coming Soon' }],
            },
          ],
        },
}));

vi.mock('@/components/ClassroomLayout/home/HomeGlow', () => ({
  HomeGlow: () => null,
}));
vi.mock('@/components/ClassroomLayout/HeaderBar', () => ({
  HeaderBar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const { GenreCourseOverview } = await import(
  '@/curriculum/pages/GenreCourseOverview'
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

function renderPage(url = '/learn/keyboard/genre/funk') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <GenreCourseOverview genreSlug="funk" />
    </MemoryRouter>,
  );
}

describe('GenreCourseOverview', () => {
  it('starts level 1 on its Overview', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Funk' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Level 1/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /Start Funk · Level 1/ }),
    );
    expect(navigate).toHaveBeenCalledWith('/learn/keyboard/genre/funk/1');
  });

  it('continues a started level at its first unfinished section', () => {
    localStorage.setItem(
      'genre_progress_funk_1',
      JSON.stringify({
        genre: 'funk',
        level: 1,
        sections: {
          A: {
            completed: true,
            stepsCompleted: 3,
            stepsTotal: 3,
            bestScore: 1,
          },
          B: {
            completed: false,
            stepsCompleted: 0,
            stepsTotal: 9,
            bestScore: 0,
          },
          C: {
            completed: false,
            stepsCompleted: 0,
            stepsTotal: 9,
            bestScore: 0,
          },
          D: {
            completed: false,
            stepsCompleted: 0,
            stepsTotal: 9,
            bestScore: 0,
          },
        },
        completedSteps: {
          a1: { stepId: 'a1', score: { passed: true }, attempts: 1 },
        },
        xpTotal: 0,
        skillTags: [],
        lastKeyUsed: '',
        lastStyleRef: '',
      }),
    );
    renderPage();
    expect(screen.getByText('1 step passed')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Continue Funk · Level 1/ }),
    );
    expect(navigate).toHaveBeenCalledWith(
      '/learn/keyboard/genre/funk/1?section=B',
    );
  });

  it('an unbuilt level is coming soon and can’t be started', async () => {
    renderPage('/learn/keyboard/genre/funk?level=2');
    expect(screen.getByRole('radio', { name: /Level 2/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      await screen.findByRole('button', { name: /Level 2 is coming soon/ }),
    ).toBeDisabled();
  });
});
