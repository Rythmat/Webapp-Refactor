import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  chordRootPc,
  mapBarShapeId,
  seventhShapeId,
  triadShapeId,
} from '@/curriculum/data/guitar/bookOne';
import {
  GUITAR_ATLAS_BOOK_ONE_ERRATA,
  type ErratumKind,
} from '@/curriculum/data/guitar/bookOneErrata';
import type {
  BookChordQuality,
  GuitarKeyName,
} from '@/curriculum/data/guitar/types';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { parseShape } from '@/lib/guitar/fretboard';
import type { BookShape, VoicingInfo } from '../types';
import {
  FAMILY_TEMPLATES,
  classifyVoicing,
  compareShapes,
  dropFamily,
  templateShape,
} from '../voicing';

interface Classified {
  id: string;
  shape: BookShape;
  voicing: VoicingInfo;
}

function classifyAll() {
  const pages: Classified[] = [];
  const bars: Classified[] = [];
  for (const key of GUITAR_KEY_ORDER) {
    const center = GUITAR_ATLAS_BOOK_ONE[key];
    const classify = (id: string, shape: BookShape) => ({
      id,
      shape,
      voicing: classifyVoicing(
        shape,
        chordRootPc(key, shape.degree),
        shape.quality,
      ),
    });
    center.triads.forEach((s, i) =>
      pages.push(classify(triadShapeId(key, i + 1), s)),
    );
    center.sevenths.forEach((s, i) =>
      pages.push(classify(seventhShapeId(key, i + 1), s)),
    );
    for (const map of center.musicMaps) {
      map.bars.forEach((b, i) =>
        bars.push(classify(mapBarShapeId(key, map.example, i + 1), b)),
      );
    }
  }
  return { pages, bars };
}

const isTriad = (c: Classified) =>
  c.shape.quality === 'maj' || c.shape.quality === 'min';

function counts(items: Classified[], by: (c: Classified) => string) {
  const out: Record<string, number> = {};
  for (const c of items) out[by(c)] = (out[by(c)] ?? 0) + 1;
  return out;
}

function templatesMatching(shape: BookShape) {
  const frets = parseShape(shape.frets);
  return FAMILY_TEMPLATES.filter((t) => {
    const rootFret = frets[6 - t.rootString];
    return rootFret !== null && templateShape(t, rootFret) === shape.frets;
  });
}

describe('dropFamily', () => {
  it('reads each signature in its table', () => {
    expect(dropFamily(['R', '3', '5', '7'])).toBe('close');
    expect(dropFamily(['R', '5', '7', '3'])).toBe('drop2');
    expect(dropFamily(['R', '7', '3', '5'])).toBe('drop3');
    expect(dropFamily(['R', '5', '3', '7'])).toBe('drop2and4');
    expect(dropFamily(['3', '5', 'R', '7'])).toBe('drop2and3');
  });

  it('needs four different chord tones', () => {
    expect(dropFamily(['R', '3', '5'])).toBeNull();
    expect(dropFamily(['R', '5', 'R', '3'])).toBeNull();
  });
});

describe('classifyVoicing on Book One', () => {
  const { pages, bars } = classifyAll();

  it('classifies every chord-page shape to the §2.4 table', () => {
    expect(pages).toHaveLength(168);
    expect(counts(pages.filter(isTriad), (c) => c.voicing.family)).toEqual({
      'open-chord': 24,
      'root5-four-string': 30,
      'root6-four-string': 13,
      'root6-full-barre': 4,
      'root4-four-string': 1,
    });
    const sevenths = pages.filter((c) => !isTriad(c));
    expect(counts(sevenths, (c) => c.voicing.family)).toEqual({
      drop2: 67,
      drop3: 27,
      'open-string-seventh': 2,
    });
    expect(
      counts(
        sevenths.filter((c) => c.voicing.family !== 'open-string-seventh'),
        (c) =>
          `${c.voicing.family} ${c.shape.quality} ${c.voicing.toneOrder.join('-')}`,
      ),
    ).toEqual({
      'drop2 maj7 R-5-7-3': 24,
      'drop2 dom7 R-5-b7-3': 8,
      'drop2 min7 R-5-b7-b3': 24,
      'drop2 min7b5 R-b5-b7-b3': 11,
      'drop3 maj7 R-7-3-5': 10,
      'drop3 dom7 R-b7-3-5': 4,
      'drop3 min7 R-b7-b3-5': 12,
      'drop3 min7b5 R-b7-b3-b5': 1,
    });
  });

  it('classifies every Music Map bar to the §2.4 table', () => {
    expect(bars).toHaveLength(156);
    expect(
      counts(bars, ({ voicing: v }) =>
        v.family === 'drop2' ? `drop2/${v.rootString}` : v.family,
      ),
    ).toEqual({
      'open-chord': 29,
      'root5-four-string': 29,
      'root6-four-string': 15,
      'root6-full-barre': 3,
      'root4-four-string': 1,
      'drop2/5': 53,
      'drop2/4': 1,
      drop3: 25,
    });
    // The one root-4 drop 2 is A Example 5's Dmaj7 on the open D string.
    const rootFour = bars.find(
      (c) => c.voicing.family === 'drop2' && c.voicing.rootString === 4,
    );
    expect(rootFour?.id).toBe('A/map/5/4');
    expect(rootFour?.shape.frets).toBe('X-X-0-2-2-2');
  });

  it('puts every shape in root position, drop 3 skipping string 5', () => {
    for (const c of [...pages, ...bars]) {
      expect(c.voicing.isRootPosition, c.id).toBe(true);
      expect(c.voicing.family, c.id).not.toBe('unclassified');
      if (c.voicing.family === 'drop3') {
        expect(c.voicing.skippedStrings, c.id).toEqual([5]);
        expect(c.voicing.stringSet, c.id).toBe('6-4-3-2');
      }
      if (c.voicing.family === 'drop2' || c.voicing.family === 'drop3') {
        expect(c.voicing.doubledTones, c.id).toEqual([]);
      }
    }
    expect(
      pages
        .filter((c) => c.voicing.family === 'open-string-seventh')
        .map((c) => c.id),
    ).toEqual(['E/seventh/1', 'F/seventh/1']);
  });

  it('matches every movable shape to exactly one template', () => {
    const movable = pages.filter((c) => c.voicing.movable);
    expect(movable.filter((c) => !isTriad(c))).toHaveLength(94);
    expect(movable.filter(isTriad)).toHaveLength(48);
    const movableBars = bars.filter((c) => c.voicing.movable);
    expect(movableBars).toHaveLength(126);
    for (const c of [...movable, ...movableBars]) {
      const matches = templatesMatching(c.shape);
      expect(matches, `${c.id} ${c.shape.frets}`).toHaveLength(1);
      expect(matches[0].family, c.id).toBe(c.voicing.family);
      expect(matches[0].quality, c.id).toBe(c.shape.quality);
    }
  });

  it('reports strings, doubling and barres', () => {
    const cmaj7 = classifyVoicing({ frets: 'X-3-5-4-5-X' }, 0, 'maj7');
    expect(cmaj7).toMatchObject({
      family: 'drop2',
      rootString: 5,
      stringSet: '5-4-3-2',
      toneOrder: ['R', '5', '7', '3'],
      distinctTones: 4,
      mutedStrings: [6, 1],
      skippedStrings: [],
      movable: true,
      barre: 'none',
    });
    const f = GUITAR_ATLAS_BOOK_ONE.F.triads[0];
    expect(classifyVoicing(f, 5, 'maj')).toMatchObject({
      family: 'root6-full-barre',
      doubledTones: ['R', '5'],
      barre: 'full',
    });
    const dm7 = GUITAR_ATLAS_BOOK_ONE.C.sevenths[1];
    expect(classifyVoicing(dm7, 2, 'min7').barre).toBe('partial');
    expect(classifyVoicing({ frets: 'X-3-5-3-4-X' }, 0, 'min').family).toBe(
      'unclassified',
    );
  });
});

describe('compareShapes', () => {
  it('builds the four kinds from the book grips at the same root', () => {
    const book = (key: GuitarKeyName, box: number) =>
      GUITAR_ATLAS_BOOK_ONE[key].sevenths[box - 1].frets;
    const shapes = compareShapes(5, 3);
    expect(shapes.map((s) => s.frets)).toEqual([
      book('C', 1),
      book('F', 5),
      book('Bb', 2),
      book('Db', 7),
    ]);
    expect(shapes.map((s) => s.quality)).toEqual([
      'maj7',
      'dom7',
      'min7',
      'min7b5',
    ]);
    expect(shapes.map((s) => s.moved)).toEqual([
      null,
      { string: 3, from: '7', to: 'b7' },
      { string: 2, from: '3', to: 'b3' },
      { string: 4, from: '5', to: 'b5' },
    ]);
  });

  it('moves a root at the nut up an octave', () => {
    expect(compareShapes(6, 0).map((s) => s.frets)).toEqual([
      '12-X-13-13-12-X',
      '12-X-12-13-12-X',
      '12-X-12-12-12-X',
      '12-X-12-12-11-X',
    ]);
    expect(compareShapes(6, 5)[3].frets).toBe('5-X-5-5-4-X');
  });
});

// ── Errata guard ─────────────────────────────────────────────────────────

interface FixtureShape {
  index: number;
  name: string;
  frets: string[];
}
interface FixtureKey {
  key: string;
  triads: FixtureShape[];
  sevenths: FixtureShape[];
  musicMaps: { chords: string[]; chordShapesShown: string[] }[];
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

/** A printed caption ('F# minor 7', 'B minor 7(♭5)') → root pc and quality. */
function parseCaption(name: string): {
  rootPc: number;
  quality: BookChordQuality;
} {
  const [root, ...rest] = name.replace(/♭/g, 'b').replace(/♯/g, '#').split(' ');
  const words = rest.join('').toLowerCase().replace(/[()]/g, '');
  const quality: BookChordQuality = words.includes('b5')
    ? 'min7b5'
    : words.includes('dominant7')
      ? 'dom7'
      : words.includes('major7')
        ? 'maj7'
        : words.includes('minor7')
          ? 'min7'
          : words.includes('minor')
            ? 'min'
            : 'maj';
  const rootPc = noteNameToPitchClass(root);
  if (rootPc === null) throw new Error(`Bad caption ${name}`);
  return { rootPc, quality };
}

function flagged(frets: string, name: string): boolean {
  const { rootPc, quality } = parseCaption(name);
  const voicing = classifyVoicing({ frets }, rootPc, quality);
  return voicing.family === 'unclassified' || !voicing.isRootPosition;
}

const SHAPE_ERRATA: ErratumKind[] = ['chord-shape', 'chord-name', 'fret-label'];

describe('classifier as an errata guard', () => {
  it('flags exactly the logged shape and chord-name errata in the uncorrected book', () => {
    const hits: string[] = [];
    for (const k of fixture.keys) {
      const key = k.key.replace(/ Major$/, '') as GuitarKeyName;
      const frets = (f: string[]) =>
        f.map((x) => (x === 'X' ? 'X' : String(Number(x)))).join('-');
      for (const s of k.triads) {
        if (flagged(frets(s.frets), s.name))
          hits.push(triadShapeId(key, s.index));
      }
      for (const s of k.sevenths) {
        if (flagged(frets(s.frets), s.name))
          hits.push(seventhShapeId(key, s.index));
      }
      k.musicMaps.forEach((m, mi) =>
        m.chords.forEach((name, bi) => {
          if (flagged(m.chordShapesShown[bi], name)) {
            hits.push(mapBarShapeId(key, mi + 1, bi + 1));
          }
        }),
      );
    }

    // The items the app data corrects with a shape, name or fret-label erratum.
    const shapeErrata = new Set(
      GUITAR_ATLAS_BOOK_ONE_ERRATA.filter((e) =>
        SHAPE_ERRATA.includes(e.kind),
      ).map((e) => e.id),
    );
    const cites = (ids?: readonly string[]) =>
      !!ids?.some((id) => shapeErrata.has(id));
    const corrected: string[] = [];
    for (const key of GUITAR_KEY_ORDER) {
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      center.triads.forEach((s, i) => {
        if (cites(s.erratumIds)) corrected.push(triadShapeId(key, i + 1));
      });
      center.sevenths.forEach((s, i) => {
        if (cites(s.erratumIds)) corrected.push(seventhShapeId(key, i + 1));
      });
      for (const map of center.musicMaps) {
        map.bars.forEach((b, i) => {
          if (cites(map.erratumIds) || cites(b.erratumIds)) {
            corrected.push(mapBarShapeId(key, map.example, i + 1));
          }
        });
      }
    }

    expect(hits.sort()).toEqual(corrected.sort());
    expect(hits.sort()).toEqual(
      [
        'Ab/seventh/6',
        'Bb/triad/2',
        'Eb/triad/6',
        'Db/map/1/1',
        'Db/map/2/1',
        'Db/map/2/2',
        'Db/map/3/1',
        'Db/map/3/2',
        'Eb/map/3/1',
        'Eb/map/3/2',
        'A/map/3/2',
        'A/map/4/4',
        'E/map/5/2',
        'Ab/map/5/3',
      ].sort(),
    );
  });
});
