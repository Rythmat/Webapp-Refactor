import { describe, expect, it } from 'vitest';
import {
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

  it('has no guitar Technique tiles: guitar lives in Theory → Ionian (Major)', () => {
    expect(techniqueDataFor('guitar')).toEqual([]);
  });
});
