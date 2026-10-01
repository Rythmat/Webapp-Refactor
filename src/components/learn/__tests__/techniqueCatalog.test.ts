import { describe, expect, it } from 'vitest';
import {
  GUITAR_TECHNIQUE_DATA,
  PIANO_TECHNIQUE_DATA,
  techniqueDataFor,
} from '@/components/learn/techniqueCatalog';

describe('techniqueCatalog', () => {
  it('keeps the piano Technique tiles exactly as they were', () => {
    expect(PIANO_TECHNIQUE_DATA).toEqual([
      {
        title: 'Piano Fundamentals',
        route: '/curriculum/piano-fundamentals',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
      },
      {
        title: 'Applied Theory Fundamentals',
        route: '/curriculum/applied-theory-fundamentals',
        image: '/learn-tiles/beginner-hex.svg',
        interactive: true,
      },
    ]);
    expect(techniqueDataFor('piano')).toBe(PIANO_TECHNIQUE_DATA);
  });

  it('gives guitar its own Applied Theory tile with its own saved id', () => {
    expect(techniqueDataFor('guitar')).toBe(GUITAR_TECHNIQUE_DATA);
    expect(GUITAR_TECHNIQUE_DATA).toEqual([
      expect.objectContaining({
        title: 'Applied Theory Fundamentals',
        route: '/curriculum/guitar/applied-theory-fundamentals',
        savedId: 'guitar:applied-theory-fundamentals',
      }),
    ]);
  });
});
