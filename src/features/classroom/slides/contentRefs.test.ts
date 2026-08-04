import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  curriculumRef,
  globePathwayRef,
  learnRef,
  moduleForKind,
  refFirewallCollision,
  songChartRef,
  songLessonRef,
} from './contentRefs';
import { resolveActivityRefHref } from './resolveContentHref';

// Minimal Song stub — songLessonRoute only reads `mode` + `key`.
const fakeSong = (id: string): Song =>
  ({ id, mode: 'dorian', key: 'C' }) as unknown as Song;
const getSong = (id: string): Song | null =>
  id === 'africa' ? fakeSong(id) : null;

describe('contentRefs — every builder round-trips through the resolver', () => {
  it('songChartRef → the song detail page (no deps needed)', () => {
    expect(resolveActivityRefHref('learn', songChartRef('africa'))).toBe(
      '/songs/africa',
    );
  });

  it('songLessonRef → the song Theory lesson (needs getSong)', () => {
    const href = resolveActivityRefHref('learn', songLessonRef('africa'), {
      getSong,
    });
    expect(href).not.toBeNull();
    expect(href).toBe('/learn/dorian/c');
  });

  it('learnRef canonicalizes the key and resolves', () => {
    expect(learnRef('dorian', 'B♭ minor')).toBe('learn:dorian:bflat');
    expect(learnRef('lydian', 'F#')).toBe('learn:lydian:fsharp');
    expect(resolveActivityRefHref('learn', learnRef('dorian', 'bflat'))).toBe(
      '/learn/dorian/bflat',
    );
  });

  it('curriculumRef resolves, incl. spaced/ampersand genre ids', () => {
    expect(
      resolveActivityRefHref('learn', curriculumRef('JAZZ', 2, 'B')),
    ).not.toBeNull();
    // R&B → slug 'rnb', 'HIP HOP' → slug 'hip hop'
    expect(
      resolveActivityRefHref('learn', curriculumRef('R&B', 1)),
    ).not.toBeNull();
    expect(
      resolveActivityRefHref('learn', curriculumRef('HIP HOP', 3, 'D')),
    ).not.toBeNull();
  });

  it('globePathwayRef → /atlas/globe?pathway=<id>', () => {
    expect(
      resolveActivityRefHref('globe', globePathwayRef('blues-to-rock')),
    ).toBe('/atlas/globe?pathway=blues-to-rock');
  });

  it('moduleForKind maps kinds to a valid LaunchTile module', () => {
    expect(moduleForKind('songChart')).toBe('learn');
    expect(moduleForKind('curriculumActivity')).toBe('learn');
    expect(moduleForKind('globePathway')).toBe('globe');
  });
});

describe('refFirewallCollision — blocks un-publishable refs/labels', () => {
  it('flags the "clo" collision in real song ids', () => {
    expect(refFirewallCollision(songChartRef('tears_of_a_clown'))).toBe('clo');
    expect(
      refFirewallCollision(songLessonRef('they_long_to_be_close_to_you')),
    ).toBe('clo');
  });

  it('flags a forbidden substring in the label', () => {
    expect(
      refFirewallCollision('globe:pathway:blues-to-rock', 'My notes'),
    ).toBe('notes');
  });

  it('returns null for a safe ref + label', () => {
    expect(refFirewallCollision(songChartRef('africa'), 'Africa')).toBeNull();
    expect(refFirewallCollision(globePathwayRef('jazz-chain'))).toBeNull();
  });
});
