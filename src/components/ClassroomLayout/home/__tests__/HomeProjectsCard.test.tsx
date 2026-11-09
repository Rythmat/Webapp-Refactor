// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '@/hooks/data';
import { HomeProjectsCard } from '../HomeProjectsCard';

const list = vi.fn();
let session: ActivityItem | null = null;

vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'test-token',
}));
vi.mock('@/lib/studio-projects/projectsClient', () => ({
  studioProjectsApi: { list: (...args: unknown[]) => list(...args) },
}));
vi.mock('../useStudioSession', () => ({
  useStudioSession: () => session,
}));

const project = (id: string, name: string, updatedAt: string) => ({
  id,
  name,
  composerName: null,
  bpm: 120,
  createdAt: new Date(updatedAt),
  updatedAt: new Date(updatedAt),
});

const renderCard = () =>
  render(
    <MemoryRouter>
      <HomeProjectsCard />
    </MemoryRouter>,
  );

describe('HomeProjectsCard', () => {
  afterEach(cleanup);

  beforeEach(() => {
    list.mockReset();
    session = null;
  });

  it('lists the newest projects first, the device session among them, each opening the editor', async () => {
    list.mockResolvedValue([
      project('a', 'Older', '2026-10-01T00:00:00Z'),
      project('b', 'Newest', '2026-10-20T00:00:00Z'),
      project('c', '', '2026-10-10T00:00:00Z'),
    ]);
    session = {
      id: 'session:/studio?draft=d1',
      kind: 'project',
      category: 'Studio session',
      title: 'Unsaved jam',
      subtitle: 'On this device',
      route: '/studio?draft=d1',
      touchedAt: new Date('2026-10-15T00:00:00Z').getTime(),
    };
    renderCard();

    const card = screen.getByRole('region', { name: 'Projects' });
    await within(card).findByText('Newest');
    const links = within(card).getAllByRole('link');
    // View all opens every project in the editor's Projects dialog.
    expect(
      links.find((a) => a.textContent === 'View all')?.getAttribute('href'),
    ).toBe('/studio?projects=1');
    const rows = links
      .filter(
        (a) =>
          a.textContent !== 'View all' &&
          a.getAttribute('href')?.startsWith('/studio?'),
      )
      .map((a) => [a.textContent, a.getAttribute('href')]);
    expect(rows).toEqual([
      ['Newest120 BPM', '/studio?project=b'],
      ['Unsaved jamOn this device', '/studio?draft=d1'],
      ['Untitled Project120 BPM', '/studio?project=c'],
      ['Older120 BPM', '/studio?project=a'],
      ['Collaborate', '/studio?collab=new'],
    ]);
  });

  it('shows the empty state when there are no projects, and Collaborate still starts a session', async () => {
    list.mockResolvedValue([]);
    renderCard();

    expect(await screen.findByText(/No projects yet/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Collaborate' }).getAttribute('href'),
    ).toBe('/studio?collab=new');
  });
});
