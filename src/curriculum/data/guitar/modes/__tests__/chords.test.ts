import { describe, expect, it } from 'vitest';
import {
  formatNoteName,
  spellScale,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { TETRADS, TRIADS } from '@/daw/prism-engine/data/modes';
import {
  chordPcs,
  identifyChordFromPitchClasses,
} from '@/learn/audio/guitar/chordIdentity';
import { shapeNotes, shapePitchClasses } from '@/lib/guitar/fretboard';
import { classifyVoicing } from '@/lib/guitar/theory';
import {
  GUITAR_MODES,
  diminishedTriadShape,
  isGuitarModalMode,
  parentKeyOf,
} from '..';
import { GUITAR_ATLAS_BOOK_ONE, GUITAR_KEY_ORDER } from '../../bookOne';
import {
  centerId,
  chordRootPc,
  diatonicSevenths,
  diatonicTriads,
  getGuitarCenter,
} from '../../centers';
import type { BookChordQuality, ScaleDegree } from '../../types';

const DETECTOR: Record<BookChordQuality, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  majb5: 'majorb5',
  sus2b5: 'sus2b5',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  min7b5: 'minor7b5',
  dim7: 'diminished7',
  minMaj7: 'minormajor7',
  'maj7#5': 'major7#5',
  dom7b5: 'dominant7b5',
  min6: 'minor6',
  sus2b5add6: 'sus2b5add6',
};
const MODAL = GUITAR_MODES.filter(isGuitarModalMode);
const sorted = (pcs: Iterable<number>) =>
  [...new Set(pcs)].sort((a, b) => a - b);

describe('mode chords', () => {
  it('finds the parent key', () => {
    expect(parentKeyOf(2, 'dorian')).toBe('C');
    expect(parentKeyOf(4, 'phrygian')).toBe('C');
    expect(parentKeyOf(5, 'lydian')).toBe('C');
    expect(parentKeyOf(7, 'mixolydian')).toBe('C');
    expect(parentKeyOf(9, 'aeolian')).toBe('C');
    expect(parentKeyOf(11, 'locrian')).toBe('C');
    expect(parentKeyOf(1, 'locrian')).toBe('D');
  });

  it.each(Array.from({ length: 12 }, (_, pc) => pc))(
    'draws a playable diminished triad on pitch class %i',
    (rootPc) => {
      const shape = diminishedTriadShape(rootPc, 7);
      const notes = shapeNotes(shape.frets);
      expect(notes[0].midi % 12).toBe(rootPc);
      expect(sorted(shapePitchClasses(shape.frets))).toEqual(
        sorted(chordPcs(rootPc, 'diminished')),
      );
      expect(
        identifyChordFromPitchClasses(shapePitchClasses(shape.frets), rootPc),
      ).toEqual({ rootPc, quality: 'diminished' });
      // Every fretted note has a finger, on its own string and fret.
      for (const { position } of notes) {
        if (position.fret === 0) continue;
        expect(shape.fingering).toContainEqual(
          expect.objectContaining(position),
        );
      }
      expect(classifyVoicing(shape, rootPc, 'dim').isRootPosition).toBe(true);
    },
  );

  for (const mode of MODAL) {
    it(`takes ${mode}'s chords from the parent key in every key`, () => {
      for (const key of GUITAR_KEY_ORDER) {
        const center = getGuitarCenter(centerId(key, mode));
        const scale = new Set(
          center.steps.map((s) => (center.tonicPc + s) % 12),
        );
        expect(center.triads.map((t) => DETECTOR[t.quality])).toEqual(
          TRIADS[mode],
        );
        expect(diatonicTriads(center).map((q) => DETECTOR[q])).toEqual(
          TRIADS[mode],
        );
        expect(
          center.sevenths.slice(0, 7).map((t) => DETECTOR[t.quality]),
        ).toEqual(TETRADS[mode]);
        expect(diatonicSevenths(center).map((q) => DETECTOR[q])).toEqual(
          TETRADS[mode],
        );
        expect(center.sevenths[7]).toEqual(center.sevenths[0]);
        for (const shape of [...center.triads, ...center.sevenths]) {
          const rootPc = chordRootPc(center, shape.degree as ScaleDegree);
          const pcs = shapePitchClasses(shape.frets);
          expect(pcs.every((pc) => scale.has(pc))).toBe(true);
          expect(sorted(pcs)).toEqual(
            sorted(chordPcs(rootPc, DETECTOR[shape.quality])),
          );
          expect(shapeNotes(shape.frets)[0].midi % 12).toBe(rootPc);
        }
        // Every shape but the diminished triad is Book One's own.
        if (center.family !== 'diatonic') throw new Error('Not a mode');
        const parent = GUITAR_ATLAS_BOOK_ONE[center.parentKey];
        for (const shape of center.triads) {
          if (shape.quality === 'dim') continue;
          expect(parent.triads.map((t) => t.frets)).toContain(shape.frets);
        }
      }
    });

    it(`spells ${mode} as piano does`, () => {
      for (const key of GUITAR_KEY_ORDER) {
        const center = getGuitarCenter(centerId(key, mode));
        expect(center.spelling).toEqual(
          spellScale(key, [...center.steps])!.map((n) =>
            formatNoteName(n, 'ascii'),
          ),
        );
      }
    });
  }

  it('spells D♭ Locrian with double flats, as piano does', () => {
    expect(getGuitarCenter('Db:locrian').spelling).toEqual([
      'Db',
      'Ebb',
      'Fb',
      'Gb',
      'Abb',
      'Bbb',
      'Cb',
    ]);
  });

  it('builds Music Maps from the mode’s own chords', () => {
    for (const mode of MODAL) {
      for (const key of GUITAR_KEY_ORDER) {
        const center = getGuitarCenter(centerId(key, mode));
        const book = GUITAR_ATLAS_BOOK_ONE[key].musicMaps;
        expect(center.musicMaps.map((m) => m.bars.length)).toEqual(
          book.map((m) => m.bars.length),
        );
        center.musicMaps.forEach((map, i) => {
          const chords = map.example <= 3 ? center.triads : center.sevenths;
          map.bars.forEach((bar, b) => {
            expect(bar.frets).toBe(chords[bar.degree - 1].frets);
            expect(bar.rhythm).toEqual(book[i].bars[b].rhythm);
            // Only Locrian's home chord is diminished.
            if (bar.quality === 'dim') {
              expect([mode, bar.degree]).toEqual(['locrian', 1]);
            }
          });
        });
      }
    }
  });
});
