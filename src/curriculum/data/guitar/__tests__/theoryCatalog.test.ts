import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LearnRoutes } from '@/constants/routes';
import { guitarModeGenre } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { MODE_FAMILY_INFO } from '@/daw/prism-engine/data/modes';
import { SCALE_LESSON_SLUGS } from '@/lib/learn/scaleLessons';
import { canonicalModeKey, getLocalModeSteps } from '@/lib/modeStepsFallback';
import { GUITAR_MODES } from '../modes/modeNames';
import {
  GUITAR_THEORY_CATALOG,
  LIVE_GUITAR_FAMILIES,
  guitarScaleEntry,
  guitarTheoryEntry,
  isGuitarScaleKey,
  isGuitarTheorySlug,
} from '../theoryCatalog';

const FAMILY_LABEL: Record<string, string> = {
  diatonic: 'Diatonic',
  'harmonic-minor': 'Harmonic Minor',
  'melodic-minor': 'Melodic Minor',
  'harmonic-major': 'Harmonic Major',
  'double-harmonic': 'Double Harmonic',
};

describe('guitar Theory catalog', () => {
  it('lists every Theory mode and scale tile once', () => {
    // 7 diatonic modes, 4 pentatonic/blues scales, 4 families of 7 modes.
    expect(GUITAR_THEORY_CATALOG).toHaveLength(39);
    for (const field of ['slug', 'key', 'genre'] as const) {
      const values = GUITAR_THEORY_CATALOG.map((e) => e[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
    expect(
      GUITAR_THEORY_CATALOG.filter((e) => e.family === 'pentatonic-blues').map(
        (e) => e.slug,
      ),
    ).toEqual([...SCALE_LESSON_SLUGS]);
  });

  it('keeps ids ASCII, with no underscore a piano scale id could share', () => {
    for (const entry of GUITAR_THEORY_CATALOG) {
      expect(entry.key).toMatch(/^[a-z0-9]+$/);
      expect(entry.genre).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('keeps the diatonic modes’ progress ids', () => {
    for (const mode of GUITAR_MODES) {
      expect(guitarScaleEntry(mode).genre).toBe(guitarModeGenre(mode));
    }
  });

  it('matches each slug to its mode, family and number', () => {
    for (const entry of GUITAR_THEORY_CATALOG) {
      expect(getLocalModeSteps(entry.slug), entry.slug).toBeDefined();
      if (entry.family === 'pentatonic-blues') {
        expect(entry.degree).toBeNull();
        expect(entry.hasChords).toBe(false);
        continue;
      }
      const info = MODE_FAMILY_INFO[canonicalModeKey(entry.slug)!];
      expect(info.familyLabel, entry.slug).toBe(FAMILY_LABEL[entry.family]);
      expect(info.position + 1, entry.slug).toBe(entry.degree);
      expect(entry.hasChords).toBe(true);
    }
  });

  it('round-trips every slug through the lesson URL', () => {
    const routes = [{ path: LearnRoutes.guitarLesson.definition }];
    for (const { slug } of GUITAR_THEORY_CATALOG) {
      const url = LearnRoutes.guitarLesson({ mode: slug, key: 'c' });
      expect(url).not.toContain('#');
      const match = matchRoutes(routes, url);
      expect(match?.[0].params.mode, url).toBe(slug);
    }
    expect(LearnRoutes.guitarLesson({ mode: 'ionian#5', key: 'c' })).toBe(
      '/learn/guitar/ionian%235/c',
    );
  });

  it('opens only the live families', () => {
    for (const entry of GUITAR_THEORY_CATALOG) {
      const live = LIVE_GUITAR_FAMILIES.has(entry.family);
      expect(isGuitarTheorySlug(entry.slug), entry.slug).toBe(live);
      expect(guitarTheoryEntry(entry.slug)).toBe(live ? entry : undefined);
      expect(isGuitarScaleKey(entry.key)).toBe(true);
    }
    expect(isGuitarTheorySlug('harmonicMinor')).toBe(false);
    expect(isGuitarTheorySlug('relative')).toBe(false);
    expect(isGuitarTheorySlug(undefined)).toBe(false);
    expect(isGuitarScaleKey('minor_blues')).toBe(false);
  });
});
