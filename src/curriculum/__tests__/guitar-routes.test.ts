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
import { ANATOMY_MOVES } from '@/curriculum/audio/anatomyMoves';
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
vi.mock('@/curriculum/anatomy/ComboAmpAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'combo amp anatomy') };
});
vi.mock('@/curriculum/anatomy/HeadphoneAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'headphone anatomy') };
});
vi.mock('@/curriculum/anatomy/MicrophoneAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'microphone anatomy') };
});
vi.mock('@/curriculum/anatomy/KeyboardAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'keyboard anatomy') };
});
vi.mock('@/curriculum/anatomy/SynthAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'synth anatomy') };
});
vi.mock('@/curriculum/anatomy/PianoAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'piano anatomy') };
});
vi.mock('@/curriculum/anatomy/UkuleleAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'ukulele anatomy') };
});
vi.mock('@/curriculum/anatomy/BassAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'bass anatomy') };
});
vi.mock('@/curriculum/anatomy/GuitarAnatomyPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'guitar anatomy') };
});
vi.mock('@/curriculum/guitar/harmonics/GuitarHarmonicsPage', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'guitar harmonics') };
});
vi.mock('@/components/learn/GuitarRelativeModesOverview', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('p', null, 'guitar relative modes') };
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

vi.mock('@/components/explore/ExplorePage', async () => {
  const { createElement } = await import('react');
  return {
    ExplorePage: () => createElement('p', null, 'explore'),
  };
});
vi.mock('@/components/learn/dashboard/LearnDashboard', async () => {
  const { createElement } = await import('react');
  return {
    LearnDashboard: () => createElement('p', null, 'learn dashboard'),
  };
});

vi.mock('@/components/learn/LearnPage', async () => {
  const { createElement } = await import('react');
  return {
    LearnPage: (props: { tab?: string }) =>
      createElement('p', null, `learn page ${props.tab ?? 'home'}`),
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

  it('leaves the piano routes where they were', () => {
    expect(curriculumPath('/curriculum/applied-theory-fundamentals')).toBe(
      CurriculumRoutes.appliedTheoryFundamentals.definition,
    );
    expect(curriculumPath('/curriculum/applied-theory-fundamentals/c')).toBe(
      CurriculumRoutes.appliedTheoryFundamentalsLesson.definition,
    );
    expect(curriculumPath('/curriculum/piano-fundamentals')).toBe(
      CurriculumRoutes.pianoFundamentals.definition,
    );
  });

  it('no longer serves the genre courses (owner, 2026-10-27)', () => {
    expect(curriculumPath('/curriculum/funk')).toBeUndefined();
    expect(curriculumPath('/curriculum/funk/1')).toBeUndefined();
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

  it('puts the keyboard Theory paths under /learn/keyboard', () => {
    expect(learnPath('/learn/keyboard/ionian')).toBe(
      LearnRoutes.keyboardOverview.definition,
    );
    expect(learnPath('/learn/keyboard/ionian/c')).toBe(
      LearnRoutes.keyboardLesson.definition,
    );
    expect(learnPath('/learn/keyboard/dorian/fsharp')).toBe(
      LearnRoutes.keyboardLesson.definition,
    );
    expect(learnPath('/learn/keyboard/relative/c')).toBe(
      LearnRoutes.relativeOverview.definition,
    );
    expect(learnPath('/learn/keyboard/parallel/c')).toBe(
      LearnRoutes.parallelOverview.definition,
    );
  });

  it('puts the genre courses under /learn/keyboard/genre', () => {
    expect(learnPath('/learn/keyboard/genre/african')).toBe(
      LearnRoutes.genreCourse.definition,
    );
    expect(learnPath('/learn/keyboard/genre/pop/2')).toBe(
      LearnRoutes.genreLesson.definition,
    );
    expect(learnPath('/learn/keyboard/genre')).not.toBe(
      LearnRoutes.genreCourse.definition,
    );
  });

  it('no longer serves the old /learn/:mode paths (owner, 2026-10-25)', () => {
    for (const old of [
      '/learn/ionian',
      '/learn/ionian/c',
      '/learn/relative/c',
      '/learn/parallel/c',
    ]) {
      expect(learnPath(old) ?? '').not.toMatch(/:mode|:key/);
    }
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

  it('sends bare /learn/guitar to its place in Explore', async () => {
    renderRoute(learnPages(), '/learn/guitar');
    expect(await location()).toBe('/learn?i=guitar');
  });

  it.each([
    '/learn/keyboard/theory/diatonic',
    '/learn/guitar/theory/harmonic-minor',
    '/learn/bass/theory/relative',
    '/learn/ukulele/theory/parallel',
  ])('opens %s as a path, not a lesson', (url) => {
    expect(learnPath(url)).toMatch(/\/theory\/:family$/);
  });

  it.each([
    ['/learn/guitar/songs', '/songs'],
    ['/learn/guitar/genre', '/learn?i=keyboard&c=genres'],
    ['/learn/guitar/theory', '/learn?i=guitar&c=theory'],
    ['/learn/guitar/technique', '/learn?i=guitar&c=technique'],
    ['/learn/keyboard/songs', '/songs'],
    ['/learn/keyboard/technique', '/learn?i=keyboard&c=technique'],
  ])('sends the old tab page %s on to %s', async (url, to) => {
    expect(learnPath(url)).toBe(url);
    renderRoute(learnPages(), url);
    expect(await location()).toBe(to);
  });

  it.each([
    ['piano', 'piano anatomy'],
    ['keyboard', 'keyboard anatomy'],
    ['synth', 'synth anatomy'],
    ['guitar', 'guitar anatomy'],
    ['bass', 'bass anatomy'],
    ['ukulele', 'ukulele anatomy'],
    ['microphone', 'microphone anatomy'],
    ['combo-amp', 'combo amp anatomy'],
    ['headphones', 'headphone anatomy'],
  ])('opens Audio → Anatomy → %s behind Premium', async (path, text) => {
    renderRoute(learnPages(), `/learn/audio/anatomy/${path}?tab=build`);
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText(text)).toBeInTheDocument();
  });

  it.each(ANATOMY_MOVES.map(({ from, to }) => [from, to()]))(
    'sends the old %s on to %s, its query kept',
    async (from, to) => {
      expect(learnPath(from)).toBe(from);
      renderRoute(learnPages(), `${from}?tab=build&part=frets`);
      expect(await location()).toBe(`${to}?tab=build&part=frets`);
    },
  );

  it('opens Technique → Guitar Harmonics, free, not as a guitar lesson', async () => {
    renderRoute(learnPages(), '/learn/guitar/technique/harmonics?tab=play');
    expect(await screen.findByText('guitar harmonics')).toBeInTheDocument();
    expect(screen.queryByTestId('premium-gate')).not.toBeInTheDocument();
    expect(screen.queryByText('guitar lesson')).not.toBeInTheDocument();
  });

  it('opens a Relative key’s guitar page behind Premium, not as a lesson', async () => {
    renderRoute(learnPages(), '/learn/guitar/relative/c');
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText('guitar relative modes')).toBeInTheDocument();
    expect(screen.queryByText('guitar lesson')).not.toBeInTheDocument();
  });

  it('forwards an old ?tab= link on an instrument page to its tab’s page', async () => {
    renderRoute(learnPages(), '/learn/guitar?tab=Songs&q=jolene');
    expect(await location()).toBe('/learn/guitar/songs?q=jolene');
    expect(navigationType()).toBe('REPLACE');
  });

  it.each([
    ['/learn/guitar/ionian', '/learn/guitar/theory/diatonic?select=ionian%3Ac'],
    ['/learn/guitar/dorian', '/learn/guitar/theory/diatonic?select=dorian'],
    [
      '/learn/guitar/minorblues',
      '/learn/guitar/theory/pentatonic-blues?select=minorblues',
    ],
  ])('sends the old mode page %s to its disc', async (url, to) => {
    renderRoute(learnPages(), url);
    expect(await location()).toBe(to);
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
    '/learn/guitar/dorian/c',
    '/learn/guitar/aeolian/a',
    '/learn/guitar/lydian/fsharp',
    // The rest of Theory, by its tiles' encoded slugs.
    '/learn/guitar/ionian%235/c',
    '/learn/guitar/locrian%F0%9D%84%AB3%F0%9D%84%AB7/d',
    '/learn/guitar/harmonicminor/c',
  ])('gates %s behind Premium, as on piano', async (url) => {
    renderRoute(learnPages(), url);
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText('guitar lesson')).toBeInTheDocument();
  });

  it.each(['/learn/guitar/harmonicMinor', '/learn/guitar/superlocrian/d'])(
    'sends %s, a mode with no guitar content, back to Theory, ungated',
    async (url) => {
      renderRoute(learnPages(), url);
      expect(await location()).toBe('/learn');
      expect(navigationType()).toBe('REPLACE');
      expect(screen.queryByTestId('premium-gate')).toBeNull();
    },
  );
});

describe('learn routes: keyboard', () => {
  it.each([
    [
      '/learn/keyboard/ionian',
      '/learn/keyboard/theory/diatonic?select=ionian%3Ac',
    ],
    ['/learn/keyboard/dorian', '/learn/keyboard/theory/diatonic?select=dorian'],
  ])('sends the old mode page %s to its disc', async (url, to) => {
    renderRoute(learnPages(), url);
    expect(await location()).toBe(to);
  });

  it.each([['/learn/keyboard/ionian/c', 'piano lesson ionian c']])(
    'keeps %s free',
    async (url, page) => {
      renderRoute(learnPages(), url);
      expect(await screen.findByText(page)).toBeInTheDocument();
      expect(screen.queryByTestId('premium-gate')).toBeNull();
    },
  );

  it.each([
    ['/learn/keyboard/ionian/d', 'piano lesson ionian d'],
    ['/learn/keyboard/dorian/c', 'piano lesson dorian c'],
  ])('keeps %s behind Premium', async (url, page) => {
    renderRoute(learnPages(), url);
    const gate = await screen.findByTestId('premium-gate');
    expect(within(gate).getByText(page)).toBeInTheDocument();
  });
});
