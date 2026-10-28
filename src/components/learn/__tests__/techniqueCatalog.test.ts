import { describe, expect, it } from 'vitest';
import {
  PIANO_TECHNIQUE_DATA,
  techniqueDataFor,
} from '@/components/learn/techniqueCatalog';

describe('techniqueCatalog', () => {
  it('keeps the piano Technique tiles; Music Literacy is Start Here’s', () => {
    expect(PIANO_TECHNIQUE_DATA).toEqual([
      {
        title: 'Piano Fundamentals',
        route: '/curriculum/piano-fundamentals',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [1, 2],
      },
      {
        title: 'Applied Theory Fundamentals',
        route: '/curriculum/applied-theory-fundamentals',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [2, 3],
      },
    ]);
    expect(techniqueDataFor('piano')).toBe(PIANO_TECHNIQUE_DATA);
    expect(
      PIANO_TECHNIQUE_DATA.some(
        (tile) =>
          tile.title === 'Music Literacy' ||
          tile.route.startsWith('/curriculum/music-literacy'),
      ),
    ).toBe(false);
  });

  it('gives guitar its own Technique tile: Guitar Harmonics', () => {
    expect(techniqueDataFor('guitar').map((tile) => tile.title)).toEqual([
      'Guitar Harmonics',
    ]);
    expect(techniqueDataFor('guitar')[0].route).toBe(
      '/learn/guitar/technique/harmonics',
    );
  });
});
