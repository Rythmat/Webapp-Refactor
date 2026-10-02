import { describe, expect, it, vi } from 'vitest';
import {
  COMING_SOON_FOR_GUITAR,
  GUITAR_THEORY_MODES,
  guitarLessonRoute,
  guitarTheoryChapters,
  isTheoryItemOnGuitar,
} from '@/components/learn/guitarTheory';

// Records the key names and modes the flow builder is asked for.
const built = vi.hoisted(() => [] as string[]);
vi.mock(
  '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals')
      >();
    return {
      ...actual,
      buildGuitarModeFlow: (
        ...args: Parameters<typeof actual.buildGuitarModeFlow>
      ) => {
        built.push(args.join(' '));
        return actual.buildGuitarModeFlow(...args);
      },
    };
  },
);

describe('guitarTheory', () => {
  it('has guitar lessons for the seven diatonic modes', () => {
    expect(GUITAR_THEORY_MODES).toEqual([
      'ionian',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ]);
    for (const mode of GUITAR_THEORY_MODES) {
      expect(isTheoryItemOnGuitar({ mode })).toBe(true);
    }
    for (const mode of [
      'ionian#5',
      'ionian#2#5',
      'dorian♭2',
      'majorpentatonic',
    ]) {
      expect(isTheoryItemOnGuitar({ mode })).toBe(false);
    }
    // Relative / Parallel key tiles have no mode.
    expect(isTheoryItemOnGuitar({})).toBe(false);
    expect(COMING_SOON_FOR_GUITAR).toBe('Coming soon for guitar');
  });

  it("gives C Ionian's chapters with their step counts and ?section= routes", async () => {
    expect(await guitarTheoryChapters('ionian', 'C')).toEqual([
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

  it("gives a mode's chapters: its pentatonics, and all seven triads", async () => {
    const dorian = await guitarTheoryChapters('dorian', 'F#');
    expect(dorian.map((c) => [c.id, c.stepCount, c.route])).toEqual([
      ['A', 26, '/learn/guitar/dorian/fsharp?section=A'],
      ['B', 48, '/learn/guitar/dorian/fsharp?section=B'],
      ['D', 9, '/learn/guitar/dorian/fsharp?section=D'],
    ]);
    const aeolian = await guitarTheoryChapters('aeolian', 'A');
    expect(aeolian.map((c) => c.stepCount)).toEqual([20, 48, 9]);
    expect(await guitarTheoryChapters('harmonicMinor', 'C')).toEqual([]);
  });

  it('spells sharp and flat keys the way the lesson URLs do', async () => {
    const fSharp = await guitarTheoryChapters('ionian', 'F#');
    expect(fSharp.map((c) => c.route)).toEqual([
      '/learn/guitar/ionian/fsharp?section=A',
      '/learn/guitar/ionian/fsharp?section=B',
      '/learn/guitar/ionian/fsharp?section=D',
    ]);
    const dFlat = await guitarTheoryChapters('ionian', 'D♭');
    expect(dFlat[0].route).toBe('/learn/guitar/ionian/dflat?section=A');
    expect(dFlat.map((c) => c.name)).toEqual([
      'Melody',
      'Chords',
      'Play-Along',
    ]);
    expect(guitarLessonRoute('ionian', 'D♭')).toBe(
      '/learn/guitar/ionian/dflat',
    );
    expect(guitarLessonRoute('ionian', 'C')).toBe('/learn/guitar/ionian/c');
    expect(guitarLessonRoute('locrian', 'B♭')).toBe(
      '/learn/guitar/locrian/bflat',
    );
  });

  it('asks the builder for each key in ASCII spelling', async () => {
    built.length = 0;
    await guitarTheoryChapters('ionian', 'F#');
    await guitarTheoryChapters('dorian', 'D♭');
    await guitarTheoryChapters('lydian', 'B♭');
    expect(built).toEqual(['F# ionian', 'Db dorian', 'Bb lydian']);
  });
});
