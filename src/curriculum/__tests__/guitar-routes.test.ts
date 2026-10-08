// @vitest-environment jsdom
/**
 * Guitar's routes: Learn → Theory → the diatonic modes on guitar, their
 * premium gate (the Ionian overview and C Ionian free, as on piano), and the
 * old Technique-tab paths redirecting there; piano's Theory paths and gate
 * stay as they were. The pages and the
 * gate are markers here; what they render is tested beside them.
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement as h, Suspense, type ReactNode } from 'react';
import {
  MemoryRouter,
  matchRoutes,
  useLocation,
  useNavigationType,
  useRoutes,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurriculumRoutes, LearnRoutes } from '@/constants/routes';
import { curriculumPages } from '@/curriculum/routes';
import { learnPages } from '@/features/classroom/ClassroomPages';

vi.mock('@/components/ui/RequirePremium', async () => {
  const { createElement } = await import('react');
  return {
    RequirePremium: ({ children }: { children: ReactNode }) =>
      createElement('div', { 'data-testid': 'premium-gate' }, children),
  };
});
vi.mock('@/curriculum/pages/GuitarModeLesson', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'guitar lesson') };
});
vi.mock('@/components/learn/GuitarModeOverview', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'guitar overview') };
});
// Piano's pages, to check its gate is untouched.
vi.mock('@/components/Games/LessonContainer', async () => {
  const { createElement } = await import('react');
  return {
    LessonContainer: (props: { modeSlug: string; rootKey?: string }) =>
      createElement(
        'p',
        null,
        `piano lesson ${props.modeSlug} ${props.rootKey}`,
      ),
  };
});
vi.mock('@/components/learn/ModeOverview', async () => {
  const { createElement } = await import('react');
  return {
    ModeOverview: (props: { mode: string }) =>
      createElement('p', null, `piano overview ${props.mode}`),
  };
});

function matchedRoute(tree: RouteObject, pathname: string) {
  const matches = matchRoutes([tree], pathname);
  return matches?.[matches.length - 1]?.route;
}

const curriculumPath = (pathname: string) =>
  matchedRoute(curriculumPages(), pathname)?.path;
const learnPath = (pathname: string) =>
  matchedRoute(learnPages(), pathname)?.path;

function LocationProbe() {
  const { pathname, search } = useLocation();
  // 'REPLACE' after a redirect that leaves no history entry behind.
  const navigation = useNavigationType();
  return h(
    'output',
    { 'data-testid': 'location', 'data-navigation': navigation },
    `${pathname}${search}`,
  );
}

function Routed({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

/** Renders the route `url` matches in `tree` (no shell); anything else shows the location. */
function renderRoute(tree: RouteObject, url: string) {
  const route = matchedRoute(tree, url.split('?')[0]);
  if (!route) throw new Error(`No route for ${url}`);
  const routes: RouteObject[] = [
    { path: route.path, element: route.element },
    { path: '*', element: h(LocationProbe) },
  ];
  render(
    h(
      MemoryRouter,
      { initialEntries: [url] },
      h(Suspense, { fallback: null }, h(Routed, { routes })),
    ),
  );
}

const location = async () =>
  (await screen.findByTestId('location')).textContent;

/** How the probe was reached: redirects replace, so Back skips them. */
const navigationType = () =>
  screen.getByTestId('location').getAttribute('data-navigation');

afterEach(cleanup);

describe('curriculum routes: legacy guitar paths', () => {
  it('keeps the old paths on their own (redirect) routes', () => {
    expect(
      curriculumPath('/curriculum/guitar/applied-theory-fundamentals'),
    ).toBe(CurriculumRoutes.guitarAppliedTheoryFundamentals.definition);
    expect(
      curriculumPath('/curriculum/guitar/applied-theory-fundamentals/fsharp'),
    ).toBe(CurriculumRoutes.guitarAppliedTheoryFundamentalsLesson.definition);
  });

  it('leaves the piano and genre routes where they were', () => {
    expect(curriculumPath('/curriculum/applied-theory-fundamentals')).toBe(
      CurriculumRoutes.appliedTheoryFundamentals.definition,
    );
    expect(curriculumPath('/curriculum/applied-theory-fundamentals/c')).toBe(
      CurriculumRoutes.appliedTheoryFundamentalsLesson.definition,
    );
    expect(curriculumPath('/curriculum/funk/1')).toBe(
      CurriculumRoutes.genreLevel.definition,
    );
    expect(curriculumPath('/curriculum/piano-fundamentals')).toBe(
      CurriculumRoutes.genre.definition,
    );
  });

  it('sends the old key picker to the guitar Ionian overview', async () => {
    renderRoute(
      curriculumPages(),
      '/curriculum/guitar/applied-theory-fundamentals',
    );
    expect(await location()).toBe('/learn/guitar/ionian');
    expect(navigationType()).toBe('REPLACE');
  });

  it("sends an old lesson link to its key's lesson, query and all", async () => {
    renderRoute(
      curriculumPages(),
      '/curriculum/guitar/applied-theory-fundamentals/fsharp?section=B',
    );
    expect(await location()).toBe('/learn/guitar/ionian/fsharp?section=B');
    expect(navigationType()).toBe('REPLACE');
  });
});

describe('learn routes: guitar', () => {
  it('sends the guitar paths to the guitar routes', () => {
    expect(learnPath('/learn/guitar')).toBe(LearnRoutes.guitar.definition);
    expect(learnPath('/learn/guitar/ionian')).toBe(
      LearnRoutes.guitarOverview.definition,
    );
    expect(learnPath('/learn/guitar/ionian/dflat')).toBe(
      LearnRoutes.guitarLesson.definition,
    );
  });

  it('leaves the piano Theory paths where they were', () => {
    expect(learnPath('/learn/ionian')).toBe(LearnRoutes.overview.definition);
    expect(learnPath('/learn/ionian/c')).toBe(LearnRoutes.lesson.definition);
    expect(learnPath('/learn/dorian/fsharp')).toBe(
      LearnRoutes.lesson.definition,
    );
    expect(learnPath('/learn/relative/c')).toBe(
      LearnRoutes.relativeOverview.definition,
    );
    expect(learnPath('/learn/parallel/c')).toBe(
      LearnRoutes.parallelOverview.definition,
    );
  });

  it('builds the guitar paths', () => {
    expect(LearnRoutes.guitarOverview({ mode: 'ionian' })).toBe(
      '/learn/guitar/ionian',
    );
    expect(
      LearnRoutes.guitarLesson(
        { mode: 'ionian', key: 'bflat' },
        { section: 'B' },
      ),
    ).toBe('/learn/guitar/ionian/bflat?section=B');
  });

  it('sends bare /learn/guitar to the Theory tab', async () => {
    renderRoute(learnPages(), '/learn/guitar');
    expect(await location()).toBe('/learn?tab=Theory');
    expect(navigationType()).toBe('REPLACE');
  });

  it('opens the guitar overview without a premium gate', async () => {
    renderRoute(learnPages(), '/learn/guitar/ionian');
    expect(await screen.findByText('guitar overview')).toBeInTheDocument();
    expect(screen.queryByTestId('premium-gate')).toBeNull();
  });

  it('keeps C free, as on piano', async () => {
    renderRoute(learnPages(), '/learn/guitar/ionian/c');
    expect(await screen.findByText('guitar lesson')).toBeInTheDocument();
    expect(screen.queryByTestId('premium-gate')).toBeNull();
  });

  it.each(['dflat', 'g', 'fsharp'])('gates %s behind Premium', async (key) => {
    renderRoute(learnPages(), `/learn/guitar/ionian/${key}`);
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText('guitar lesson')).toBeInTheDocument();
  });

  it.each([
    '/learn/guitar/dorian',
    '/learn/guitar/locrian',
    '/learn/guitar/dorian/c',
    '/learn/guitar/aeolian/a',
    '/learn/guitar/lydian/fsharp',
  ])('gates %s behind Premium, as on piano', async (url) => {
    renderRoute(learnPages(), url);
    const gate = await screen.findByTestId('premium-gate');
    expect(
      within(gate).getByText(
        url.split('/').length > 4 ? 'guitar lesson' : 'guitar overview',
      ),
    ).toBeInTheDocument();
  });

  it.each(['/learn/guitar/harmonicMinor', '/learn/guitar/dorian♭2/d'])(
    'sends %s, a mode with no guitar content, back to Theory, ungated',
    async (url) => {
      renderRoute(learnPages(), url);
      expect(await location()).toBe('/learn?tab=Theory');
      expect(navigationType()).toBe('REPLACE');
      expect(screen.queryByTestId('premium-gate')).toBeNull();
    },
  );
});

describe('learn routes: piano (unchanged)', () => {
  it.each([
    ['/learn/ionian', 'piano overview ionian'],
    ['/learn/ionian/c', 'piano lesson ionian c'],
  ])('keeps %s free', async (url, page) => {
    renderRoute(learnPages(), url);
    expect(await screen.findByText(page)).toBeInTheDocument();
    expect(screen.queryByTestId('premium-gate')).toBeNull();
  });

  it.each([
    ['/learn/dorian', 'piano overview dorian'],
    ['/learn/ionian/d', 'piano lesson ionian d'],
    ['/learn/dorian/c', 'piano lesson dorian c'],
  ])('keeps %s behind Premium', async (url, page) => {
    renderRoute(learnPages(), url);
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText(page)).toBeInTheDocument();
  });
});
