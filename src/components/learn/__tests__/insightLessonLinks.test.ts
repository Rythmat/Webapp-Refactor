import { describe, expect, it } from 'vitest';
import { LearnRoutes } from '@/constants/routes';
import { MODE_TO_SLUG } from '@/daw/components/Library/insightConstants';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { getChordScales } from '../chordScaleData';
import { getNoteSpelling } from '../noteSpellingLookup';

/**
 * Insight's chord cards link into `/learn/:mode/:key`. Insight and Theory used
 * to keep separate mode vocabularies — Insight emitted kebab-case
 * ('phrygian-dominant'), Theory keys off the Prism API spelling
 * ('phrygiandominant') — so 25 of the 35 links resolved to nothing and
 * LessonOverview silently rendered a major scale under the requested mode's
 * name. These tests pin the two vocabularies together.
 */
describe('Insight → Theory lesson links', () => {
  const entries = Object.entries(MODE_TO_SLUG);

  it('covers all 35 modes', () => {
    expect(entries).toHaveLength(35);
  });

  it.each(entries)(
    '%s resolves to scale steps the lesson page can render',
    (_mode, slug) => {
      expect(getLocalModeSteps(slug)).toEqual(expect.any(Array));
    },
  );

  it.each(entries)('%s resolves to chord tables', (_mode, slug) => {
    expect(getChordScales(slug)).toBeDefined();
  });

  it('percent-encodes accidentals so they never become URL fragments', () => {
    // 'ionian#5' must not ship a bare '#', which a browser reads as a fragment
    // delimiter and would strip from the route param entirely.
    const path = LearnRoutes.lesson({
      mode: MODE_TO_SLUG.ionianSharp5,
      key: 'c',
    });
    expect(path).toBe('/learn/ionian%235/c');
    expect(path).not.toContain('#');
  });

  it('spells E Phrygian Dominant correctly — the originally reported bug', () => {
    // The Insight link for an E7♯5 chord landed on /learn/phrygian-dominant/e
    // and rendered E F♯ G♯ A B C♯ D♯ (E major) instead of E F G♯ A B C D.
    const slug = MODE_TO_SLUG.phrygianDominant;
    expect(getLocalModeSteps(slug)).toEqual([0, 1, 4, 5, 7, 8, 10]);
    expect(getNoteSpelling(slug, 'E')).toEqual([
      'E',
      'F',
      'G♯',
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('maps the two modes whose Theory name differs in substance', () => {
    // Guards against anyone "fixing" this table by de-hyphenating the keys.
    expect(MODE_TO_SLUG.mixolydianFlat6).toBe('mixolydiannat6');
    expect(MODE_TO_SLUG.altered).toBe('altereddominant');
  });
});
