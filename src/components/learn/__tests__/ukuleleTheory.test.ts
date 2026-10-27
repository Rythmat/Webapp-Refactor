import { describe, expect, it } from 'vitest';
import {
  COMING_SOON_FOR_UKULELE,
  isTheoryItemOnUkulele,
  ukuleleLessonRoute,
} from '@/components/learn/ukuleleTheory';
import { LearnRoutes } from '@/constants/routes';
import { buildUkuleleTheoryFlow } from '@/curriculum/data/activityFlows/ukuleleTheoryFlows';
import { UKULELE_THEORY_CATALOG } from '@/curriculum/data/ukulele';

describe('ukuleleTheory', () => {
  it('has ukulele lessons for every Theory tile', () => {
    for (const entry of UKULELE_THEORY_CATALOG) {
      expect(isTheoryItemOnUkulele({ mode: entry.slug }), entry.slug).toBe(
        true,
      );
    }
    expect(isTheoryItemOnUkulele({ mode: 'harmonicMinor' })).toBe(false);
    const keyTile = (modes: string[]) => ({
      subItems: modes.map((mode) => ({ mode })),
    });
    expect(isTheoryItemOnUkulele(keyTile(['ionian', 'dorian']))).toBe(true);
    expect(isTheoryItemOnUkulele(keyTile([]))).toBe(false);
    expect(COMING_SOON_FOR_UKULELE).toBe('Coming soon for ukulele');
  });

  it('routes to /learn/ukulele/<mode>/<key>', () => {
    expect(ukuleleLessonRoute('dorian', 'F♯')).toBe(
      '/learn/ukulele/dorian/fsharp',
    );
    expect(LearnRoutes.ukulele()).toBe('/learn/ukulele');
    expect(LearnRoutes.ukuleleOverview({ mode: 'ionian' })).toBe(
      '/learn/ukulele/ionian',
    );
  });

  it('names its progress apart from guitar and bass', () => {
    const ids = UKULELE_THEORY_CATALOG.map((e) => e.genre);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('ukulele-'))).toBe(true);
    expect(buildUkuleleTheoryFlow('C', 'ionian').genre).toBe(
      'ukulele-mode-ionian',
    );
  });
});
