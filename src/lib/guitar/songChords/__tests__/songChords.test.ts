import { describe, expect, it } from 'vitest';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { GUITAR_STANDARD_TUNING, shapeNotes } from '@/lib/guitar/fretboard';
import {
  OPEN_SHAPES,
  OPEN_SLASH_SHAPES,
  SLASH_TEMPLATES,
  SONG_QUALITIES,
  SONG_TEMPLATES,
  parseSongChord,
  resolveSongChords,
  shapeFromGrip,
  shapeFromText,
  songShapeProblems,
  songToneLabel,
  type SongChord,
  type SongChordQuality,
} from '..';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const pc = (name: string) => noteNameToPitchClass(name)!;

function chord(
  root: string,
  quality: SongChordQuality,
  bass: string | null = null,
): SongChord {
  return {
    rootPc: pc(root),
    rootName: root,
    quality,
    bassPc: bass ? pc(bass) : null,
    bassName: bass,
  };
}

describe('parseSongChord', () => {
  it('reads the library’s spellings', () => {
    const read = (name: string) => {
      const c = parseSongChord(name);
      return c && c !== 'noChord' ? [c.rootPc, c.quality, c.bassPc] : c;
    };
    expect(read('G♯min7')).toEqual([8, 'min7', null]);
    expect(read('B/F♯')).toEqual([11, 'maj', 6]);
    expect(read('F sus7')).toEqual([5, 'dom7sus4', null]);
    expect(read('G min7/B♭')).toEqual([7, 'min7', 10]);
    expect(read('F7(no 3)')).toEqual([5, 'dom7no3', null]);
    expect(read('B♭(♯5)')).toEqual([10, 'aug', null]);
    expect(read('C alt7')).toEqual([0, 'dom7alt', null]);
    expect(read('Dmin7b5/G')).toEqual([2, 'min7b5', 7]);
    expect(read('A7b9')).toEqual([9, 'dom7b9', null]);
    expect(read('C♯7(♭9)')).toEqual([1, 'dom7b9', null]);
    expect(read('E7(♯9)')).toEqual([4, 'dom7#9', null]);
    expect(read('Dadd2')).toEqual([2, 'add9', null]);
    expect(read('E♯dim7')).toEqual([5, 'dim7', null]);
    expect(read('C♭')).toEqual([11, 'maj', null]);
    expect(read('Bb7')).toEqual([10, 'dom7', null]);
    expect(read('C#m7')).toEqual([1, 'min7', null]);
    // A bass that is the root is no slash chord.
    expect(read('C/C')).toEqual([0, 'maj', null]);
  });

  it('knows no-chord bars and refuses what it can’t read', () => {
    expect(parseSongChord('N.C.')).toBe('noChord');
    expect(parseSongChord('F♯C♯min7')).toBeNull();
    expect(parseSongChord('AG♯min7')).toBeNull();
    expect(parseSongChord('')).toBeNull();
    expect(parseSongChord('H7')).toBeNull();
  });
});

describe('song chord shapes', () => {
  it('plays every open shape as its chord, from first position', () => {
    for (const row of [...OPEN_SHAPES, ...OPEN_SLASH_SHAPES]) {
      const c = chord(row.root, row.quality, row.bass ?? null);
      const shape = shapeFromText(row.frets, row.fingers);
      expect(
        songShapeProblems(shape, c, { open: true, bassInShape: !!row.bass }),
        `${row.root}${row.quality}${row.bass ? `/${row.bass}` : ''} ${row.frets}`,
      ).toEqual([]);
      expect(shape.diagramStartFret).toBe(1);
      // Fingers only on fretted strings.
      for (const f of shape.fingering) expect(f.fret).toBeGreaterThan(0);
    }
  });

  it('plays every movable template at every root, with no open strings', () => {
    // Frets 4-12: every grip, however far it reaches, stays on frets 1-15.
    for (const t of SONG_TEMPLATES) {
      for (let fret = 4; fret <= 12; fret++) {
        const frets = t.offsets.map((o) => (o === null ? null : fret + o));
        const rootPc = mod12(GUITAR_STANDARD_TUNING[t.rootString] + fret);
        const shape = shapeFromGrip(frets, t.fingers);
        expect(
          songShapeProblems(
            shape,
            {
              rootPc,
              rootName: '',
              quality: t.quality,
              bassPc: null,
              bassName: null,
            },
            { open: false, bassInShape: false },
          ),
          `${t.quality} on ${t.rootString} at ${fret}`,
        ).toEqual([]);
      }
    }
  });

  it('voices four-note movable chords as Drop 2, root first', () => {
    const order = (quality: SongChordQuality, rootString: 5 | 6) => {
      const t = SONG_TEMPLATES.find(
        (x) => x.quality === quality && x.rootString === rootString,
      )!;
      const frets = t.offsets.map((o) => (o === null ? null : 5 + o));
      const rootPc = mod12(GUITAR_STANDARD_TUNING[rootString] + 5);
      return shapeNotes(shapeFromGrip(frets, t.fingers).frets).map((n) =>
        songToneLabel(quality, rootPc, n.midi),
      );
    };
    expect(order('dom7', 5)).toEqual(['R', '5', '♭7', '3']);
    expect(order('maj6', 6)).toEqual(['R', '5', '6', '3']);
    expect(order('dom7sus4', 5)).toEqual(['R', '5', '♭7', '4']);
    expect(order('dom7#5', 6)).toEqual(['R', '♯5', '♭7', '3']);
  });

  it('puts the slash bass lowest in every slash family', () => {
    for (const t of SLASH_TEMPLATES) {
      for (let fret = 4; fret <= 12; fret++) {
        const frets = t.offsets.map((o) => (o === null ? null : fret + o));
        const bassPc = mod12(GUITAR_STANDARD_TUNING[t.bassString] + fret);
        const rootPc = mod12(bassPc - t.bassInterval);
        const c: SongChord = {
          rootPc,
          rootName: '',
          quality: t.quality,
          bassPc,
          bassName: '',
        };
        expect(
          songShapeProblems(shapeFromGrip(frets, t.fingers), c, {
            open: false,
            bassInShape: true,
          }),
          `${t.quality}/${t.bassInterval} on ${t.bassString} at ${fret}`,
        ).toEqual([]);
      }
    }
  });

  it('rejects what a hand can’t play or the chord doesn’t have', () => {
    // A close, piano-style C maj7: a six-fret stretch.
    const close = shapeFromText('X-3-7-4-8-X', 'X-1-4-2-4-X');
    expect(
      songShapeProblems(close, chord('C', 'maj7'), {
        open: false,
        bassInShape: false,
      }),
    ).not.toEqual([]);
    // Open strings are only for the open tables.
    const openC = shapeFromText('X-3-2-0-1-0', 'X-3-2-0-1-0');
    expect(
      songShapeProblems(openC, chord('C', 'maj'), {
        open: false,
        bassInShape: false,
      }),
    ).toContain('open string');
    // Wrong bass, wrong notes, a missing 3rd.
    expect(
      songShapeProblems(openC, chord('A', 'min7'), {
        open: true,
        bassInShape: false,
      }),
    ).toContain('wrong bass note');
    const noThird = shapeFromText('X-3-5-5-X-X', 'X-1-3-4-X-X');
    expect(
      songShapeProblems(noThird, chord('C', 'maj'), {
        open: false,
        bassInShape: false,
      }),
    ).toContain('a chord tone is missing');
  });

  it('labels each quality’s tones with R, never 1', () => {
    for (const spec of Object.values(SONG_QUALITIES)) {
      expect(spec.tones[0]).toBe('R');
      for (const s of spec.required) expect(spec.tones[s]).toBeDefined();
    }
  });
});

describe('resolveSongChords', () => {
  const frets = (names: string[]) =>
    [...resolveSongChords(names)].map(([name, s]) => [
      name,
      s?.shape.frets ?? null,
      s?.source ?? null,
      s?.bassNote ?? null,
    ]);

  it('uses open chords first, and open slash chords', () => {
    expect(frets(['G', 'C', 'D', 'Emin7', 'D/F♯', 'Amin7', 'C/G'])).toEqual([
      ['G', '3-2-0-0-0-3', 'open', null],
      ['C', 'X-3-2-0-1-0', 'open', null],
      ['D', 'X-X-0-2-3-2', 'open', null],
      ['Emin7', '0-2-0-0-0-0', 'open', null],
      ['D/F♯', '2-0-0-2-3-2', 'open-slash', null],
      ['Amin7', 'X-0-2-0-1-0', 'open', null],
      ['C/G', '3-3-2-0-1-0', 'open-slash', null],
    ]);
  });

  it('places barres and Drop 2 grips where a hand would', () => {
    expect(frets(['B♭'])[0][1]).toBe('X-1-3-3-3-X');
    expect(frets(['F♯min7'])[0][1]).toBe('2-4-2-2-X-X');
    expect(frets(['Cmin7'])[0][1]).toBe('X-3-5-3-4-X');
    expect(frets(['E♭'])[0][1]).toBe('X-6-8-8-8-X');
    expect(frets(['A♭'])[0][1]).toBe('4-6-6-5-4-4');
    expect(frets(['E7(♯9)'])[0][1]).toBe('X-7-6-7-8-X');
  });

  it('keeps a flat-key song’s grips together', () => {
    // E♭ major: no open chords; everything near one window.
    const shapes = [
      ...resolveSongChords(['E♭', 'A♭', 'B♭7', 'Cmin7', 'Fmin7']).values(),
    ];
    const lows = shapes.map((s) =>
      Math.min(
        ...shapeNotes(s!.shape.frets)
          .map((n) => n.position.fret)
          .filter((f) => f > 0),
      ),
    );
    expect(Math.max(...lows) - Math.min(...lows)).toBeLessThanOrEqual(5);
  });

  it('plays a slash chord with its bass, or names the bass', () => {
    expect(frets(['B/D♯', 'Fmin7/B♭'])).toEqual([
      ['B/D♯', 'X-6-4-4-4-X', 'slash-movable', null],
      ['Fmin7/B♭', 'X-1-1-1-1-1', 'slash-movable', null],
    ]);
    const [, b7] = frets(['B7/D♯'])[0];
    expect(b7).not.toBeNull();
    expect(frets(['B7/D♯'])[0][3]).toBe('D♯');
  });

  it('is deterministic, skips N.C. and keeps first-appearance order', () => {
    const names = ['A', 'N.C.', 'E', 'A', 'AG♯min7', 'D'];
    expect([...resolveSongChords(names).keys()]).toEqual([
      'A',
      'E',
      'AG♯min7',
      'D',
    ]);
    expect(resolveSongChords(names).get('AG♯min7')).toBeNull();
    expect(frets(names)).toEqual(frets(names));
  });

  it('labels the box’s strings with the chord’s tones', () => {
    const am7 = resolveSongChords(['Amin7']).get('Amin7')!;
    expect([...am7.toneLabels.values()]).toEqual(['R', '5', '♭7', '♭3', '5']);
  });
});
