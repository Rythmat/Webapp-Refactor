// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildLearnCatalog } from '@/features/learn/catalog/learnCatalog';
import { genreReadinessFrom } from '@/features/learn/genreReadiness';
import { BUNDLED_STAFF_PICKS, resolveStaffPicks } from '../staffPicks';

const topics = buildLearnCatalog({
  enabled: () => true,
  isPremium: true,
  lessons: [],
  completedAt: {},
  genreReady: genreReadinessFrom(new Set(['pop:1:A'])),
});

describe('Staff Picks', () => {
  it('resolves every bundled pick to a real course or song, in order', () => {
    // The song library loads with the app; here, any song id is known.
    const songOf = (id: string) => ({ id, title: id, artist: 'A' }) as never;
    const resolved = resolveStaffPicks(BUNDLED_STAFF_PICKS, topics, songOf);
    expect(resolved).toHaveLength(BUNDLED_STAFF_PICKS.length);
    expect(resolved.map((r) => r.pick.id)).toEqual(
      BUNDLED_STAFF_PICKS.map((p) => p.id),
    );
  });

  it('drops picks that name nothing, or a course not built yet', () => {
    const resolved = resolveStaffPicks(
      [
        { kind: 'course', id: 'piano/genre/nope' },
        { kind: 'song', id: 'no-such-song' },
        { kind: 'course', id: 'piano/genre/jazz' },
        { kind: 'course', id: 'piano/genre/pop' },
      ],
      topics,
      () => null,
    );
    expect(resolved.map((r) => r.pick.id)).toEqual(['piano/genre/pop']);
  });
});
