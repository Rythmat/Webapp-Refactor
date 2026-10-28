import { describe, expect, it } from 'vitest';
import {
  GUITAR_KEY_ORDER,
  keyPitchClass,
  keyScaleSpelling,
} from '../../bookOne';
import { centerId, getGuitarCenter } from '../../centers';
import {
  fretboardScaleNotes,
  modalPositions,
  POSITIONS_LAST_FRET,
  type ModalScale,
} from '../modalPositions';
import { GUITAR_MODES } from '../modeNames';
import { MODE_STEPS } from '../modeTables';

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const major = (key: (typeof GUITAR_KEY_ORDER)[number]): ModalScale => ({
  tonicPc: keyPitchClass(key),
  mode: 'ionian',
  spelling: keyScaleSpelling(key),
});

/** One position as the reference sheet writes it: per string, fret:finger. */
const sheet = (scale: ModalScale, n: number) => {
  const { notes } = modalPositions(scale)[n - 1];
  return [1, 2, 3, 4, 5, 6].map((s) =>
    notes
      .filter((note) => note.string === s)
      .map((note) => `${note.fret}:${note.finger}`)
      .join(' '),
  );
};

describe('modalPositions', () => {
  it('lays G major out as the reference sheet', () => {
    const g = major('G');
    // Ionian, finger 1 on fret 2.
    expect(sheet(g, 1)).toEqual([
      '2:1 3:2',
      '3:2 5:4',
      '2:1 4:3 5:4',
      '2:1 4:3 5:4',
      '2:1 3:2 5:4',
      '3:2 5:4',
    ]);
    // Dorian on A: the 5-fret shape, finger 1 at 4.
    expect(sheet(g, 2)).toEqual([
      '5:1',
      '5:1 7:3 8:4',
      '4:1 5:2 7:4',
      '4:1 5:2 7:4',
      '5:1 7:3',
      '5:2 7:3 8:4',
    ]);
    // Locrian on F♯: as low as it goes, finger 1 on fret 2 (not 14).
    expect(sheet(g, 7)).toEqual([
      '2:1',
      '3:2 5:4',
      '2:1 4:3 5:4',
      '2:1 4:3 5:4',
      '2:1 3:2 5:4',
      '2:1 3:2 5:4',
    ]);
  });

  it('numbers from the tonic and names the shapes in mode order', () => {
    expect(modalPositions(major('C')).map((p) => p.shapeMode)).toEqual(
      GUITAR_MODES,
    );
    const dorian = getGuitarCenter(centerId('D', 'dorian'));
    const positions = modalPositions({
      tonicPc: dorian.tonicPc,
      mode: 'dorian',
      spelling: dorian.spelling,
    });
    expect(positions.map((p) => p.shapeMode)).toEqual([
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
      'ionian',
    ]);
    expect(positions.map((p) => p.rootName)).toEqual(dorian.spelling);
  });

  it('keeps every position playable, in the scale, and complete', () => {
    for (const key of GUITAR_KEY_ORDER) {
      for (const mode of GUITAR_MODES) {
        const center = getGuitarCenter(
          mode === 'ionian' ? key : centerId(key, mode),
        );
        const scale: ModalScale = {
          tonicPc: center.tonicPc,
          mode,
          spelling: center.spelling,
        };
        for (const position of modalPositions(scale)) {
          const label = `${key} ${mode} position ${position.number}`;
          expect(position.firstFret, label).toBeGreaterThanOrEqual(1);
          expect(position.lastFret, label).toBeLessThanOrEqual(
            POSITIONS_LAST_FRET,
          );
          for (const note of position.notes) {
            expect(
              MODE_STEPS[mode],
              `${label}: ${note.fret} on ${note.string}`,
            ).toContain(mod12(note.midi - center.tonicPc));
            expect(note.name, label).not.toBe('');
          }
          expect(new Set(position.notes.map((n) => n.degree)).size).toBe(7);
          // Its root is on string 6 and its two e strings.
          const roots = position.notes.filter((n) => n.isShapeRoot);
          expect(
            roots.some((n) => n.string === 6),
            label,
          ).toBe(true);
          expect(
            roots.some((n) => n.string === 1),
            label,
          ).toBe(true);
        }
      }
    }
  });

  it('gives the Relative Modes page the same shapes as the key’s positions', () => {
    for (const key of GUITAR_KEY_ORDER) {
      const positions = modalPositions(major(key));
      GUITAR_MODES.forEach((mode, i) => {
        expect(positions[i].shapeMode).toBe(mode);
        expect(positions[i].rootName).toBe(keyScaleSpelling(key)[i]);
      });
    }
  });

  it('puts each position as close to the nut as finger 1 can go', () => {
    // C: Positions 5-7 (G Mixolydian, A Aeolian, B Locrian) sit below
    // Position 1; E Phrygian and F Lydian can't use the open strings.
    expect(modalPositions(major('C')).map((p) => p.firstFret)).toEqual([
      7, 9, 12, 12, 2, 4, 7,
    ]);
    for (const key of GUITAR_KEY_ORDER) {
      for (const position of modalPositions(major(key))) {
        expect(position.firstFret).toBeGreaterThanOrEqual(1);
        expect(position.firstFret).toBeLessThanOrEqual(12);
      }
    }
  });

  it('marks the scale’s tonic and the shape’s own root', () => {
    const [, dorian] = modalPositions(major('C'));
    expect(dorian.notes.filter((n) => n.isTonic).map((n) => n.name)).toEqual(
      expect.arrayContaining(['C']),
    );
    expect(
      new Set(dorian.notes.filter((n) => n.isShapeRoot).map((n) => n.name)),
    ).toEqual(new Set(['D']));
  });
});

describe('fretboardScaleNotes', () => {
  it('lists every scale tone from the open strings up', () => {
    const notes = fretboardScaleNotes(major('C'));
    expect(
      notes.every((n) => n.fret >= 0 && n.fret <= POSITIONS_LAST_FRET),
    ).toBe(true);
    const lowE = notes.filter((n) => n.string === 6);
    expect(lowE.slice(0, 4).map((n) => `${n.fret}${n.name}`)).toEqual([
      '0E',
      '1F',
      '3G',
      '5A',
    ]);
  });
});
