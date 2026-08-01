import { beforeAll, describe, expect, it } from 'vitest';
import { ensureAtlasContent } from '@/content/contentStore';
import { ensureSongContent } from '@/content/songStore';
import { scoreKeywords, scoreText } from './match';
import { browseStatic, searchStatic } from './searchStatic';
import { getStaticIndex } from './sources/staticIndex';

// The static index spans songs and globe events, neither of which is eagerly
// bundled any more — both hydrate asynchronously from the published content
// bundles (or, here, from the bundled fallback). Without this the 'songs' and
// 'globe' categories would simply be absent, which is exactly what
// <ContentGate> prevents at runtime.
//
// The generous timeout is test-setup cost, not product cost: the bundled
// fallback pulls in 640 song modules and 1,722 events through dynamic imports,
// which exceeds vitest's 5s default when the whole suite is competing for CPU.
// In production this is two gzipped CDN fetches.
beforeAll(async () => {
  await Promise.all([ensureAtlasContent(), ensureSongContent()]);
}, 60_000);

describe('scoreText', () => {
  it('is case-insensitive and ranks exact > prefix > interior', () => {
    expect(scoreText('REDBONE', 'redbone')).toBe(100); // exact
    expect(scoreText('Redbone', 'red')).toBe(80); // prefix
    expect(scoreText('Purple Rain', 'rain')).toBe(60); // word-boundary
    expect(scoreText('Purple Rain', 'red')).toBe(-1); // no match
    expect(scoreText('Redbone', 'red')).toBeGreaterThan(
      scoreText('Undertone', 'red'),
    );
  });

  it('scoreKeywords takes the best-scoring keyword', () => {
    expect(scoreKeywords(['nope', 'Dorian'], 'dorian')).toBe(100);
    expect(scoreKeywords(['nope', 'nada'], 'dorian')).toBe(-1);
  });
});

describe('static index', () => {
  // Built inside beforeAll, not at describe scope: describe bodies run during
  // collection, before the hydration above has happened.
  let index: ReturnType<typeof getStaticIndex>;
  beforeAll(() => {
    index = getStaticIndex();
  });

  it('is large (songs dominate) and cached across calls', () => {
    expect(index.length).toBeGreaterThan(600);
    expect(getStaticIndex()).toBe(index);
  });

  it('covers every static category', () => {
    const cats = new Set(index.map((e) => e.result.category));
    for (const c of [
      'songs',
      'artists',
      'courses',
      'theory',
      'globe',
      'arcade',
      'pages',
    ] as const) {
      expect(cats.has(c)).toBe(true);
    }
  });

  it('every entry is well-formed with unique result ids', () => {
    for (const e of index) {
      expect(e.keywords.length).toBeGreaterThan(0);
      expect(e.result.id).toBeTruthy();
      expect(e.result.title).toBeTruthy();
      expect(typeof e.result.to).toBe('string');
      expect(e.result.to.length).toBeGreaterThan(0);
    }
    const ids = index.map((e) => e.result.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('searchStatic', () => {
  it('returns nothing for an empty/blank query', () => {
    expect(searchStatic('')).toEqual([]);
    expect(searchStatic('   ')).toEqual([]);
  });

  it('finds a theory mode by name and links to /learn/<slug>', () => {
    const theory = searchStatic('DORIAN').find((g) => g.category === 'theory');
    expect(theory).toBeTruthy();
    expect(theory!.results[0].to).toBe('/learn/dorian');
  });

  it('finds a course and links to /curriculum/<slug>', () => {
    const course = searchStatic('jazz').find((g) => g.category === 'courses');
    expect(course?.results.some((r) => r.to === '/curriculum/jazz')).toBe(true);
  });

  it('matches a real song by its title and links to /songs/:id', () => {
    const song = getStaticIndex().find((e) => e.result.category === 'songs')!;
    const songs = searchStatic(song.result.title).find(
      (g) => g.category === 'songs',
    );
    expect(songs?.results.some((r) => r.to.startsWith('/songs/'))).toBe(true);
  });

  it('caps a group to 6 but reports the full total + a see-all link', () => {
    const songs = searchStatic('a').find((g) => g.category === 'songs');
    expect(songs).toBeTruthy();
    expect(songs!.results.length).toBeLessThanOrEqual(6);
    expect(songs!.total).toBeGreaterThanOrEqual(songs!.results.length);
    expect(songs!.seeAllTo).toContain('/songs?q=');
  });
});

describe('browseStatic (default, no-query view)', () => {
  // Same reason as the static-index block above: describe bodies run at
  // collection time, before globe events have hydrated.
  let groups: ReturnType<typeof browseStatic>;
  beforeAll(() => {
    groups = browseStatic();
  });

  it('returns a preview group for every static category', () => {
    const cats = new Set(groups.map((g) => g.category));
    for (const c of [
      'songs',
      'artists',
      'courses',
      'theory',
      'globe',
      'arcade',
      'pages',
    ] as const) {
      expect(cats.has(c)).toBe(true);
    }
  });

  it('caps each group at 6 while reporting the full total', () => {
    for (const g of groups) {
      expect(g.results.length).toBeLessThanOrEqual(6);
      expect(g.total).toBeGreaterThanOrEqual(g.results.length);
    }
    const songs = groups.find((g) => g.category === 'songs')!;
    expect(songs.total).toBeGreaterThan(6); // ~650 songs
    expect(songs.results.length).toBe(6);
    expect(songs.seeAllTo).toBe('/songs');
  });

  it('leads songs with the most popular (popularity-desc index order)', () => {
    const topSongId = getStaticIndex().find(
      (e) => e.result.category === 'songs',
    )!.result.id;
    expect(groups.find((g) => g.category === 'songs')!.results[0].id).toBe(
      topSongId,
    );
  });
});
