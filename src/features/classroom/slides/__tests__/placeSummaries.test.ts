import { describe, expect, it } from 'vitest';
import {
  toProjectEntries,
  type LibraryItem,
} from '@/features/library/libraryItems';
import type { LibraryProject } from '@/features/library/libraryLocalMeta';
import type { ActivityItem } from '@/hooks/data/useRecentActivity';
import {
  arcadeSummary,
  globeSummary,
  learnSummary,
  librarySummary,
  songsSummary,
  studioSummary,
} from '../placeSummaries';

/** Where each person left off, per place (owner, 2026-11-12). */

const activity = (
  id: string,
  touchedAt: number,
  more: Partial<ActivityItem> = {},
): ActivityItem => ({
  id,
  kind: 'lesson',
  category: 'Lesson',
  title: id,
  subtitle: `${id} detail`,
  route: `/to/${id}`,
  touchedAt,
  ...more,
});

const session = (key: string, updatedAt: number): LibraryItem => ({
  key,
  source: { kind: 'draft', draftId: key },
  name: `Session ${key}`,
  composer: null,
  createdAt: 0,
  updatedAt,
  saved: false,
  editedOnDevice: false,
  bpm: null,
  trackCount: null,
  genre: null,
  status: null,
  version: 'v',
  canDelete: true,
  isOpen: false,
});

describe('a place’s summary', () => {
  it('is the newest lesson, with how far along it is', () => {
    expect(
      learnSummary([
        activity('old', 1),
        activity('pop-1', 5),
        activity('b', 3),
      ]),
    ).toEqual({ title: 'pop-1', detail: 'pop-1 detail', href: '/to/pop-1' });
    expect(learnSummary([])).toBeNull();
  });

  it('is the newest song, viewed or saved, with its artist', () => {
    expect(
      songsSummary(
        [activity('saved', 2)],
        [activity('viewed', 9, { subtitle: 'Prince' })],
      ),
    ).toEqual({ title: 'viewed', detail: 'Prince', href: '/to/viewed' });
  });

  it('is the newest project with its sessions, else the newest session', () => {
    const items = [session('a', 10), session('b', 20), session('c', 5)];
    const project: LibraryProject = {
      id: 'p1',
      name: 'Beat tape',
      createdAt: 0,
      updatedAt: 30,
      sessions: ['a', 'c'],
    } as LibraryProject;
    expect(librarySummary(toProjectEntries([project], items), items)).toEqual({
      title: 'Beat tape',
      detail: '2 sessions',
      href: '/library/projects/p1',
    });
    expect(librarySummary([], items)).toEqual({
      title: 'Session b',
      detail: 'Session',
      href: '/studio?draft=b',
    });
    expect(librarySummary([], [])).toBeNull();
  });

  it('is the Studio’s own session, else the newest in the Library', () => {
    expect(studioSummary(activity('jam', 1, { route: '/studio?x' }))).toEqual({
      title: 'jam',
      detail: 'Last session',
      href: '/studio?x',
    });
    expect(studioSummary(null, [session('a', 1), session('b', 2)])).toEqual({
      title: 'Session b',
      detail: 'Last session',
      href: '/studio?draft=b',
    });
    expect(studioSummary(null, [])).toBeNull();
  });

  it('is the Globe’s last stop, opening there', () => {
    expect(
      globeSummary({ search: '?event=e1', title: 'Soul Makossa', at: 1 }),
    ).toEqual({
      title: 'Soul Makossa',
      detail: 'Last visited',
      href: '/globe?event=e1',
    });
    expect(globeSummary(null)).toBeNull();
  });

  it('is the game last played, and how often', () => {
    expect(
      arcadeSummary({ chroma: 50, echo: 10 }, { chroma: 3, echo: 1 }),
    ).toEqual({
      title: 'Chroma',
      detail: 'Played 3 times',
      href: '/arcade/chroma',
    });
    expect(arcadeSummary({ echo: 1 }, { echo: 1 })?.detail).toBe(
      'Played 1 time',
    );
    expect(arcadeSummary({ 'no-such-game': 5 }, {})).toBeNull();
    expect(arcadeSummary({}, {})).toBeNull();
  });
});
