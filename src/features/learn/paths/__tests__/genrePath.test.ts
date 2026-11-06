// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { followingGenre, genrePath } from '../genrePath';

const path = (
  built: (level: number, section: string) => boolean,
  isPremium = true,
) =>
  genrePath('pop', {
    title: 'Pop',
    description: 'x',
    accent: '#fff',
    ratio: [2, 3],
    isPremium,
    built,
  });

afterEach(() => localStorage.clear());

describe('a genre’s path', () => {
  it('has a disc per built section, under its level', () => {
    const course = path(() => true);
    expect(course.rows).toHaveLength(12);
    expect(course.levels.map((l) => l.kicker)).toEqual([
      'Level 1',
      'Level 2',
      'Level 3',
    ]);
    expect(course.rows[0].route).toBe('/learn/keyboard/genre/pop/1?section=A');
    expect(course.rows[7].title).toBe('Performance');
  });

  it('shows only what’s built, as with Latin', () => {
    const course = path((level) => level === 1);
    expect(course.rows.map((r) => r.id)).toEqual(['1-A', '1-B', '1-C', '1-D']);
    expect(course.levels).toHaveLength(1);
  });

  it('reads each section’s progress as saved', () => {
    localStorage.setItem(
      'genre_progress_pop_1',
      JSON.stringify({
        completedSteps: { a: {} },
        sections: {
          A: { stepsCompleted: 5, stepsTotal: 5 },
          B: { stepsCompleted: 6, stepsTotal: 24 },
        },
      }),
    );
    const { rows } = path(() => true);
    expect(rows[0].percent).toBe(100);
    expect(rows[1].percent).toBe(25);
    expect(rows[2].percent).toBe(0);
  });

  it('locks every disc for a free student, without hiding them', () => {
    const { rows } = path(() => true, false);
    expect(rows.every((r) => r.locked)).toBe(true);
  });
});

describe('the genre after this one', () => {
  it('skips what isn’t built', () => {
    expect(followingGenre('pop', (slug) => slug === 'funk')?.slug).toBe('funk');
    expect(followingGenre('pop', () => false)).toBeUndefined();
  });
});
