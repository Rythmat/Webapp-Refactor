// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useEffect } from 'react';
import {
  createMemoryRouter,
  Link,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { MirrorRouter } from '../MirrorRouter';

/**
 * The mirror mounts app pages inside the console's data router. These pin the
 * react-router behaviour it depends on: app components see app paths, and
 * every way they navigate lands back under /console/content.
 */

let outerRouter: ReturnType<typeof createMemoryRouter>;

const Song = () => {
  const { songId } = useParams();
  const { pathname, key } = useLocation();
  return (
    <div>
      <span data-testid="song">{songId}</span>
      <span data-testid="inner-path">{pathname}</span>
      <span data-testid="inner-key">{key}</span>
      <Link to="/learn?tab=Theory">Theory</Link>
      <Link to="?tab=relative">Relative</Link>
    </div>
  );
};

const Learn = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="tab">{params.get('tab') ?? 'none'}</span>
      <button onClick={() => setParams({ tab: 'Songs' })}>Songs tab</button>
      <button onClick={() => navigate('/atlas/globe?artist=Toto')}>
        Globe
      </button>
      <button onClick={() => navigate(-1)}>Back</button>
    </div>
  );
};

const MirrorApp = () => (
  <MirrorRouter>
    <Routes>
      <Route path="/songs" element={<Navigate replace to="/learn" />} />
      <Route path="/songs/:songId" element={<Song />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/atlas/globe" element={<span data-testid="globe" />} />
      <Route path="*" element={<span data-testid="not-mirrored" />} />
    </Routes>
  </MirrorRouter>
);

const mount = (initial: string) => {
  outerRouter = createMemoryRouter(
    [
      { path: '/console/content/*', element: <MirrorApp /> },
      { path: '/console/users', element: <span data-testid="users" /> },
    ],
    { initialEntries: [initial] },
  );
  render(<RouterProvider router={outerRouter} />);
};

const outerPath = () =>
  `${outerRouter.state.location.pathname}${outerRouter.state.location.search}`;

afterEach(cleanup);

describe('MirrorRouter', () => {
  it('shows app pages their app path, not the console one', () => {
    mount('/console/content/songs/africa');
    expect(screen.getByTestId('song').textContent).toBe('africa');
    expect(screen.getByTestId('inner-path').textContent).toBe('/songs/africa');
  });

  it('keeps an absolute app link inside the console', () => {
    mount('/console/content/songs/africa');
    const link = screen.getByText('Theory');
    expect(link.getAttribute('href')).toBe('/console/content/learn?tab=Theory');
    fireEvent.click(link);
    expect(outerPath()).toBe('/console/content/learn?tab=Theory');
    expect(screen.getByTestId('tab').textContent).toBe('Theory');
  });

  it('resolves a relative link against the app path', () => {
    mount('/console/content/songs/africa');
    expect(screen.getByText('Relative').getAttribute('href')).toBe(
      '/console/content/songs/africa?tab=relative',
    );
  });

  it('keeps the prefix when a page sets its own search params', () => {
    mount('/console/content/learn');
    fireEvent.click(screen.getByText('Songs tab'));
    expect(outerPath()).toBe('/console/content/learn?tab=Songs');
    expect(screen.getByTestId('tab').textContent).toBe('Songs');
  });

  it('routes a programmatic navigate through the console', () => {
    mount('/console/content/learn');
    fireEvent.click(screen.getByText('Globe'));
    expect(outerPath()).toBe('/console/content/atlas/globe?artist=Toto');
    expect(screen.getByTestId('globe')).toBeTruthy();
  });

  it('follows an app redirect without leaving the console', () => {
    mount('/console/content/songs');
    expect(outerPath()).toBe('/console/content/learn');
  });

  it('goes back through the console history', async () => {
    mount('/console/content/learn');
    fireEvent.click(screen.getByText('Globe'));
    expect(outerPath()).toBe('/console/content/atlas/globe?artist=Toto');
    await act(async () => {
      await outerRouter.navigate(-1);
    });
    expect(outerPath()).toBe('/console/content/learn');
  });

  it('carries the console location key, as the atlas trail needs', () => {
    // A router's first entry is keyed 'default' everywhere; what matters is
    // that the app sees the console's key and a fresh one on every step.
    mount('/console/content/songs/africa');
    const innerKey = () => screen.getByTestId('inner-key').textContent;
    expect(innerKey()).toBe(outerRouter.state.location.key);
    const first = innerKey();
    act(() => {
      void outerRouter.navigate('/console/content/songs/dreams');
    });
    expect(innerKey()).toBe(outerRouter.state.location.key);
    expect(innerKey()).not.toBe(first);
  });

  it('shows unmirrored app paths inside the mirror', () => {
    mount('/console/content/settings');
    expect(screen.getByTestId('not-mirrored')).toBeTruthy();
  });

  it('does not disturb the console around it', () => {
    const Probe = () => {
      const navigate = useNavigate();
      useEffect(() => navigate('/console/users'), [navigate]);
      return null;
    };
    outerRouter = createMemoryRouter(
      [
        {
          path: '/console/content/*',
          element: (
            <>
              <Probe />
              <MirrorApp />
            </>
          ),
        },
        { path: '/console/users', element: <span data-testid="users" /> },
      ],
      { initialEntries: ['/console/content/learn'] },
    );
    render(<RouterProvider router={outerRouter} />);
    expect(outerRouter.state.location.pathname).toBe('/console/users');
  });
});
