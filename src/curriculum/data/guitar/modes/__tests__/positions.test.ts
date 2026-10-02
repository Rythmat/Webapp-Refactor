import { describe, expect, it } from 'vitest';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { octavePairs, suggestedFingers } from '@/lib/guitar/theory';
import {
  GUITAR_MODES,
  MODE_STEPS,
  isGuitarModalMode,
  pentatonicPosition,
  scalePosition,
} from '..';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '../../bookOne';
import { centerId, getGuitarCenter } from '../../centers';
import type { GuitarScalePosition } from '../../types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A position a hand can play: in order, inside its box, one finger a fret. */
function expectPlayable(position: GuitarScalePosition, pcs: number[]) {
  const midis = position.playOrder.map(fretToMidi);
  expect(midis).toEqual([...midis].sort((a, b) => a - b));
  expect(new Set(midis.map(mod12))).toEqual(new Set(pcs));
  expect(() => octavePairs(position)).not.toThrow();
  const fretted = position.playOrder.map((p) => p.fret).filter((f) => f > 0);
  expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(4);
  for (const { fret } of position.playOrder) {
    if (fret === 0) continue;
    expect(fret).toBeGreaterThanOrEqual(position.fretStart);
    expect(fret).toBeLessThanOrEqual(position.fretEnd);
  }
  const { fingers } = suggestedFingers(position);
  position.playOrder.forEach((p, i) => {
    if (p.fret > 0) expect(fingers[i]).not.toBeNull();
  });
}

describe('mode scale positions', () => {
  it.each(GUITAR_KEY_ORDER)(
    'draws Book One’s %s major and pentatonic positions',
    (key) => {
      const book = GUITAR_ATLAS_BOOK_ONE[key];
      const pc = keyPitchClass(key);
      expect(scalePosition(pc, MAJOR_SCALE_STEPS)).toEqual(book.majorScale);
      expect(
        pentatonicPosition(pc, MAJOR_SCALE_STEPS, [1, 2, 3, 5, 6]),
      ).toEqual(book.pentatonic);
    },
  );

  for (const mode of GUITAR_MODES.filter(isGuitarModalMode)) {
    it(`draws playable ${mode} positions in every key`, () => {
      for (const key of GUITAR_KEY_ORDER) {
        const center = getGuitarCenter(centerId(key, mode));
        const steps = MODE_STEPS[mode];
        const scalePcs = steps.map((s) => mod12(center.tonicPc + s));
        expectPlayable(center.majorScale, scalePcs);
        expect(mod12(fretToMidi(center.majorScale.playOrder[0]))).toBe(
          center.tonicPc,
        );
        for (const pentatonic of center.pentatonics) {
          const pcs = pentatonic.degrees.map((d) =>
            mod12(center.tonicPc + steps[d - 1]),
          );
          expectPlayable(pentatonic.position, pcs);
          // Played from its first degree (Lydian's from the 2).
          expect(mod12(fretToMidi(pentatonic.position.playOrder[0]))).toBe(
            pcs[0],
          );
        }
      }
    });
  }
});
