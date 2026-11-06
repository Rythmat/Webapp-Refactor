// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import type { CortexRecords } from '@/features/cortex/ledger';
import { buildLearnCatalog } from '@/features/learn/catalog/learnCatalog';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import {
  bioGenreOf,
  genreSlugOf,
  normalizeLearnProfile,
} from '@/features/learn/profile/learnProfile';
import {
  arcadePick,
  recommend,
  REVISIT_AFTER_DAYS,
  songsFor,
  type RecommendInputs,
} from '../recommend';
import { dateKey, weekDates, weekStats } from '../weekStats';

// Wednesday 4 November 2026, noon local.
const NOW = new Date(2026, 10, 4, 12).getTime();
const MIN = NOW / 60_000;
const DAY_MIN = 24 * 60;

const topics = buildLearnCatalog({
  enabled: () => true,
  isPremium: true,
  lessons: [],
  completedAt: {},
  genreReady: genreReadinessFrom(
    new Set(['pop:1:A', 'pop:1:B', 'funk:1:A', 'hip-hop:1:A']),
  ),
});

const inputs = (over: Partial<RecommendInputs> = {}): RecommendInputs => ({
  topics,
  profile: {},
  fallbackTopic: 'piano',
  tasteGenres: [],
  records: {},
  nowMs: NOW,
  ...over,
});

const ids = (shelf: { courses: readonly { id: string }[] }) =>
  shelf.courses.map((c) => c.id);

describe('recommend', () => {
  it('starts a new student where their level and instrument say', () => {
    const recs = recommend(
      inputs({ profile: { instruments: ['guitar'], level: 'new' } }),
    );
    expect(recs.isNew).toBe(true);
    expect(recs.primary).toBe('guitar');
    expect(recs.lead).toMatchObject({
      kind: 'start',
      course: { id: 'guitar/theory/diatonic' },
    });
    const piano = recommend(inputs({ profile: { level: 'new' } }));
    expect(piano.lead?.course.id).toBe('piano/technique/Piano Fundamentals');
  });

  it('continues the course touched last', () => {
    const records: CortexRecords = {
      'theory:guitar.ionian.c': [MIN - 500, MIN - 400, 0],
      'lesson:pop-l1': [MIN - 90, MIN - 60, 0],
    };
    const recs = recommend(inputs({ records }));
    expect(recs.isNew).toBe(false);
    expect(recs.lead).toMatchObject({
      kind: 'continue',
      course: { id: 'piano/genre/pop' },
    });
    // The next row follows on from it, and never repeats the lead.
    const next = recs.shelves.find((s) => s.id === 'next');
    expect(next?.reason).toBe('Because you worked on Pop');
    expect(ids(next!)).not.toContain('piano/genre/pop');
  });

  it('never shows a course twice, nor a dismissed one', () => {
    const recs = recommend(
      inputs({
        profile: {
          instruments: ['piano', 'bass'],
          goals: ['theory', 'songs'],
          dismissed: ['piano/genre/funk'],
        },
        tasteGenres: ['funk', 'hip-hop'],
      }),
    );
    const all = recs.shelves.flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain('piano/genre/funk');
    expect(all).not.toContain(recs.lead?.course.id);
    expect(recs.shelves.length).toBeLessThanOrEqual(3);
    // One row is something new: their second instrument.
    expect(recs.shelves.at(-1)).toMatchObject({
      id: 'new',
      title: 'Try something new: Bass',
    });
    // Coming-soon courses are never suggested.
    expect(
      recs.shelves.flatMap((s) => s.courses).some((c) => c.comingSoon),
    ).toBe(false);
  });

  it('says why a taste row is there', () => {
    const recs = recommend(inputs({ tasteGenres: ['hip-hop', 'funk'] }));
    const taste = recs.shelves.find((s) => s.id === 'taste');
    expect(taste?.reason).toBe('Because you like Hip Hop and Funk');
    expect(taste?.seeAll).toBe('/learn?i=keyboard&c=genres');
  });

  it('brings back what was finished a week or more ago, oldest first', () => {
    const old = MIN - (REVISIT_AFTER_DAYS + 3) * DAY_MIN;
    const older = MIN - (REVISIT_AFTER_DAYS + 9) * DAY_MIN;
    const recs = recommend(
      inputs({
        records: {
          'theory:piano.ionian.c': [old, old, old],
          'lesson:pop-l1': [older, older, older],
          'game:chroma': [MIN - 60, MIN - 60, MIN - 60],
          'project:abc': [older, older, older],
          'theory:piano.dorian.d': [old, old, 0],
        },
      }),
    );
    expect(recs.revisit.map((r) => r.id)).toEqual([
      'lesson:pop-l1',
      'theory:piano.ionian.c',
    ]);
  });
});

describe('songs and a game', () => {
  const song = (
    id: string,
    genreTags: string[],
    difficulty: 1 | 2 | 3,
    popularity = 50,
  ) =>
    ({
      id,
      title: id,
      artist: 'A',
      genreTags,
      difficulty,
      popularity,
    }) as unknown as Song;

  it('prefers their styles at their level, skipping songs already opened', () => {
    const picks = songsFor(
      [
        song('rock-hard', ['rock'], 3, 99),
        song('funk-easy', ['funk'], 1, 10),
        song('funk-hard', ['funk'], 3, 90),
        song('seen', ['funk'], 1, 100),
      ],
      {
        tasteGenres: ['funk'],
        level: 'new',
        records: { 'song:seen': [1, 2, 0] },
      },
    );
    expect(picks.map((s) => s.id)).toEqual(['funk-easy', 'funk-hard']);
  });

  it('picks a free game they haven’t played for a free student', () => {
    const game = arcadePick({
      primary: 'piano',
      goals: ['theory'],
      isPremium: false,
      records: { 'game:majorArcanum': [1, 2, 0] },
    });
    expect(game?.route).toBe('chordConnection');
  });
});

describe('this week', () => {
  it('counts days, XP and finished lessons, Monday to Sunday', () => {
    const days = weekDates(NOW);
    expect(days[0]).toBe('2026-11-02');
    expect(days).toHaveLength(7);
    const stats = weekStats(
      [
        { date: '2026-11-02', totalExperience: 20 } as never,
        { date: '2026-11-03', totalExperience: 0 } as never,
        { date: '2026-10-30', totalExperience: 50 } as never,
      ],
      {
        'theory:piano.ionian.c': [MIN, MIN, MIN],
        'song:africa': [MIN - DAY_MIN, MIN - DAY_MIN, MIN - DAY_MIN],
      },
      NOW,
    );
    expect(stats).toEqual({
      daysActive: 3,
      activeDates: ['2026-11-02', '2026-11-03', '2026-11-04'],
      xp: 20,
      finished: 1,
    });
    expect(dateKey(NOW)).toBe('2026-11-04');
  });
});

describe('the profile', () => {
  it('keeps only what it knows', () => {
    expect(
      normalizeLearnProfile({
        welcomedAt: 5,
        instruments: ['guitar', 'drums'],
        level: 'expert',
        goals: ['songs', 'fame'],
        daysPerWeek: 9,
        dismissed: ['a', 3],
      }),
    ).toEqual({
      welcomedAt: 5,
      instruments: ['guitar'],
      goals: ['songs'],
      dismissed: ['a'],
    });
  });

  it('maps Bio genres to course slugs and back', () => {
    const slugs = ['hip-hop', 'rnb', 'neo-soul', 'jam-band'];
    expect(genreSlugOf('Hip-Hop', slugs)).toBe('hip-hop');
    expect(genreSlugOf('R&B', slugs)).toBe('rnb');
    expect(genreSlugOf('Neo Soul', slugs)).toBe('neo-soul');
    expect(genreSlugOf('Polka', slugs)).toBeNull();
    expect(bioGenreOf('rnb')).toBe('R&B');
  });
});
