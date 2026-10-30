import { describe, expect, it } from 'vitest';
import { keyPitchClass } from '@/curriculum/data/guitar/bookOne';
import { GUITAR_THEORY_CATALOG } from '@/curriculum/data/guitar/theoryCatalog';
import type {
  GuitarCenterId,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import { fretToMidi } from '@/lib/guitar/fretboard';
import { BASS } from '@/lib/guitar/instrument';
import type { FretPosition } from '@/lib/guitar/types';
import {
  arpeggioPlayOrder,
  bassPentatonicBox,
  bassScaleBox,
  fretOf,
  getBassCenter,
  homeOf,
  LIVE_BASS_FAMILIES,
  BASS_THEORY_CATALOG,
} from '..';
import {
  ARPEGGIO_SHAPES,
  CANVA_C,
  PENTATONIC_ON_E_KEYS,
  SCALE_SHAPES,
  type ShapeNote,
} from '../__fixtures__/bassAtlasShapes';

const KEYS: readonly GuitarKeyName[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];
const NAMES = ['G', 'D', 'A', 'E'];

const spell = (ps: readonly FretPosition[]) =>
  ps.map((p) => `${NAMES[p.string - 1]}${p.fret}`).join(' ');

/** A play order as the fixture writes it: relative to its first note. */
const relative = (ps: readonly FretPosition[]): ShapeNote[] =>
  ps.map((p) => [p.string as 1 | 2 | 3 | 4, p.fret - ps[0].fret]);

describe('The Bass Atlas: the book shapes in every key', () => {
  it.each(KEYS)('%s major scale is the Ionian box', (key) => {
    const box = bassScaleBox(keyPitchClass(key), MAJOR);
    expect(relative(box.playOrder)).toEqual(SCALE_SHAPES.ionian.notes);
  });

  it.each(KEYS)('%s pentatonic is the book box for its home string', (key) => {
    const pc = keyPitchClass(key);
    const box = bassPentatonicBox(pc, MAJOR_PENTATONIC);
    const onE = (PENTATONIC_ON_E_KEYS as readonly string[]).includes(key);
    expect(homeOf(pc).string).toBe(onE ? 4 : 3);
    expect(relative(box.playOrder)).toEqual(
      (onE ? SCALE_SHAPES.pentatonicFromE : SCALE_SHAPES.pentatonicFromA).notes,
    );
  });

  for (const shape of ARPEGGIO_SHAPES) {
    it(`${shape.png} in all 12 keys`, () => {
      for (const key of KEYS) {
        const pc = keyPitchClass(key);
        const playOrder = arpeggioPlayOrder(pc, shape.quality, {
          string: shape.rootString,
          fret: fretOf(pc, shape.rootString),
        });
        expect(relative(playOrder), key).toEqual(shape.notes);
      }
    });
  }
});

describe('The Bass Atlas: the Canva C pages', () => {
  const c = getBassCenter('C');

  it('draws the scale and pentatonic where the book does', () => {
    expect(spell(c.scale.playOrder)).toBe(CANVA_C.scale);
    expect([c.scale.fretStart, c.scale.fretEnd]).toEqual([7, 11]);
    expect(spell(c.pentatonics[0].playOrder)).toBe(CANVA_C.pentatonic);
  });

  it('draws the triad arpeggios where the book does', () => {
    expect(c.triads.map((a) => spell(a.playOrder))).toEqual(CANVA_C.triads);
    expect(c.triads.map((a) => a.fretStart)).toEqual([1, 5, 7, 7, 1, 5]);
  });

  it('draws the 7th arpeggios where the book does, V7 as a G7', () => {
    for (const [n, spelled] of Object.entries(CANVA_C.sevenths)) {
      expect(spell(c.sevenths[Number(n) - 1].playOrder), `box ${n}`).toBe(
        spelled,
      );
    }
    expect(spell(c.sevenths[4].playOrder)).toBe('E3 A2 A5 D3');
    expect(c.sevenths[7].isOctaveRepeat).toBe(true);
  });

  it('plays the Music Maps with the same boxes', () => {
    const [ex1, ex2] = c.musicMaps;
    expect(spell(ex1.bars[0].arpeggio.playOrder)).toBe('A3 D2 D5');
    expect(ex2.bars.map((b) => spell(b.arpeggio.playOrder))).toEqual([
      'A3 D2 D5',
      'A8 D7 D10',
    ]);
  });
});

describe('every bass center', () => {
  const ids: GuitarCenterId[] = KEYS.flatMap((key) =>
    GUITAR_THEORY_CATALOG.map(
      (e) => (e.key === 'ionian' ? key : `${key}:${e.key}`) as GuitarCenterId,
    ),
  );

  it('builds for every Theory scale in every key', () => {
    expect(ids).toHaveLength(12 * GUITAR_THEORY_CATALOG.length);
    for (const id of ids) expect(() => getBassCenter(id), id).not.toThrow();
  });

  it('sounds what the theory says, inside the bass, in hand-sized boxes', () => {
    for (const id of ids) {
      const c = getBassCenter(id);
      const boxes = [
        c.scale,
        ...c.pentatonics,
        ...c.triads,
        ...c.sevenths,
        ...c.chords,
        ...c.musicMaps.flatMap((m) => m.bars.map((b) => b.arpeggio)),
      ];
      for (const box of boxes) {
        const midis = box.playOrder.map((p) => fretToMidi(p, BASS));
        expect(Math.min(...midis), id).toBeGreaterThanOrEqual(28);
        expect(Math.max(...midis), id).toBeLessThanOrEqual(62);
        // Ascending: a box is played low to high.
        expect(midis, id).toEqual([...midis].sort((a, b) => a - b));
        const fretted = box.playOrder.filter((p) => p.fret > 0);
        const frets = fretted.map((p) => p.fret);
        // Four frets; a double harmonic scale needs one fret's stretch.
        const reach =
          box === c.scale && c.theory.family === 'double-harmonic' ? 5 : 4;
        expect(Math.max(...frets) - Math.min(...frets), id).toBeLessThanOrEqual(
          reach,
        );
      }
      // The scale's notes are the center's scale, tonic to tonic.
      const pcs = c.scale.playOrder.map((p) => fretToMidi(p, BASS) % 12);
      expect(new Set(pcs), id).toEqual(
        new Set(c.theory.steps.map((s) => (c.theory.tonicPc + s) % 12)),
      );
      for (const a of [...c.triads, ...c.sevenths]) {
        expect(fretToMidi(a.playOrder[0], BASS) % 12, id).toBe(a.rootPc);
      }
    }
  });
});

describe('the bass Theory catalog', () => {
  it('teaches every tile guitar does, under its own progress ids', () => {
    expect(BASS_THEORY_CATALOG.map((e) => e.slug)).toEqual(
      GUITAR_THEORY_CATALOG.map((e) => e.slug),
    );
    const genres = BASS_THEORY_CATALOG.map((e) => e.genre);
    expect(new Set(genres).size).toBe(genres.length);
    expect(genres.every((g) => g.startsWith('bass-'))).toBe(true);
    expect(BASS_THEORY_CATALOG[0].genre).toBe('bass-mode-ionian');
    expect(LIVE_BASS_FAMILIES.size).toBe(6);
  });
});
