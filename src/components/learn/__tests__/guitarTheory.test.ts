import { describe, expect, it, vi } from 'vitest';
import {
  COMING_SOON_FOR_GUITAR,
  GUITAR_THEORY_MODES,
  guitarIonianLessonRoute,
  guitarTheoryChapters,
  isTheoryItemOnGuitar,
} from '@/components/learn/guitarTheory';

// Records the key names the book's flow builder is asked for.
const builtKeys = vi.hoisted(() => [] as string[]);
vi.mock(
  '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals')
      >();
    return {
      ...actual,
      buildGuitarAppliedTheoryFundamentalsFlow: (keyName: string) => {
        builtKeys.push(keyName);
        return actual.buildGuitarAppliedTheoryFundamentalsFlow(keyName);
      },
    };
  },
);

describe('guitarTheory', () => {
  it('has guitar lessons for Ionian (Major) only', () => {
    expect(GUITAR_THEORY_MODES).toEqual(['ionian']);
    expect(isTheoryItemOnGuitar({ mode: 'ionian' })).toBe(true);
    for (const mode of ['dorian', 'aeolian', 'ionian#5', 'ionian#2#5']) {
      expect(isTheoryItemOnGuitar({ mode })).toBe(false);
    }
    // Relative / Parallel key tiles have no mode.
    expect(isTheoryItemOnGuitar({})).toBe(false);
    expect(COMING_SOON_FOR_GUITAR).toBe('Coming soon for guitar');
  });

  it("gives C's chapters with their step counts and ?section= routes", async () => {
    expect(await guitarTheoryChapters('C')).toEqual([
      {
        id: 'A',
        name: 'Melody',
        stepCount: 20,
        route: '/learn/guitar/ionian/c?section=A',
      },
      {
        id: 'B',
        name: 'Chords',
        stepCount: 46,
        route: '/learn/guitar/ionian/c?section=B',
      },
      {
        id: 'D',
        name: 'Play-Along',
        stepCount: 9,
        route: '/learn/guitar/ionian/c?section=D',
      },
    ]);
  });

  it('spells sharp and flat keys the way the lesson URLs do', async () => {
    const fSharp = await guitarTheoryChapters('F#');
    expect(fSharp.map((c) => c.route)).toEqual([
      '/learn/guitar/ionian/fsharp?section=A',
      '/learn/guitar/ionian/fsharp?section=B',
      '/learn/guitar/ionian/fsharp?section=D',
    ]);
    const dFlat = await guitarTheoryChapters('D♭');
    expect(dFlat[0].route).toBe('/learn/guitar/ionian/dflat?section=A');
    expect(dFlat.map((c) => c.name)).toEqual([
      'Melody',
      'Chords',
      'Play-Along',
    ]);
    expect(guitarIonianLessonRoute('D♭')).toBe('/learn/guitar/ionian/dflat');
    expect(guitarIonianLessonRoute('C')).toBe('/learn/guitar/ionian/c');
  });

  it('asks the book for each key in ASCII spelling', async () => {
    builtKeys.length = 0;
    await guitarTheoryChapters('F#');
    await guitarTheoryChapters('D♭');
    await guitarTheoryChapters('B♭');
    expect(builtKeys).toEqual(['F#', 'Db', 'Bb']);
  });
});
