// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DecisionsBanner } from '@/features/admin/table/DecisionsBanner';
import type { RepoStatus } from '@/hooks/data/admin/useRepoContent';
import { GraphModeBadge } from '../../graph/GraphModeBadge';
import { ChangesButton } from '../../publishing/ChangesButton';
import { PublishingLayout } from '../../publishing/PublishingLayout';
import { PublishingOverview } from '../../publishing/PublishingOverview';
import { RosterToggle } from '../RosterToggle';
import { deleteQuestion, repoStatusNote, statusChoices } from '../repoCopy';

/**
 * What the console shows in repo mode, where a save goes straight into the
 * repo's data files: the "Repo mode" badge, Publishing as "Commit and
 * deploy", the decisions banner with nothing to download, the status
 * control's words, and the globe roster toggle. Each against the content
 * API as well, where nothing changes.
 */

const net = vi.hoisted(() => ({
  store: 'repo' as 'repo' | 'api',
  status: null as unknown,
  roster: ['talking-heads'] as string[],
  posted: [] as unknown[],
  pendingAsked: [] as boolean[],
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'test', role: 'admin' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    store: net.store,
    feature: () => true,
    capabilities: {},
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  contentRequest: async (path: string, _token: string, init?: RequestInit) => {
    if (path === '/repo/status') return net.status;
    if (path === '/repo/roster' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {
        slug: string;
        on: boolean;
      };
      net.posted.push(body);
      net.roster = body.on
        ? [...net.roster, body.slug]
        : net.roster.filter((slug) => slug !== body.slug);
      return { ...body, changed: true, files: [] };
    }
    if (path === '/repo/roster') return { slugs: net.roster };
    throw new Error(`asked ${path}`);
  },
  // The edit bar's counts: two song files not committed, one proposal (which
  // repo mode never asks for).
  useContentOverview: () => ({
    data: [{ kind: 'song', changedSincePublish: 2 }],
  }),
  usePendingEdits: (enabled = true) => {
    net.pendingAsked.push(enabled);
    return { data: enabled ? [{ id: 'p1' }] : undefined };
  },
}));
// The popover's bulk-accept lines read the suggestions; not under test.
vi.mock('../../publishing/BulkUnreviewed', () => ({
  BulkUnreviewedLines: () => null,
}));
// It reads the API's derivation report, which is not what is under test.
vi.mock('../../publishing/GlobePlacementSection', () => ({
  GlobePlacementSection: () => null,
}));

const STATUS: RepoStatus = {
  root: '/repo',
  git: true,
  branch: 'main',
  files: [
    {
      path: 'src/content/data/artists.json',
      code: ' M',
      change: 'modified',
      kinds: ['artist'],
    },
    {
      path: 'src/curriculum/data/songs/africa.ts',
      code: ' M',
      change: 'modified',
      kinds: ['song'],
    },
    {
      path: 'src/curriculum/data/songs/new_song.ts',
      code: '??',
      change: 'untracked',
      kinds: ['song'],
    },
    {
      path: 'src/scripts/enrichment/suggestions/decisions.json',
      code: ' M',
      change: 'modified',
      kinds: [],
    },
  ],
  byKind: { artist: 1, song: 2 },
  decisions: true,
  error: null,
  checkedAt: '2026-09-30T20:00:00.000Z',
};

beforeEach(() => {
  net.store = 'repo';
  net.status = STATUS;
  net.roster = ['talking-heads'];
  net.posted = [];
  net.pendingAsked = [];
});

afterEach(cleanup);

const mount = (node: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/console/content/publishing']}>
        {node}
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('the graph pages’ badge', () => {
  it('says repo mode, and what the working copy is there', () => {
    mount(<GraphModeBadge mode="working" status="working" />);
    expect(screen.getByText('Repo mode').getAttribute('title')).toMatch(
      /Git is the review/,
    );
    expect(screen.getByText('Working copy').getAttribute('title')).toMatch(
      /data files on this machine/,
    );
  });

  it('says nothing of it against the content API', () => {
    net.store = 'api';
    mount(<GraphModeBadge mode="working" status="working" />);
    expect(screen.queryByText('Repo mode')).toBeNull();
  });
});

describe('Publishing in repo mode', () => {
  it('is "Commit and deploy" alone', () => {
    mount(<PublishingLayout />);
    expect(
      screen.getByRole('link', { name: 'Commit and deploy' }),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Publish history' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Import from repo' })).toBeNull();
    expect(screen.getByText(/Git is the review/)).toBeTruthy();
  });

  it('keeps its tabs against the content API', () => {
    net.store = 'api';
    mount(<PublishingLayout />);
    expect(screen.getByRole('link', { name: 'Review & publish' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Publish history' })).toBeTruthy();
  });

  /** Publishing's routes as AdminPages.tsx nests them, opened at `path`. */
  const openPublishingAt = (path: string) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/console/content/publishing"
              element={<PublishingLayout />}
            >
              <Route index element={<p>the overview</p>} />
              <Route path="history" element={<p>the history</p>} />
              <Route path="import" element={<p>the song import</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('sends a bookmark of a tab it does not have to Commit and deploy', () => {
    openPublishingAt('/console/content/publishing/import');
    expect(screen.getByText('the overview')).toBeTruthy();
    expect(screen.queryByText('the song import')).toBeNull();
    cleanup();
    openPublishingAt('/console/content/publishing/history');
    expect(screen.getByText('the overview')).toBeTruthy();
  });

  it('opens the song import against the content API', () => {
    net.store = 'api';
    openPublishingAt('/console/content/publishing/import');
    expect(screen.getByText('the song import')).toBeTruthy();
  });

  it('lists what git has not committed, by what each file holds, and how to review it', async () => {
    mount(<PublishingOverview />);
    expect(await screen.findByText('Commit and deploy')).toBeTruthy();
    expect(screen.queryByText(/Awaiting review/)).toBeNull();
    expect(
      await screen.findByText(/4 data files changed and not committed/),
    ).toBeTruthy();
    expect(screen.getByText('Artists')).toBeTruthy();
    expect(screen.getByText('Songs')).toBeTruthy();
    expect(screen.getByText('Suggestion decisions')).toBeTruthy();
    expect(
      screen.getByText('src/curriculum/data/songs/new_song.ts'),
    ).toBeTruthy();
    // Against HEAD, so a staged file shows as well.
    const diff = screen.getByText(/^git diff HEAD -- /).textContent ?? '';
    expect(diff).toContain('src/content/data/artists.json');
    expect(diff).not.toContain('new_song.ts');
    expect(screen.getByText(/1 new file git does not track yet/)).toBeTruthy();
  });

  it('says when there is nothing to commit, and when git did not answer', async () => {
    net.status = { ...STATUS, files: [], byKind: {}, decisions: false };
    const { unmount } = mount(<PublishingOverview />);
    expect(
      await screen.findByText(/Nothing to commit: the data files match/),
    ).toBeTruthy();
    unmount();
    net.status = {
      ...STATUS,
      git: false,
      branch: null,
      files: [],
      error: 'not a git repository',
    };
    mount(<PublishingOverview />);
    expect(await screen.findByText('Git did not answer')).toBeTruthy();
    expect(screen.getByText(/not a git repository/)).toBeTruthy();
  });
});

describe('the edit bar’s Changes in repo mode', () => {
  it('counts what git has not committed, asks for no proposals, and offers no publish', async () => {
    mount(<ChangesButton section="learn" />);
    fireEvent.click(screen.getByRole('button', { name: /Changes \(2\)/ }));
    expect(await screen.findByText('Not yet committed')).toBeTruthy();
    expect(
      screen.getByText('2 data files changed and not committed.'),
    ).toBeTruthy();
    expect(screen.queryByText('Awaiting review')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Publish/ })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Open Commit and deploy' }),
    ).toBeTruthy();
    expect(net.pendingAsked.every((asked) => asked === false)).toBe(true);
  });

  it('counts proposals and what is unpublished against the content API', async () => {
    net.store = 'api';
    mount(<ChangesButton section={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Changes \(3\)/ }));
    expect(await screen.findByText('Awaiting review')).toBeTruthy();
    expect(screen.getByText('Not yet published')).toBeTruthy();
  });
});

describe('the decisions banner in repo mode', () => {
  it('offers no download: the file is written with each decision', () => {
    mount(
      <DecisionsBanner
        counts={{ total: 2, notDownloaded: 2, proposed: 0 }}
        replay={null}
      />,
    );
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
    expect(
      screen.getByText(/2 decisions not written to decisions\.json yet/),
    ).toBeTruthy();
  });
});

describe('the globe roster toggle', () => {
  it('shows where the artist is, and moves it at once', async () => {
    mount(<RosterToggle slug="talking-heads" />);
    const box = await screen.findByRole('checkbox', {
      name: /On the globe’s artist list/,
    });
    await waitFor(() => expect((box as HTMLInputElement).checked).toBe(true));
    fireEvent.click(box);
    await waitFor(() =>
      expect(net.posted).toEqual([{ slug: 'talking-heads', on: false }]),
    );
    await waitFor(() => expect((box as HTMLInputElement).checked).toBe(false));
  });

  it('is not there against the content API, or with no artist', () => {
    net.store = 'api';
    const { container } = mount(<RosterToggle slug="talking-heads" />);
    expect(container.textContent).toBe('');
    net.store = 'repo';
    const none = mount(<RosterToggle slug={undefined} />);
    expect(none.container.textContent).toBe('');
  });
});

describe('the status control’s words', () => {
  it('offers a song draft or published in repo mode, and nothing else a choice', () => {
    expect(statusChoices('song', true)?.map((choice) => choice.value)).toEqual([
      'draft',
      'published',
    ]);
    expect(statusChoices('artist', true)).toBeNull();
    expect(
      statusChoices('artist', false)?.map((choice) => choice.value),
    ).toEqual(['draft', 'published', 'archived']);
    expect(repoStatusNote('song')).toMatch(/bundled\.ts/);
    expect(repoStatusNote('studio')).toMatch(/no drafts/);
    expect(deleteQuestion('Africa', true)).toMatch(
      /taken out of its repo file/,
    );
    expect(deleteQuestion('Africa', false)).toMatch(/next publish/);
  });
});
