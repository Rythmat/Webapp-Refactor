/**
 * The genre lesson leaves its built Practice Track in a module box for the
 * Studio. Since milestone 1.4 the Studio reads it in openSession's prepare
 * step, which changes nothing: resolvePracticeTrack leaves the box full by
 * default, so an open that is refused, cancelled or superseded can try again
 * with the same performance, and the open takes it (takePracticeTrack) only
 * once it is ready.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import {
  openGenrePracticeTrack,
  peekPracticeTrack,
  resolvePracticeTrack,
  takePracticeTrack,
} from '../openGenrePracticeTrack';

const hand = () =>
  openGenrePracticeTrack(funkL2, 'A', {
    genreLabel: 'Funk',
    returnTo: '/curriculum/funk/2?section=A',
  });

afterEach(() => {
  takePracticeTrack(funkL2.genre, funkL2.level, 'A');
});

describe('resolvePracticeTrack', () => {
  it('reads the handed-over track and leaves it in the box', async () => {
    expect(hand()).toBe(
      `/studio/editor?practiceGenre=${funkL2.genre}&practiceLevel=${funkL2.level}&practiceSection=A`,
    );
    const handed = peekPracticeTrack(funkL2.genre, funkL2.level, 'A')!;

    const first = await resolvePracticeTrack(funkL2.genre, funkL2.level, 'A');
    const again = await resolvePracticeTrack(funkL2.genre, funkL2.level, 'A');

    // The very performance the student heard, both times.
    expect(first?.track).toBe(handed.track);
    expect(again?.track).toBe(handed.track);
    expect(first?.genreLabel).toBe('Funk');
    expect(first?.returnTo).toBe('/curriculum/funk/2?section=A');
    expect(peekPracticeTrack(funkL2.genre, funkL2.level, 'A')).toBe(handed);
  });

  it('empties the box when asked to consume', async () => {
    hand();
    const handed = peekPracticeTrack(funkL2.genre, funkL2.level, 'A')!;
    const got = await resolvePracticeTrack(funkL2.genre, funkL2.level, 'A', {
      consume: true,
    });
    expect(got?.track).toBe(handed.track);
    expect(peekPracticeTrack(funkL2.genre, funkL2.level, 'A')).toBeNull();
  });

  it('leaves a box for another section alone and rebuilds', async () => {
    hand();
    const handed = peekPracticeTrack(funkL2.genre, funkL2.level, 'A')!;
    const other = await resolvePracticeTrack(funkL2.genre, funkL2.level, 'B');
    expect(other).not.toBeNull();
    expect(other?.track).not.toBe(handed.track);
    expect(other?.genreLabel).toBe('Funk');
    expect(peekPracticeTrack(funkL2.genre, funkL2.level, 'A')).toBe(handed);
  });

  it('is null for parameters that name nothing real', async () => {
    expect(await resolvePracticeTrack('no-such-genre', 9, 'A')).toBeNull();
  });
});

describe('takePracticeTrack', () => {
  it('takes the track once', () => {
    hand();
    expect(takePracticeTrack(funkL2.genre, funkL2.level, 'A')).not.toBeNull();
    expect(takePracticeTrack(funkL2.genre, funkL2.level, 'A')).toBeNull();
  });
});
