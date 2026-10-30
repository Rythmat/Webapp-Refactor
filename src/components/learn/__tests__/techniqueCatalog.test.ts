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
        route: '/learn/keyboard/technique/anatomy',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [3, 4],
      },
      {
        title: 'Keyboard Anatomy',
        route: '/learn/keyboard/technique/keyboard-anatomy',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [4, 5],
      },
      {
        title: 'Synth Anatomy',
        route: '/learn/keyboard/technique/synth-anatomy',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
        ratio: [5, 6],
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

  it('gives bass and ukulele their own Technique tiles: Anatomy', () => {
    expect(techniqueDataFor('bass').map((tile) => tile.route)).toEqual([
      '/learn/bass/technique/anatomy',
    ]);
    expect(techniqueDataFor('ukulele').map((tile) => tile.route)).toEqual([
      '/learn/ukulele/technique/anatomy',
    ]);
  });

  it('gives guitar its own Technique tiles, anatomy before harmonics', () => {
    expect(techniqueDataFor('guitar').map((tile) => tile.title)).toEqual([
      'Guitar Anatomy',
      'Guitar Harmonics',
    ]);
    expect(techniqueDataFor('guitar').map((tile) => tile.route)).toEqual([
      '/learn/guitar/technique/anatomy',
      '/learn/guitar/technique/harmonics',
    ]);
  });
});
