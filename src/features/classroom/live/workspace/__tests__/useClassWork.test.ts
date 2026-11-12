// What a student made this class: only what was touched since the lesson
// began, newest first, once each.
import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/features/library/libraryItems';
import type { ActivityItem } from '@/hooks/data/useRecentActivity';
import { classWorkSince } from '../useClassWork';

const START = Date.parse('2026-11-11T10:00:00Z');

const session = (name: string, at: number, draft = false): LibraryItem =>
  ({
    key: name,
    source: draft
      ? { kind: 'draft', draftId: `d-${name}` }
      : { kind: 'cloud', projectId: `p-${name}` },
    name,
    updatedAt: at,
  }) as LibraryItem;

const activity = (id: string, title: string, at: number): ActivityItem => ({
  id,
  kind: 'song',
  category: '',
  title,
  subtitle: '',
  route: `/x/${id}`,
  touchedAt: at,
});

describe('classWorkSince', () => {
  it('keeps this class’s work across places, newest first', () => {
    const work = classWorkSince(
      {
        studio: [
          session('Old Beat', START - 60_000),
          session('Thriller Remix', START + 30 * 60_000),
          session('Draft', START + 10 * 60_000, true),
        ],
        lessons: [
          activity('lesson:pop-1', 'Pop — Level 1', START + 20 * 60_000),
        ],
        songs: [activity('song:thriller', 'Thriller', START + 5 * 60_000)],
      },
      START,
    );
    expect(work.map((w) => [w.place, w.name])).toEqual([
      ['studio', 'Thriller Remix'],
      ['learn', 'Pop — Level 1'],
      ['studio', 'Draft'],
      ['songs', 'Thriller'],
    ]);
    expect(work[0]).toMatchObject({
      projectId: 'p-Thriller Remix',
      deepLink: '/studio?project=p-Thriller%20Remix',
    });
    expect(work[2].deepLink).toBe('/studio?draft=d-Draft');
  });

  it('counts a song viewed and saved once, at its latest touch', () => {
    const work = classWorkSince(
      {
        studio: [],
        lessons: [],
        songs: [
          activity('song:bad', 'Bad', START + 60_000),
          activity('song:bad', 'Bad', START + 120_000),
        ],
      },
      START,
    );
    expect(work).toHaveLength(1);
    expect(work[0].touchedAt).toBe(START + 120_000);
  });
});
