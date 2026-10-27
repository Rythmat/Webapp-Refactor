import { describe, expect, it } from 'vitest';
import {
  GUITAR_KEY_ORDER,
  MAJOR_SCALE_STEPS,
  keyPitchClass,
} from '@/curriculum/data/guitar/bookOne';
import {
  centerId,
  chordRootPc,
  getGuitarCenter,
  getGuitarShape,
  triadShapeId,
} from '@/curriculum/data/guitar/centers';
import { GUITAR_THEORY_CATALOG } from '@/curriculum/data/guitar/theoryCatalog';
import type {
  BookChordQuality,
  GuitarKeyName,
  GuitarScaleKey,
} from '@/curriculum/data/guitar/types';
import { fretToMidi, shapePitchClasses } from '@/lib/guitar/fretboard';
import { UKULELE } from '@/lib/guitar/instrument';
import { chordSemitones } from '@/lib/guitar/theory/chordTones';
import type { FretPosition } from '@/lib/guitar/types';
import {
  UKULELE_ATLAS_BOOK_ONE,
  UKULELE_ATLAS_BOOK_ONE_ERRATA,
  UKULELE_THEORY_CATALOG,
  getUkuleleCenter,
  searchUkuleleGrips,
  ukuleleFingering,
  ukuleleGrip,
  ukuleleGripProblems,
  ukuleleHandProblems,
  ukuleleShape,
} from '..';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const pcsOf = (rootPc: number, quality: BookChordQuality) =>
  [...new Set(chordSemitones(quality).map((s) => mod12(rootPc + s)))].sort(
    (a, b) => a - b,
  );

// The boxes as the PRINT PDF draws them (pages 3, 7, 11, 15, 23, 27, 39,
// 43), string letter + fret, low to high.
const BOOK_BOXES: Partial<
  Record<GuitarKeyName, { major: string; pentatonic: string }>
> = {
  C: { major: 'C0 C2 E0 E1 E3 A0 A2 A3', pentatonic: 'C0 C2 E0 E3 A0 A3' },
  G: {
    major: 'C7 C9 E7 E8 E10 A7 A9 A10',
    pentatonic: 'C7 C9 E7 E10 A7 A10',
  },
  D: { major: 'C2 C4 E2 E3 E5 A2 A4 A5', pentatonic: 'C2 C4 E2 E5 A2 A5' },
  A: {
    major: 'C9 C11 E9 E10 E12 A9 A11 A12',
    pentatonic: 'C9 C11 E9 E12 A9 A12',
  },
  B: { major: 'C6 C8 E6 E7 E9 A6 A7 A9', pentatonic: 'C6 C8 E7 E9 A6 A9' },
  'F#': {
    major: 'C6 C8 E6 E7 E9 A6 A8 A9',
    pentatonic: 'C6 C8 E6 E9 A6 A9',
  },
  Eb: { major: 'C3 C5 E3 E4 E6 A3 A5 A6', pentatonic: 'C3 C5 E3 E6 A3 A6' },
  Bb: { major: 'C5 C7 E5 E6 E8 A5 A6 A8', pentatonic: 'C5 C7 E6 E8 A5 A8' },
};

const LETTER: Record<number, string> = { 4: 'G', 3: 'C', 2: 'E', 1: 'A' };
const spell = (positions: readonly FretPosition[]) =>
  positions.map((p) => `${LETTER[p.string]}${p.fret}`).join(' ');

describe('The Ukulele Atlas: Book One', () => {
  it('prints six triads per key that sound their chords (after errata)', () => {
    const qualities: BookChordQuality[] = [
      'maj',
      'min',
      'min',
      'maj',
      'maj',
      'min',
    ];
    for (const key of GUITAR_KEY_ORDER) {
      const tonic = keyPitchClass(key);
      UKULELE_ATLAS_BOOK_ONE[key].triads.forEach((frets, i) => {
        const root = mod12(tonic + MAJOR_SCALE_STEPS[i]);
        expect(shapePitchClasses(frets, UKULELE), `${key} ${i + 1}`).toEqual(
          pcsOf(root, qualities[i]),
        );
        expect(
          ukuleleHandProblems(ukuleleShape(frets)),
          `${key} ${i + 1} ${frets}`,
        ).toEqual([]);
      });
    }
  });

  it('cites every erratum it applies', () => {
    const ids = new Set(UKULELE_ATLAS_BOOK_ONE_ERRATA.map((e) => e.id));
    for (const key of GUITAR_KEY_ORDER) {
      for (const id of Object.values(
        UKULELE_ATLAS_BOOK_ONE[key].triadErrata ?? {},
      )) {
        expect(ids.has(id!)).toBe(true);
      }
    }
    expect(getUkuleleCenter('C').triads[5].erratumIds).toEqual([
      'C-triad-6-am-caption',
    ]);
  });

  it('draws the scale boxes the book draws', () => {
    for (const [key, boxes] of Object.entries(BOOK_BOXES)) {
      const center = getUkuleleCenter(key as GuitarKeyName);
      expect(spell(center.majorScale.playOrder), key).toBe(boxes!.major);
      expect(spell(center.pentatonic.playOrder), key).toBe(boxes!.pentatonic);
      expect(center.majorScale.fretStart).toBe(
        UKULELE_ATLAS_BOOK_ONE[key as GuitarKeyName].scaleFretStart,
      );
      expect(center.majorScale.unusedStrings).toEqual([4]);
    }
  });

  it('plays each key page’s triads, in Music Maps 1-3 too', () => {
    for (const key of GUITAR_KEY_ORDER) {
      const center = getUkuleleCenter(key);
      expect(center.triads.slice(0, 6).map((t) => t.frets)).toEqual([
        ...UKULELE_ATLAS_BOOK_ONE[key].triads,
      ]);
      for (const map of center.musicMaps.slice(0, 3)) {
        for (const bar of map.bars) {
          expect(bar.frets).toBe(
            UKULELE_ATLAS_BOOK_ONE[key].triads[bar.degree - 1],
          );
        }
      }
      // Maps 1-3 are Guitar Atlas Book One's: same progressions, rhythms.
      const guitar = getGuitarCenter(key);
      expect(
        center.musicMaps.map((m) =>
          m.bars.map((b) => [b.degree, b.quality, b.rhythm]),
        ),
      ).toEqual(
        guitar.musicMaps.map((m) =>
          m.bars.map((b) => [b.degree, b.quality, b.rhythm]),
        ),
      );
    }
  });
});

describe('ukulele fingering', () => {
  const fingers = (frets: string) => {
    const { fingering, barre } = ukuleleFingering(frets);
    return {
      fingers: fingering
        .map((f) => `${LETTER[f.string]}${f.fret}:${f.finger}`)
        .sort()
        .join(' '),
      barre: barre ? `${barre.fret}:${barre.fromString}-${barre.toString}` : '',
    };
  };

  it('matches the book’s hand graphics', () => {
    // C page: D minor "1 2 2", G major "2 2 3".
    expect(fingers('2-2-1-0')).toEqual({
      fingers: 'C2:3 E1:1 G2:2',
      barre: '',
    });
    expect(fingers('0-2-3-2')).toEqual({
      fingers: 'A2:2 C2:1 E3:3',
      barre: '',
    });
    // G page: D major, index barre at 2 and the pinky on 5.
    expect(fingers('2-2-2-5')).toEqual({
      fingers: 'A5:4 C2:1 E2:1 G2:1',
      barre: '2:4-2',
    });
    // B page: B major, index barre over E and A.
    expect(fingers('4-3-2-2')).toEqual({
      fingers: 'A2:1 C3:2 E2:1 G4:3',
      barre: '2:2-1',
    });
    // D♭ page: A♭ "3 3 4 5" and G♭ "1 1 2 3", four fingers, no barre.
    expect(fingers('5-3-4-3')).toEqual({
      fingers: 'A3:2 C3:1 E4:3 G5:4',
      barre: '',
    });
    expect(fingers('3-1-2-1')).toEqual({
      fingers: 'A1:2 C1:1 E2:3 G3:4',
      barre: '',
    });
  });
});

describe('ukulele grips', () => {
  it('finds the chord-chart grips', () => {
    const chart: [number, BookChordQuality, string][] = [
      [0, 'dom7', '0-0-0-1'],
      [0, 'maj7', '0-0-0-2'],
      [0, 'min7', '3-3-3-3'],
      [0, 'dim7', '2-3-2-3'],
      [0, 'aug', '1-0-0-3'],
      [0, 'min7b5', '3-3-2-3'],
      [7, 'dom7', '0-2-1-2'],
      [2, 'dom7', '2-2-2-3'],
      [4, 'dom7', '1-2-0-2'],
      [9, 'dom7', '0-1-0-0'],
      [9, 'min7', '0-0-0-0'],
      [2, 'min7', '2-2-1-3'],
      [4, 'min7', '0-2-0-2'],
      [5, 'dom7', '2-3-1-3'],
      [10, 'dom7', '1-2-1-1'],
      [11, 'min7b5', '2-2-1-2'],
    ];
    for (const [root, quality, frets] of chart) {
      expect(ukuleleGrip(root, quality).shape.frets, `${root} ${quality}`).toBe(
        frets,
      );
    }
  });

  it('has a grip for every root and quality, each passing the gate', () => {
    const qualities = Object.keys({
      maj: 1,
      min: 1,
      dim: 1,
      aug: 1,
      majb5: 1,
      sus2b5: 1,
      maj7: 1,
      min7: 1,
      dom7: 1,
      min7b5: 1,
      dim7: 1,
      minMaj7: 1,
      'maj7#5': 1,
      dom7b5: 1,
      min6: 1,
      sus2b5add6: 1,
    }) as BookChordQuality[];
    for (const quality of qualities) {
      for (let root = 0; root < 12; root++) {
        const shape = searchUkuleleGrips(root, quality)[0];
        expect(shape, `${root} ${quality}`).toBeDefined();
        expect(ukuleleGripProblems(shape, root, quality)).toEqual([]);
      }
    }
  });
});

describe('ukulele centers for every Theory scale', () => {
  it('builds every catalog scale in 12 keys, all boxes complete', () => {
    expect(UKULELE_THEORY_CATALOG.length).toBe(GUITAR_THEORY_CATALOG.length);
    for (const entry of UKULELE_THEORY_CATALOG) {
      for (const key of GUITAR_KEY_ORDER) {
        const id = centerId(key, entry.key as GuitarScaleKey);
        const center = getUkuleleCenter(id);
        const label = `${id}`;
        expect(center.instrument).toBe('ukulele');
        // Every scale note in the box, on the C/E/A strings, ≤ 5 frets.
        const pcs = new Set(center.steps.map((s) => mod12(center.tonicPc + s)));
        const box = center.majorScale.playOrder;
        const boxPcs = new Set(box.map((p) => mod12(fretToMidi(p, UKULELE))));
        expect(
          [...pcs].every((pc) => boxPcs.has(pc)),
          label,
        ).toBe(true);
        expect(
          [...boxPcs].every((pc) => pcs.has(pc)),
          label,
        ).toBe(true);
        const frets = box.map((p) => p.fret);
        expect(
          Math.max(...frets) - Math.min(...frets),
          label,
        ).toBeLessThanOrEqual(4);
        expect(
          box.every((p) => p.string !== 4),
          label,
        ).toBe(true);
        // Every chord shape sounds its chord and fits a hand.
        const shapes = [
          ...center.triads,
          ...center.sevenths,
          ...(center.family === 'diatonic' ? [] : center.chords),
        ];
        for (const s of shapes) {
          expect(
            ukuleleGripProblems(s, chordRootPc(center, s.degree), s.quality),
            `${label} ${s.degree} ${s.quality} ${s.frets}`,
          ).toEqual([]);
        }
        for (const map of center.musicMaps) {
          for (const bar of map.bars) {
            expect(
              ukuleleGripProblems(
                bar,
                chordRootPc(center, bar.degree),
                bar.quality,
              ),
              `${label} map ${map.example}`,
            ).toEqual([]);
          }
        }
      }
    }
  });

  it('keeps ukulele shape ids apart from guitar’s', () => {
    const center = getUkuleleCenter('C');
    const id = triadShapeId(center, 1);
    expect(id).toBe('ukulele:C/triad/1');
    expect(getGuitarShape(id)?.frets).toBe('0-0-0-3');
    expect(getGuitarShape('C/triad/1')?.frets).toBe('X-3-2-0-1-0');
  });

  it('keeps guitar centers untouched', () => {
    expect(getGuitarCenter('C').instrument).toBeUndefined();
    expect(getGuitarCenter('C').triads[0].frets).toBe('X-3-2-0-1-0');
  });

  it('pins the 12 Ionian centers', () => {
    const summary = GUITAR_KEY_ORDER.map((key) => {
      const c = getUkuleleCenter(key);
      return {
        key,
        major: spell(c.majorScale.playOrder),
        pentatonic: spell(c.pentatonic.playOrder),
        triads: c.triads.map((t) => t.frets).join(' '),
        sevenths: c.sevenths.map((t) => t.frets).join(' '),
        maps: c.musicMaps
          .map((m) => m.bars.map((b) => b.frets).join('|'))
          .join('  '),
      };
    });
    expect(summary).toMatchSnapshot();
  });
});
