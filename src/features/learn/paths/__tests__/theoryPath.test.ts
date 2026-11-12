// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { starPoints } from '@/components/learn/path/pathGeometry';
import { sigilFor } from '@/components/learn/sigil/sigilSpec';
import { buildBassTheoryFlow } from '@/curriculum/data/activityFlows/bassTheoryFlows';
import { buildGuitarTheoryFlow } from '@/curriculum/data/activityFlows/guitarTheoryFlows';
import { buildUkuleleTheoryFlow } from '@/curriculum/data/activityFlows/ukuleleTheoryFlows';
import { GUITAR_THEORY_CATALOG } from '@/curriculum/data/guitar/theoryCatalog';
import { colorForKeyMode } from '@/lib/modeColorShift';
import {
  familyModes,
  familyOfMode,
  relativeRoot,
  THEORY_FAMILIES,
  theoryFamily,
} from '../theoryFamilies';
import {
  modeFigure,
  theoryBackRoute,
  theoryFamilyPath,
  theoryFamilyRoute,
} from '../theoryPath';
import { frettedSections, theoryProgress } from '../theoryProgress';

const ctx = (
  instrument: 'piano' | 'guitar' | 'bass' | 'ukulele',
  isPremium = true,
) => ({
  instrument,
  isPremium,
  progress: theoryProgress(instrument, []),
});
const path = (
  id: string,
  instrument: 'piano' | 'guitar' | 'bass' | 'ukulele' = 'piano',
  isPremium = true,
) => theoryFamilyPath(theoryFamily(id)!, '#fff', ctx(instrument, isPremium));

afterEach(() => localStorage.clear());

const sigilScale = (mode: string) => {
  const spec = sigilFor({ mode });
  return spec?.kind === 'scale' ? spec.pcs : null;
};

describe('Theory’s families', () => {
  // The owner's list, 2026-11-02.
  it.each([
    ['diatonic', 'ionian', 'Ionian (Major)'],
    ['harmonic-minor', 'ionian#5', 'Ionian ♯5'],
    ['melodic-minor', 'mixolydiannat6', 'Mixolydian ♭6'],
    ['harmonic-major', 'harmonicmajor', 'Harmonic Major'],
    ['double-harmonic', 'doubleharmonicmajor', 'Double Harmonic Major'],
    ['pentatonic-blues', 'majorpentatonic', 'Major Pentatonic'],
  ])('%s opens on %s in all 12 keys', (id, slug, title) => {
    const course = path(id);
    const parentRows = course.rows.filter((row) => row.levelId === 'parent');
    expect(parentRows).toHaveLength(12);
    expect(parentRows[0].id).toBe(`${slug}:c`);
    expect(course.levels[0].title).toBe(title);
  });

  it('gives each other mode one disc, with a choice of key', () => {
    const course = path('diatonic');
    const modes = course.rows.filter((row) => row.levelId === 'modes');
    expect(modes.map((row) => row.id)).toEqual([
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'aeolian',
      'locrian',
    ]);
    expect(modes[0].options).toHaveLength(12);
    expect(modes[0].options?.[1]).toMatchObject({
      label: 'G',
      route: '/learn/keyboard/dorian/g',
    });
  });

  it('carries on round the family from its parent', () => {
    const modes = familyModes('piano', theoryFamily('harmonic-minor')!);
    expect(modes.map((mode) => mode.slug)).toEqual([
      'ionian#5',
      'dorian#4',
      'phrygiandominant',
      'lydian#2',
      'altereddiminished',
      'harmonicminor',
      'locriannat6',
    ]);
  });

  it('leaves every mode in exactly one family', () => {
    const counted = THEORY_FAMILIES.flatMap((family) =>
      familyModes('guitar', family),
    );
    expect(counted).toHaveLength(GUITAR_THEORY_CATALOG.length);
  });

  it('opens each instrument’s own lessons', () => {
    for (const [instrument, segment] of [
      ['piano', 'keyboard'],
      ['guitar', 'guitar'],
      ['bass', 'bass'],
      ['ukulele', 'ukulele'],
    ] as const) {
      const [first] = path('diatonic', instrument).rows;
      expect(first.route).toBe(`/learn/${segment}/ionian/c`);
    }
  });

  it('leads on to the next family', () => {
    expect(path('diatonic', 'guitar').upNext?.to).toBe(
      '/learn/guitar/theory/pentatonic-blues',
    );
    expect(path('parallel').upNext).toBeUndefined();
  });
});

describe('each key’s colour and note pattern', () => {
  it('colours a key disc as the key wheel colours that key', () => {
    const { rows } = path('diatonic');
    expect(rows[0].figure?.accent).toBe(colorForKeyMode('C', 'ionian'));
    expect(rows[1].figure?.accent).toBe(colorForKeyMode('G', 'ionian'));
    expect(rows[6].figure?.accent).toBe(colorForKeyMode('F♯', 'ionian'));
    const colours = new Set(rows.slice(0, 12).map((r) => r.figure?.accent));
    expect(colours.size).toBe(12);
  });

  it('draws the mode’s own notes, on its own tonic', () => {
    const [c, g] = path('diatonic').rows;
    expect(c.figure?.pcs).toEqual(sigilScale('ionian'));
    expect(c.figure?.tonic).toBe(0);
    expect(g.figure?.tonic).toBe(7);
    expect(g.figure?.label).toBe('G Ionian');
  });

  it('spells its notes for the key', () => {
    expect(modeFigure('ionian', 'B♭')?.notes).toEqual([
      'B♭',
      'C',
      'D',
      'E♭',
      'F',
      'G',
      'A',
    ]);
  });

  it('turns the star with the key, in fifths', () => {
    const figure = modeFigure('ionian', 'G')!;
    const { nodes } = starPoints(figure, 40);
    // Its root is G, one step round from C at the top.
    const root = nodes.find((n) => n.pc === 0)!;
    expect(root.at[0]).toBeCloseTo(20, 1);
    expect(root.at[1]).toBeCloseTo(-34.64, 1);
  });

  it('dots a mode’s root and its parent scale’s, as the wheel does', () => {
    // C Lydian's C, and G: Lydian is G major's fourth mode.
    expect(modeFigure('lydian', 'C')?.marked).toEqual([0, 7]);
    expect(modeFigure('ionian', 'C')?.marked).toEqual([0, 0]);
  });

  it('gives each of a mode disc’s keys its own figure', () => {
    const dorian = path('diatonic').rows.find((r) => r.id === 'dorian')!;
    expect(dorian.options?.map((o) => o.figure?.tonic)).toEqual([
      0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5,
    ]);
    expect(dorian.options?.[2].figure?.label).toBe('D Dorian');
    expect(dorian.options?.[2].figure?.accent).toBe(
      colorForKeyMode('D', 'dorian'),
    );
  });

  it('has a figure on every Theory disc', () => {
    for (const family of THEORY_FAMILIES) {
      for (const row of path(family.id, 'guitar').rows) {
        expect(row.figure, `${family.id} ${row.id}`).toBeTruthy();
      }
    }
  });
});

describe('free and Premium', () => {
  it('keeps only C Ionian free', () => {
    const open = path('diatonic', 'guitar', false).rows.filter(
      (row) => !row.locked,
    );
    expect(open.map((row) => row.id)).toEqual(['ionian:c']);
    expect(
      path('harmonic-minor', 'guitar', false).rows.every((row) => row.locked),
    ).toBe(true);
    expect(path('relative', 'guitar', false).rows[0].locked).toBe(true);
  });

  it('locks nothing for a subscriber', () => {
    expect(path('diatonic').rows.some((row) => row.locked)).toBe(false);
  });
});

describe('Relative and Parallel', () => {
  it('finds each mode’s note in a key', () => {
    expect(relativeRoot('C', 1)).toBe('D');
    expect(relativeRoot('G', 6)).toBe('F♯');
    expect(relativeRoot('F', 3)).toBe('B♭');
  });

  it('never marks a disc finished, since it only links', () => {
    expect(path('relative').rows.every((row) => !row.tracked)).toBe(true);
    expect(path('parallel').rows).toHaveLength(12);
  });

  it('uses the pages keyboard and guitar have', () => {
    expect(path('relative').rows[0].route).toBe('/learn/keyboard/relative/c');
    expect(path('parallel').rows[0].route).toBe('/learn/keyboard/parallel/c');
    expect(path('relative', 'guitar').rows[0].route).toBe(
      '/learn/guitar/relative/c',
    );
  });

  it('offers the modes where there’s no such page, on that instrument', () => {
    const [c] = path('relative', 'bass').rows;
    expect(c.options?.map((o) => o.label)).toEqual([
      'C Ionian',
      'D Dorian',
      'E Phrygian',
      'F Lydian',
      'G Mixolydian',
      'A Aeolian',
      'B Locrian',
    ]);
    expect(c.options?.[1].route).toBe('/learn/bass/dorian/d');
    const [parallel] = path('parallel', 'ukulele').rows;
    expect(parallel.options?.[1].route).toBe('/learn/ukulele/dorian/c');
  });
});

describe('going back', () => {
  it('returns a lesson to its disc', () => {
    expect(theoryBackRoute('guitar', 'ionian', 'F♯')).toBe(
      '/learn/guitar/theory/diatonic?select=ionian%3Afsharp',
    );
    expect(theoryBackRoute('bass', 'dorian', 'D')).toBe(
      '/learn/bass/theory/diatonic?select=dorian',
    );
    expect(theoryBackRoute('piano', 'lydian#2')).toBe(
      '/learn/keyboard/theory/harmonic-minor?select=lydian%232',
    );
  });

  it('knows every mode’s family', () => {
    for (const entry of GUITAR_THEORY_CATALOG) {
      expect(familyOfMode(entry.slug)?.id, entry.slug).toBe(entry.family);
    }
  });

  it('builds a family’s path', () => {
    expect(theoryFamilyRoute('ukulele', 'melodic-minor')).toBe(
      '/learn/ukulele/theory/melodic-minor',
    );
  });
});

describe('progress', () => {
  const lesson = (
    mode: string,
    root: string,
    completed: number,
    total = 10,
  ) => ({
    lessonId: `mode-lesson-flow__${root.toLowerCase()}__${mode}`,
    lessonVersion: 2,
    mode,
    root,
    completedCount: completed,
    totalCount: total,
    currentActivityInstanceId: null,
  });

  it('reads piano per key from the server’s lessons', () => {
    const progress = theoryProgress('piano', [
      lesson('ionian', 'C', 10),
      lesson('ionian', 'F♯', 5),
      lesson('dorian', 'D', 2),
      lesson('dorian', 'G', 8),
    ]);
    const ionian = GUITAR_THEORY_CATALOG.find((e) => e.slug === 'ionian')!;
    const dorian = GUITAR_THEORY_CATALOG.find((e) => e.slug === 'dorian')!;
    expect(progress.keyPercent(ionian, 'C')).toBe(100);
    expect(progress.keyPercent(ionian, 'F♯')).toBe(50);
    expect(progress.keyPercent(ionian, 'G')).toBe(0);
    // A mode goes by its best key.
    expect(progress.modePercent(dorian)).toBe(80);
  });

  it('ignores lesson versions that can’t resume', () => {
    const progress = theoryProgress('piano', [
      { ...lesson('ionian', 'C', 10), lessonVersion: 9 },
    ]);
    const ionian = GUITAR_THEORY_CATALOG.find((e) => e.slug === 'ionian')!;
    expect(progress.keyPercent(ionian, 'C')).toBe(0);
  });

  it('turns a finished piano key into a coin on its path', () => {
    const course = theoryFamilyPath(theoryFamily('diatonic')!, '#fff', {
      instrument: 'piano',
      isPremium: true,
      progress: theoryProgress('piano', [lesson('ionian', 'G', 10)]),
    });
    expect(course.rows.find((r) => r.id === 'ionian:g')?.percent).toBe(100);
    expect(course.rows.find((r) => r.id === 'ionian:c')?.percent).toBe(0);
  });
});

describe('what a fretted lesson really has', () => {
  // The discs count these, so they must match what the builders make.
  it.each([
    ['guitar', buildGuitarTheoryFlow],
    ['bass', buildBassTheoryFlow],
    ['ukulele', buildUkuleleTheoryFlow],
  ] as const)('%s', (_, build) => {
    for (const slug of ['ionian', 'dorian', 'majorpentatonic']) {
      const entry = GUITAR_THEORY_CATALOG.find((e) => e.slug === slug)!;
      const sections = build('C', slug).sections.map(
        (s: { id: string }) => s.id,
      );
      expect(sections, slug).toEqual([...frettedSections(entry)]);
    }
  });
});
