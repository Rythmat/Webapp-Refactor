import { describe, expect, it } from 'vitest';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import { fretToMidi } from '@/lib/guitar/fretboard';
import {
  octavePairs,
  pentatonicGhosts,
  stepSizes,
  suggestedFingers,
} from '../scaleTheory';

const centers = GUITAR_KEY_ORDER.map((key) => GUITAR_ATLAS_BOOK_ONE[key]);

describe('scale theory', () => {
  it('steps W W H W W W H, each half step on one string', () => {
    for (const center of centers) {
      const steps = stepSizes(center.majorScale.playOrder);
      expect(steps.map((s) => s.size).join(' '), center.key).toBe(
        'W W H W W W H',
      );
      for (const step of steps.filter((s) => s.size === 'H')) {
        expect(step.from.string, center.key).toBe(step.to.string);
      }
      // The half steps sit on string 5 (3 → 4) and string 4 (7 → 8).
      expect(steps[2].from.string).toBe(5);
      expect(steps[6].from.string).toBe(4);
    }
    const pentatonic = stepSizes(GUITAR_ATLAS_BOOK_ONE.C.pentatonic.playOrder);
    expect(pentatonic.map((s) => s.size)).toEqual(['W', 'W', null, 'W', null]);
  });

  it('pairs the two roots an octave apart', () => {
    for (const center of centers) {
      const major = octavePairs(center.majorScale);
      expect(major.low.string).toBe(6);
      expect(major.high).toEqual({ string: 4, fret: major.low.fret + 2 });
      const penta = octavePairs(center.pentatonic);
      expect(penta.low.string).toBe(3);
      expect(penta.high).toEqual({ string: 1, fret: penta.low.fret + 3 });
    }
  });

  it('suggests fingers 1-4, with an open-position anchor', () => {
    for (const center of centers) {
      for (const position of [center.majorScale, center.pentatonic]) {
        const { fingers } = suggestedFingers(position);
        position.playOrder.forEach((p, i) => {
          if (p.fret === 0) expect(fingers[i]).toBeNull();
          else expect(fingers[i], `${center.key} ${p.fret}`).not.toBeNull();
        });
      }
    }
    expect(suggestedFingers(GUITAR_ATLAS_BOOK_ONE.C.majorScale)).toEqual({
      anchor: 7,
      fingers: [2, 4, 1, 2, 4, 1, 3, 4],
    });
    // F: frets 1-2-3 → fingers 1-2-3, and open strings get none.
    expect(suggestedFingers(GUITAR_ATLAS_BOOK_ONE.F.majorScale)).toEqual({
      anchor: 1,
      fingers: [1, 3, null, 1, 3, null, 2, 3],
    });
    // G pentatonic keeps fingers 2-3 on frets 2-3.
    expect(suggestedFingers(GUITAR_ATLAS_BOOK_ONE.G.pentatonic)).toEqual({
      anchor: 1,
      fingers: [null, 2, null, 3, null, 3],
    });
    // A pentatonic: frets 2-4-5 → fingers 1-3-4.
    expect(suggestedFingers(GUITAR_ATLAS_BOOK_ONE.A.pentatonic)).toEqual({
      anchor: 2,
      fingers: [1, 3, 1, 4, 1, 4],
    });
  });

  it('ghosts only degrees 4 and 7 inside the window', () => {
    for (const center of centers) {
      const tonic = keyPitchClass(center.key);
      const ghostPcs = [5, 11].map((s) => (tonic + s) % 12);
      const position = center.pentatonic;
      const ghosts = pentatonicGhosts(center, position);
      expect(ghosts.length, center.key).toBeGreaterThan(0);
      for (const g of ghosts) {
        expect([1, 2, 3]).toContain(g.string);
        expect(g.fret).toBeGreaterThanOrEqual(position.fretStart);
        expect(g.fret).toBeLessThanOrEqual(position.fretEnd);
        expect(ghostPcs).toContain(fretToMidi(g) % 12);
      }
    }
    expect(
      pentatonicGhosts(
        GUITAR_ATLAS_BOOK_ONE.G,
        GUITAR_ATLAS_BOOK_ONE.G.pentatonic,
      ),
    ).toEqual([
      { string: 3, fret: 5 },
      { string: 2, fret: 1 },
      { string: 1, fret: 2 },
    ]);
  });

  it('plays the major scale without 4 and 7 as the pentatonic', () => {
    for (const center of centers) {
      const tonic = keyPitchClass(center.key);
      const major = MAJOR_SCALE_STEPS.map((s) => (tonic + s) % 12);
      const withoutFourSeven = major.filter((_, i) => i !== 3 && i !== 6);
      const pentatonic = [
        ...new Set(center.pentatonic.playOrder.map((p) => fretToMidi(p) % 12)),
      ];
      expect(
        pentatonic.sort((a, b) => a - b),
        center.key,
      ).toEqual(withoutFourSeven.sort((a, b) => a - b));
    }
  });
});
