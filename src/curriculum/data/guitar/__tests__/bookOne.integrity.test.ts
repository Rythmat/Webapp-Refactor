/**
 * The Guitar Atlas Book One data, checked against music theory and against
 * the page-by-page extraction of the book it came from.
 *
 * Theory: every scale dot is in the key, every chord box sounds its chord with
 * the root lowest, every Music Map bar adds up to a bar of 4/4.
 * Provenance: wherever the data differs from what the book prints, the item
 * cites an erratum, and every erratum is written up in the errata doc.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHORDS } from '@prism/engine';
import {
  fretSpan,
  parseShape,
  shapeLowestMidi,
  shapeNotes,
  shapePitchClasses,
} from '@/lib/guitar/fretboard';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  keyPitchClass,
  keyScaleSpelling,
  mapLabel,
  mapProgressionText,
  toBookKey,
} from '../bookOne';
import { GUITAR_ATLAS_BOOK_ONE_ERRATA, getErratum } from '../bookOneErrata';
import { chordName, chordRootPc, getGuitarCenter } from '../centers';
import type {
  BookChordQuality,
  GuitarChordShape,
  GuitarKeyName,
  MusicMapRhythm,
  ScaleDegree,
} from '../types';

// ── Fixture ──────────────────────────────────────────────────────────────

interface FixtureShape {
  index: number;
  name: string;
  quality: string;
  frets: string[];
  barre: string;
  fingering: { finger: number; string: number; fret: number }[];
  isOctaveRepeat: boolean;
}
interface FixtureMap {
  exampleLabel: string;
  progressionText: string;
  chords: string[];
  chordShapesShown: string[];
  rhythmPerBar: string[][];
}
interface FixtureKey {
  key: string;
  triads: FixtureShape[];
  sevenths: FixtureShape[];
  musicMaps: FixtureMap[];
}

const fixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      'src/curriculum/data/guitar/__fixtures__/bookOne.extraction.json',
    ),
    'utf8',
  ),
) as { keys: FixtureKey[] };

const fixtureByKey = new Map(
  fixture.keys.map((k) => [k.key.replace(/ Major$/, ''), k]),
);

const errataDoc = readFileSync(
  resolve(process.cwd(), 'docs/guitar-atlas/book-one-errata.md'),
  'utf8',
);

// ── Theory tables ────────────────────────────────────────────────────────

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTATONIC = [0, 2, 4, 7, 9];
const TRIAD_QUALITIES: BookChordQuality[] = [
  'maj',
  'min',
  'min',
  'maj',
  'maj',
  'min',
  // Book One prints no diminished triad.
];
const SEVENTH_QUALITIES: BookChordQuality[] = [
  'maj7',
  'min7',
  'min7',
  'maj7',
  'dom7',
  'min7',
  'min7b5',
];
const ENGINE_QUALITY: Record<BookChordQuality, string> = {
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
const RHYTHM_TICKS: Record<MusicMapRhythm, number> = {
  whole: 1920,
  'dotted-half': 1440,
  half: 960,
  'dotted-quarter': 720,
  quarter: 480,
  eighth: 240,
  'half-rest': 960,
  'quarter-rest': 480,
  'eighth-rest': 240,
};

function chordPcs(rootPc: number, quality: BookChordQuality): number[] {
  return [
    ...new Set(CHORDS[ENGINE_QUALITY[quality]].map((i) => (rootPc + i) % 12)),
  ].sort((a, b) => a - b);
}

function normalizeName(name: string): string {
  return name
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixtureShapeString(frets: string[]): string {
  return frets.map((f) => (f === 'X' ? 'X' : String(Number(f)))).join('-');
}

function cites(ids: readonly string[] | undefined): boolean {
  return !!ids?.length && ids.every((id) => getErratum(id));
}

/** Every fretted note is under a finger or the barre, at the shape's fret. */
function expectFingeringCovers(shape: GuitarShapeDiagram, where: string) {
  const frets = parseShape(shape.frets);
  frets.forEach((fret, i) => {
    const string = 6 - i;
    if (fret === null || fret === 0) return;
    const fingered = shape.fingering.some(
      (f) => f.string === string && f.fret === fret,
    );
    const barred =
      !!shape.barre &&
      shape.barre.fret === fret &&
      string <= shape.barre.fromString &&
      string >= shape.barre.toString;
    expect(fingered || barred, `${where}: string ${string}`).toBe(true);
  });
  for (const f of shape.fingering) {
    expect(frets[6 - f.string], `${where}: finger ${f.finger}`).toBe(f.fret);
  }
  expect(fretSpan(shape.frets), where).toBeLessThanOrEqual(4);
}

function expectInDiagram(shape: GuitarShapeDiagram, where: string) {
  for (const fret of parseShape(shape.frets)) {
    if (fret === null || fret === 0) continue;
    expect(fret, where).toBeGreaterThanOrEqual(shape.diagramStartFret);
    expect(fret, where).toBeLessThanOrEqual(shape.diagramStartFret + 4);
  }
}

function expectSoundsChord(
  key: GuitarKeyName,
  degree: ScaleDegree,
  quality: BookChordQuality,
  frets: string,
  where: string,
) {
  const root = chordRootPc(getGuitarCenter(key), degree);
  expect(shapePitchClasses(frets), where).toEqual(chordPcs(root, quality));
  expect(shapeLowestMidi(frets) % 12, `${where}: root lowest`).toBe(root);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('The Guitar Atlas: Book One data', () => {
  it('has the twelve key centers in book order', () => {
    expect(Object.keys(GUITAR_ATLAS_BOOK_ONE)).toEqual([...GUITAR_KEY_ORDER]);
    expect(GUITAR_KEY_ORDER).toHaveLength(12);
    for (const key of GUITAR_KEY_ORDER) {
      expect(GUITAR_ATLAS_BOOK_ONE[key].key).toBe(key);
    }
  });

  it('maps enharmonic spellings to the book key', () => {
    expect(toBookKey('Gb')).toBe('F#');
    expect(toBookKey('C#')).toBe('Db');
    expect(toBookKey('G♯')).toBe('Ab');
    expect(toBookKey('D#')).toBe('Eb');
    expect(toBookKey('A#')).toBe('Bb');
    expect(toBookKey('F♯')).toBe('F#');
    expect(toBookKey('H')).toBeNull();
  });

  for (const key of GUITAR_KEY_ORDER) {
    describe(key, () => {
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      const raw = fixtureByKey.get(key)!;
      const tonic = keyPitchClass(key);

      it('spells the scale and pentatonic in the key', () => {
        const scale = keyScaleSpelling(key);
        expect(center.scaleNotes).toEqual(scale);
        expect(center.pentatonicNotes).toEqual(
          [0, 1, 2, 4, 5].map((i) => scale[i]),
        );
      });

      it('plays the major scale tonic to tonic on strings 6-4', () => {
        const { majorScale } = center;
        const midis = majorScale.playOrder.map(
          (p) => shapeNotes(fretsFor(p.string, p.fret))[0].midi,
        );
        expect(midis).toHaveLength(8);
        for (let i = 1; i < midis.length; i++) {
          expect(midis[i]).toBeGreaterThan(midis[i - 1]);
        }
        expect(midis[0] % 12).toBe(tonic);
        expect(midis[7]).toBe(midis[0] + 12);
        expect(new Set(midis.map((m) => (m - tonic + 12) % 12))).toEqual(
          new Set(MAJOR),
        );
        for (const p of majorScale.playOrder) {
          expect([6, 5, 4]).toContain(p.string);
          if (p.fret > 0) {
            expect(p.fret).toBeGreaterThanOrEqual(majorScale.fretStart);
            expect(p.fret).toBeLessThanOrEqual(majorScale.fretEnd);
          }
        }
        expect([...majorScale.unusedStrings].sort()).toEqual([1, 2, 3]);
      });

      it('plays the pentatonic tonic to tonic on strings 3-1', () => {
        const { pentatonic } = center;
        const midis = pentatonic.playOrder.map(
          (p) => shapeNotes(fretsFor(p.string, p.fret))[0].midi,
        );
        expect(midis).toHaveLength(6);
        for (let i = 1; i < midis.length; i++) {
          expect(midis[i]).toBeGreaterThan(midis[i - 1]);
        }
        expect(midis[0] % 12).toBe(tonic);
        expect(midis[5]).toBe(midis[0] + 12);
        expect(new Set(midis.map((m) => (m - tonic + 12) % 12))).toEqual(
          new Set(PENTATONIC),
        );
        for (const p of pentatonic.playOrder) {
          expect([3, 2, 1]).toContain(p.string);
        }
      });

      it('sounds every triad box as its chord, root lowest', () => {
        expect(center.triads.map((t) => t.degree)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(center.triads.map((t) => t.quality)).toEqual(TRIAD_QUALITIES);
        center.triads.forEach((t) => {
          const where = `${key} triad ${t.degree}`;
          expectSoundsChord(key, t.degree, t.quality, t.frets, where);
          expectFingeringCovers(t, where);
          expectInDiagram(t, where);
        });
      });

      it('sounds every 7th-chord box as its chord, root lowest', () => {
        expect(center.sevenths.map((s) => s.degree)).toEqual([
          1, 2, 3, 4, 5, 6, 7, 1,
        ]);
        expect(center.sevenths.map((s) => s.quality)).toEqual([
          ...SEVENTH_QUALITIES,
          'maj7',
        ]);
        center.sevenths.forEach((s, i) => {
          const where = `${key} 7th box ${i + 1}`;
          expectSoundsChord(key, s.degree, s.quality, s.frets, where);
          expectFingeringCovers(s, where);
          expectInDiagram(s, where);
        });
      });

      it('places the closing 7th box an octave up, or cites why not', () => {
        const first = center.sevenths[0];
        const last = center.sevenths[7];
        if (last.isOctaveRepeat) {
          expect(shapeLowestMidi(last.frets)).toBe(
            shapeLowestMidi(first.frets) + 12,
          );
        } else {
          expect(
            last.erratumIds?.some(
              (id) => getErratum(id)?.kind === 'octave-box',
            ),
          ).toBe(true);
        }
      });

      it('prints five Music Maps whose bars fill 4/4 and sound their chords', () => {
        expect(center.musicMaps.map((m) => m.example)).toEqual([1, 2, 3, 4, 5]);
        expect(center.musicMaps.map((m) => m.bars.length)).toEqual([
          1, 2, 2, 4, 4,
        ]);
        center.musicMaps.forEach((map) => {
          expect(map.repeat).toBe(true);
          map.bars.forEach((bar, b) => {
            const where = `${key} Example ${map.example} bar ${b + 1}`;
            const ticks = bar.rhythm.reduce((t, r) => t + RHYTHM_TICKS[r], 0);
            expect(ticks, where).toBe(1920);
            const diatonic =
              bar.quality === TRIAD_QUALITIES[bar.degree - 1] ||
              bar.quality === SEVENTH_QUALITIES[bar.degree - 1];
            expect(diatonic, where).toBe(true);
            if (map.example <= 3) {
              expect(bar.quality, where).toBe(TRIAD_QUALITIES[bar.degree - 1]);
            }
            expectSoundsChord(key, bar.degree, bar.quality, bar.frets, where);
            if (bar.fingering.length) expectFingeringCovers(bar, where);
            expectInDiagram(bar, where);
          });
        });
      });

      it('matches the book, or cites an erratum where it differs', () => {
        const compareShape = (
          shape: GuitarChordShape,
          printed: FixtureShape,
          where: string,
        ) => {
          const differs =
            shape.frets !== fixtureShapeString(printed.frets) ||
            !!shape.isOctaveRepeat !== printed.isOctaveRepeat ||
            JSON.stringify(
              [...shape.fingering]
                .map((f) => [f.finger, f.string, f.fret])
                .sort(),
            ) !==
              JSON.stringify(
                printed.fingering
                  .map((f) => [f.finger, f.string, f.fret])
                  .sort(),
              ) ||
            (!!shape.barre !== /^fret \d/.test(printed.barre) &&
              !printed.barre.startsWith('diagram draws'));
          if (differs) expect(cites(shape.erratumIds), where).toBe(true);

          const name = chordName(
            getGuitarCenter(key),
            shape.degree,
            shape.quality,
          );
          if (normalizeName(name) !== normalizeName(printed.name)) {
            expect(cites(shape.erratumIds), `${where} name`).toBe(true);
          }
        };
        center.triads.forEach((t, i) =>
          compareShape(t, raw.triads[i], `${key} triad ${i + 1}`),
        );
        center.sevenths.forEach((s, i) =>
          compareShape(s, raw.sevenths[i], `${key} 7th box ${i + 1}`),
        );

        center.musicMaps.forEach((map, m) => {
          const printed = raw.musicMaps[m];
          const where = `${key} Example ${map.example}`;
          expect(
            mapProgressionText(map).replace(/\s+/g, ''),
            `${where} progression`,
          ).toBe(normalizeName(printed.progressionText).replace(/\s+/g, ''));
          if (mapLabel(map) !== printed.exampleLabel) {
            const labelErratum = map.erratumIds
              ?.map(getErratum)
              .find((e) => e?.kind === 'example-label');
            expect(labelErratum?.asPrinted, where).toContain(
              printed.exampleLabel,
            );
          }
          map.bars.forEach((bar, b) => {
            const at = `${where} bar ${b + 1}`;
            if (bar.frets !== printed.chordShapesShown[b]) {
              expect(cites(map.erratumIds), at).toBe(true);
            }
            expect([...bar.rhythm], at).toEqual(printed.rhythmPerBar[b]);
            const name = chordName(
              getGuitarCenter(key),
              bar.degree,
              bar.quality,
            );
            if (normalizeName(name) !== normalizeName(printed.chords[b])) {
              const nameErratum = bar.erratumIds
                ?.map(getErratum)
                .find((e) => e?.kind === 'chord-name');
              expect(nameErratum?.asPrinted, at).toBe(printed.chords[b]);
            }
          });
        });
      });
    });
  }

  describe('errata', () => {
    const referenced = new Set<string>();
    for (const key of GUITAR_KEY_ORDER) {
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      for (const shape of [...center.triads, ...center.sevenths]) {
        shape.erratumIds?.forEach((id) => referenced.add(id));
      }
      for (const map of center.musicMaps) {
        map.erratumIds?.forEach((id) => referenced.add(id));
        for (const bar of map.bars) {
          bar.erratumIds?.forEach((id) => referenced.add(id));
        }
      }
    }

    it('has unique ids', () => {
      const ids = GUITAR_ATLAS_BOOK_ONE_ERRATA.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('cites only errata that exist', () => {
      for (const id of referenced) expect(getErratum(id), id).toBeDefined();
    });

    it('applies every correction the app claims to make', () => {
      for (const erratum of GUITAR_ATLAS_BOOK_ONE_ERRATA) {
        if (erratum.appDataChanged) {
          expect(referenced.has(erratum.id), erratum.id).toBe(true);
        }
      }
    });

    it('writes every erratum up in docs/guitar-atlas/book-one-errata.md', () => {
      for (const erratum of GUITAR_ATLAS_BOOK_ONE_ERRATA) {
        expect(errataDoc, erratum.id).toContain(erratum.id);
      }
    });
  });

  it('uses only chord qualities the Studio chord detector knows', () => {
    for (const quality of Object.values(ENGINE_QUALITY)) {
      expect(CHORDS[quality], quality).toBeDefined();
    }
  });
});

/** A one-note shape string for a fretboard position (string 6 first). */
function fretsFor(string: number, fret: number): string {
  return [6, 5, 4, 3, 2, 1]
    .map((s) => (s === string ? String(fret) : 'X'))
    .join('-');
}
