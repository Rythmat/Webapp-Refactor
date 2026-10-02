// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentApiError } from '@/hooks/data/admin/useAdminContent';
import { AdminContentListPage } from '../../AdminContentListPage';
import { GraphModeBadge } from '../../graph/GraphModeBadge';
import { WorkingGraphNotice } from '../../graph/WorkingGraphNotice';
import { AdminLessonCoursePage } from '../../lessons/AdminLessonCoursePage';
import { GlobePlacementSection } from '../../publishing/GlobePlacementSection';
import {
  REPO_READ_ONLY_LABEL,
  repoNotServedNote,
  repoReadOnlyFile,
  repoStatusNote,
} from '../repoCopy';
import { isRepoAdminOnly } from '../useRepoMode';

/**
 * What repo mode says where it cannot do what the console offers against
 * the content API: someone who is not an admin is turned away (and told so,
 * not that the server is down), the artist locations are read-only, and
 * lessons and fundamentals are not served at all. Started as a dev server
 * with the repo switch on (`CONTENT_REPO`), as the owner runs it.
 */

const net = vi.hoisted(() => ({
  error: null as unknown,
  served: (kind: string) =>
    kind !== 'activity_flow' && kind !== 'fundamentals_flow',
}));

vi.mock('../../mock/mockSwitch', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  CONTENT_REPO: true,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'test', role: 'admin' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    store: net.error ? 'api' : 'repo',
    error: net.error,
    isError: !!net.error,
    capabilities: net.error ? null : { kinds: [] },
    isServed: net.served,
    feature: () => true,
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useContentItems: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useValidateContent: () => ({ data: undefined }),
  useDerivationHealth: () => ({
    isLoading: false,
    data: {
      defaultedToNewYork: 2,
      totalSongs: 640,
      unmatchedArtists: [{ artist: 'Somebody', songCount: 2 }],
    },
  }),
}));

const refusal = new ContentApiError(403, {
  error:
    'Repo mode is admin-only: a save here goes straight into the repo files. Proposals need the content API.',
  code: 'REPO_ADMIN_ONLY',
});

beforeEach(() => {
  net.error = null;
});
afterEach(cleanup);

const mount = (node: ReactNode, path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
    </QueryClientProvider>,
  );

describe('someone who is not an admin, in repo mode', () => {
  it('is told repo mode is for admins, not that the server did not answer', () => {
    expect(isRepoAdminOnly(refusal)).toBe(true);
    expect(isRepoAdminOnly(new Error('Repo mode is admin-only'))).toBe(false);
    for (const status of ['no-capabilities', 'failed'] as const) {
      mount(
        <WorkingGraphNotice status={status} error={refusal} subject="table" />,
      );
      expect(screen.getByText('Repo mode is for admins.')).toBeTruthy();
      expect(screen.queryByText(/did not answer/)).toBeNull();
      expect(screen.queryByText(/its terminal says why/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
      cleanup();
    }
  });

  it('still gets Try again when the server really did not answer', () => {
    mount(
      <WorkingGraphNotice
        status="no-capabilities"
        error={new Error('Failed to fetch')}
        subject="map"
      />,
    );
    expect(screen.getByText(/did not answer/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('sees a badge that says repo mode is for admins, not that saves land', () => {
    net.error = refusal;
    mount(<GraphModeBadge mode="repo" status="no-capabilities" />);
    const badge = screen.getByText('Repo mode: admins only');
    expect(badge.getAttribute('title')).toMatch(/only an admin can use it/);
    expect(screen.queryByText('Repo mode')).toBeNull();
  });
});

describe('the artist locations in repo mode', () => {
  it('are read-only: no New, and the list says where they live', () => {
    mount(
      <Routes>
        <Route
          path="/console/content/records/:kind"
          element={<AdminContentListPage />}
        />
      </Routes>,
      '/console/content/records/artist_location',
    );
    expect(
      screen.getByText(/Read-only in repo mode: src\/scripts\/artistLocations/),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /New artist location/ })).toBe(
      null,
    );
    expect(screen.queryByText(/save to the database/)).toBeNull();
  });

  it('are fixed in their file by hand, Publishing says', () => {
    mount(<GlobePlacementSection />);
    expect(
      screen.getByText(/Repo mode does not edit the locations/).textContent,
    ).toMatch(/src\/scripts\/artistLocations\.json by hand/);
    expect(screen.queryByText(/Add an artist location to fix/)).toBeNull();
  });

  it('are the one kind repo mode serves and never writes', () => {
    expect(repoReadOnlyFile('artist_location')).toBe(
      'src/scripts/artistLocations.json',
    );
    expect(repoReadOnlyFile('studio')).toBeNull();
    expect(REPO_READ_ONLY_LABEL).toMatch(/Read-only/);
    // A save of a kind students never read is not said to reach them.
    expect(repoStatusNote('studio')).not.toMatch(/students/);
  });
});

describe('lessons and fundamentals in repo mode', () => {
  it('say they are not served, not that the backend failed', () => {
    for (const kind of ['activity_flow', 'fundamentals_flow']) {
      mount(
        <Routes>
          <Route
            path="/console/content/records/:kind"
            element={<AdminContentListPage />}
          />
        </Routes>,
        `/console/content/records/${kind}`,
      );
      expect(screen.getByText(/are not in repo mode/)).toBeTruthy();
      expect(screen.queryByText(/backend\/connectivity/)).toBeNull();
      cleanup();
    }
  });

  it('do not offer to create a level on the course page', () => {
    mount(
      <Routes>
        <Route
          path="/console/lessons/:genre"
          element={<AdminLessonCoursePage />}
        />
      </Routes>,
      '/console/lessons/pop',
    );
    expect(screen.getByText(repoNotServedNote('Lessons'))).toBeTruthy();
    expect(screen.queryByText(/No lessons exist/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Create level/ })).toBeNull();
  });
});
