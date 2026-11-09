import { describe, expect, it } from 'vitest';
import {
  PIANO_TECHNIQUE_DATA,
  techniqueDataFor,
} from '@/components/learn/techniqueCatalog';

describe('techniqueCatalog', () => {
  it('keeps the piano Technique tiles; Music Literacy is Start Here’s', () => {
    expect(PIANO_TECHNIQUE_DATA).toEqual([
      {
        title: 'Piano Anatomy',
        route: '/learn/audio/anatomy/piano',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [3, 4],
        premium: true,
      },
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

  it('gives bass and ukulele one Technique tile: a way into Audio’s Anatomy', () => {
    expect(techniqueDataFor('bass').map((tile) => tile.route)).toEqual([
      '/learn/audio/anatomy/bass',
    ]);
    expect(techniqueDataFor('ukulele').map((tile) => tile.route)).toEqual([
      '/learn/audio/anatomy/ukulele',
    ]);
  });

  it('locks only the Anatomy shortcuts for free users', () => {
    for (const instrument of ['piano', 'guitar', 'bass', 'ukulele'] as const) {
      for (const tile of techniqueDataFor(instrument)) {
        expect(!!tile.premium, tile.title).toBe(tile.title.endsWith('Anatomy'));
      }
    }
  });

  it('gives guitar its own Technique tiles, anatomy before harmonics', () => {
    expect(techniqueDataFor('guitar').map((tile) => tile.title)).toEqual([
      'Guitar Anatomy',
      'Guitar Harmonics',
    ]);
    expect(techniqueDataFor('guitar').map((tile) => tile.route)).toEqual([
      '/learn/audio/anatomy/guitar',
      '/learn/guitar/technique/harmonics',
    ]);
  });
});
