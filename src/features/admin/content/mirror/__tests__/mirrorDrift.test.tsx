// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { isValidElement, type ReactNode } from 'react';
import {
  createMemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { curriculumPages } from '@/curriculum/routes';
import {
  gamesPages,
  globePages,
  learnPages,
  songsPages,
  studioPages,
} from '@/features/classroom/ClassroomPages';
import { searchPages } from '@/features/search/routes';
import { MirrorRouter } from '../MirrorRouter';
import { LearnIndexMirror, StudioIndexMirror } from '../MirrorRoutes';

/**
 * The mirror reuses the app's route factories, passing most pages through and
 * overriding the ones that are a student's own. A section's landing page is
 * where that goes wrong unnoticed: Learn's became a student's dashboard and
 * the Studio's the editor, and the console showed the old hub and a blank
 * project. This pins each landing page, so changing one fails here and asks
 * for a decision in MirrorRoutes.tsx.
 */

const nameOf = (element: ReactNode): string => {
  if (!isValidElement(element)) return String(element);
  const type = element.type as string | { displayName?: string; name?: string };
  return typeof type === 'string'
    ? type
    : (type.displayName ?? type.name ?? 'anonymous');
};

const landing = (
  factory: () => { path?: string; children?: RouteObject[] },
) => {
  const { path, children = [] } = factory();
  const index = children.find((child) => child.index);
  return [path, index ? nameOf(index.element) : null];
};

describe('the app sections the mirror reuses', () => {
  it('land where MirrorRoutes.tsx expects', () => {
    expect(
      Object.fromEntries(
        [
          learnPages,
          songsPages,
          curriculumPages,
          globePages,
          studioPages,
          gamesPages,
          searchPages,
        ].map(landing),
      ),
    ).toEqual({
      // Learn's shelves; old links go where the app sends them
      // (LearnIndexMirror).
      '/learn': 'LearnIndexRoute',
      '/songs': 'ContentGate',
      '/curriculum': null,
      '/globe': 'ContentGate',
      // The editor: the mirror opens Production (StudioIndexMirror).
      '/studio': 'EditorRouteBoundary',
      '/arcade': 'ArcadeInlet',
      '/search': 'ContentGate',
    });
  });
});

let router: ReturnType<typeof createMemoryRouter>;

const Where = () => {
  const { pathname, search } = useLocation();
  return <span data-testid="at">{`${pathname}${search}`}</span>;
};

const mount = (initial: string) => {
  router = createMemoryRouter(
    [
      {
        path: '/console/content/*',
        element: (
          <MirrorRouter>
            <Routes>
              <Route
                path="/learn"
                element={<LearnIndexMirror hub={<span data-testid="hub" />} />}
              />
              <Route
                path="/studio"
                element={
                  <StudioIndexMirror editor={<span data-testid="editor" />} />
                }
              />
              <Route path="*" element={<Where />} />
            </Routes>
          </MirrorRouter>
        ),
      },
    ],
    { initialEntries: [initial] },
  );
  render(<RouterProvider router={router} />);
};

const consolePath = () =>
  `${router.state.location.pathname}${router.state.location.search}`;

afterEach(cleanup);

describe('Learn in the mirror', () => {
  it('opens Learn’s shelves', () => {
    mount('/console/content/learn');
    expect(consolePath()).toBe('/console/content/learn');
    expect(screen.getByTestId('hub')).toBeInTheDocument();
  });

  it('sends an old ?tab= link where the app does', () => {
    mount('/console/content/learn?tab=Theory');
    expect(consolePath()).toBe('/console/content/learn/keyboard/theory');
  });

  it('sends an old one-page anchor to its section', () => {
    mount('/console/content/learn#guitar-theory');
    expect(consolePath()).toBe('/console/content/learn?i=guitar&c=theory');
  });
});

describe('the Studio in the mirror', () => {
  it('opens Production, not a blank project', () => {
    mount('/console/content/studio');
    expect(consolePath()).toBe('/console/content/studio/production');
    expect(screen.queryByTestId('editor')).toBeNull();
  });

  it('opens the editor to preview a lesson', () => {
    mount('/console/content/studio?tutorial=hiphop-build-the-beat');
    expect(screen.getByTestId('editor')).toBeTruthy();
    expect(consolePath()).toBe(
      '/console/content/studio?tutorial=hiphop-build-the-beat',
    );
  });
});
