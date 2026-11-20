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

  it('carries the thing’s picture: its photo or tile, else its colour', () => {
    expect(
      learnSummary([
        activity('pop-1', 1, { image: '/pop.svg', accentColor: '#f00' }),
      ])?.art,
    ).toEqual({ kind: 'image', src: '/pop.svg', tint: '#f00' });
    expect(
      learnSummary([activity('audio', 1, { accentColor: '#0f0' })])?.art,
    ).toEqual({ kind: 'tint', color: '#0f0' });
    expect(
      songsSummary([], [activity('1999', 1, { thumbnail: '/prince.webp' })])
        ?.art,
    ).toEqual({ kind: 'image', src: '/prince.webp' });
    expect(learnSummary([activity('bare', 1)])).not.toHaveProperty('art');
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
      // The project's own cover, or its sessions' (ProjectMosaic).
      art: {
        kind: 'project',
        entry: expect.objectContaining({ name: 'Beat tape' }),
      },
    });
    expect(librarySummary([], items)).toEqual({
      title: 'Session b',
      detail: 'Session',
      href: '/studio?draft=b',
      art: { kind: 'cover', seed: 'draft:b' },
    });
    expect(librarySummary([], [])).toBeNull();
  });

  it('is the Studio’s own session, else the newest in the Library', () => {
    expect(studioSummary(activity('jam', 1, { route: '/studio?x' }))).toEqual({
      title: 'jam',
      detail: 'Last session',
      href: '/studio?x',
      art: { kind: 'cover', seed: 'jam' },
    });
    // The same cover the Library draws for that session.
    expect(
      studioSummary(activity('jam', 1, { route: '/studio?draft=d7' }))?.art,
    ).toEqual({ kind: 'cover', seed: 'draft:d7' });
    expect(
      studioSummary(activity('jam', 1, { route: '/studio?project=p9' }))?.art,
    ).toEqual({ kind: 'cover', seed: 'project:p9' });
    expect(studioSummary(null, [session('a', 1), session('b', 2)])).toEqual({
      title: 'Session b',
      detail: 'Last session',
      href: '/studio?draft=b',
      art: { kind: 'cover', seed: 'draft:b' },
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
    expect(
      globeSummary({
        search: '?event=e1',
        title: 'Soul Makossa',
        image: '/poster.jpg',
        at: 1,
      })?.art,
    ).toEqual({ kind: 'image', src: '/poster.jpg' });
    expect(globeSummary(null)).toBeNull();
  });

  it('is the game last played, and how often', () => {
    expect(
      arcadeSummary({ chroma: 50, echo: 10 }, { chroma: 3, echo: 1 }),
    ).toEqual({
      title: 'Chroma',
      detail: 'Played 3 times',
      href: '/arcade/chroma',
      art: { kind: 'game', game: expect.objectContaining({ title: 'Chroma' }) },
    });
    expect(arcadeSummary({ echo: 1 }, { echo: 1 })?.detail).toBe(
      'Played 1 time',
    );
    expect(arcadeSummary({ 'no-such-game': 5 }, {})).toBeNull();
    expect(arcadeSummary({}, {})).toBeNull();
  });
});
