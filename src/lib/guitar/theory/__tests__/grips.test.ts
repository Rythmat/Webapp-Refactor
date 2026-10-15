import { describe, expect, it } from 'vitest';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import type { BookChordQuality } from '@/curriculum/data/guitar/types';
import { shapePitchClasses } from '@/lib/guitar/fretboard';
import { CHORD_FORMULA, isTriadQuality } from '../chordTones';
import {
  GRIP_TEMPLATES,
  gripPlacements,
  gripProblems,
  gripShape,
  handProblems,
  placeGrip,
} from '../grips';
import { classifyVoicing } from '../voicing';

const QUALITIES = Object.keys(CHORD_FORMULA) as BookChordQuality[];
const PCS = [...Array(12).keys()];
const OPEN = { 5: 9, 6: 4 } as const;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

describe('generated grips', () => {
  it('has a grip for every quality on both string sets but sus2(♭5) on 6', () => {
    for (const quality of QUALITIES) {
      const sets = GRIP_TEMPLATES.filter((t) => t.quality === quality).map(
        (t) => t.rootString,
      );
      expect(sets.sort(), quality).toEqual(quality === 'sus2b5' ? [5] : [5, 6]);
    }
  });

  it('plays every template comfortably at every root', () => {
    for (const template of GRIP_TEMPLATES) {
      for (let rootFret = 2; rootFret <= 12; rootFret++) {
        const rootPc = mod12(OPEN[template.rootString] + rootFret);
        const shape = gripShape(template, rootFret);
        expect(
          gripProblems(shape, rootPc, template.quality),
          `${template.quality} root ${template.rootString} fret ${rootFret}`,
        ).toEqual([]);
      }
    }
  });

  it('voices four-note chords as Drop 2 and triads as four-string grips', () => {
    for (const template of GRIP_TEMPLATES) {
      const rootPc = mod12(OPEN[template.rootString] + 5);
      const voicing = classifyVoicing(
        gripShape(template, 5),
        rootPc,
        template.quality,
      );
      expect(voicing.family, template.quality).toBe(
        isTriadQuality(template.quality)
          ? `root${template.rootString}-four-string`
          : 'drop2',
      );
      expect(voicing.isRootPosition).toBe(true);
      expect(voicing.skippedStrings).toEqual([]);
    }
  });

  it('draws Book One’s own root-5 7th-chord boxes', () => {
    const book = GUITAR_ATLAS_BOOK_ONE.C.sevenths;
    const drop2On5 = (quality: BookChordQuality) =>
      GRIP_TEMPLATES.find((t) => t.quality === quality && t.rootString === 5)!;
    expect(gripShape(drop2On5('maj7'), 3).frets).toBe(book[0].frets);
    expect(gripShape(drop2On5('min7'), 5).frets).toBe(book[1].frets);
    expect(gripShape(drop2On5('min7'), 7).frets).toBe(book[2].frets);
  });

  it('finds a grip for every quality on every root', () => {
    for (const quality of QUALITIES) {
      for (const rootPc of PCS) {
        expect(
          gripPlacements(rootPc, quality).length,
          `${quality} on ${rootPc}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('places a grip near the scale window, its root in the bass', () => {
    // E Phrygian dominant around frets 11-15: the A chord sits up there too.
    const grip = placeGrip(9, 'min', { fretStart: 11, fretEnd: 15 });
    expect(grip.rootFret).toBeGreaterThanOrEqual(10);
    const near = placeGrip(9, 'min', { fretStart: 4, fretEnd: 8 });
    expect(near.rootFret).toBeLessThanOrEqual(8);
    // A preferred root string and fret wins when there is a grip there.
    const triad = placeGrip(
      0,
      'maj',
      { fretStart: 7, fretEnd: 11 },
      {
        rootString: 6,
        rootFret: 8,
      },
    );
    expect([triad.rootString, triad.rootFret]).toEqual([6, 8]);
  });

  it('repeats dim7 every 3 frets and aug every 4 (same notes)', () => {
    const dim7 = GRIP_TEMPLATES.find(
      (t) => t.quality === 'dim7' && t.rootString === 5,
    )!;
    const aug = GRIP_TEMPLATES.find(
      (t) => t.quality === 'aug' && t.rootString === 5,
    )!;
    const pcs = (frets: string) => [...shapePitchClasses(frets)].sort();
    expect(pcs(gripShape(dim7, 5).frets)).toEqual(
      pcs(gripShape(dim7, 8).frets),
    );
    expect(pcs(gripShape(aug, 5).frets)).toEqual(pcs(gripShape(aug, 9).frets));
  });

  it('rejects what a hand cannot play', () => {
    // A close-position C maj7 stacked on strings 5-2: a six-fret stretch.
    const close = { frets: 'X-3-7-4-8-X', diagramStartFret: 3, fingering: [] };
    expect(gripProblems(close, 0, 'maj7')).toContain('spans 6 frets');
    // Open strings and a missing finger.
    const open = {
      frets: 'X-3-2-0-1-0',
      diagramStartFret: 1,
      fingering: [{ finger: 3 as const, string: 5 as const, fret: 3 }],
    };
    expect(gripProblems(open, 0, 'maj')).toEqual(
      expect.arrayContaining(['open string', 'a note has no finger']),
    );
    // The bass must be the root.
    const firstInversion = gripShape(
      GRIP_TEMPLATES.find((t) => t.quality === 'maj' && t.rootString === 6)!,
      8,
    );
    expect(gripProblems(firstInversion, 4, 'min')).toContain(
      'root not in the bass',
    );
  });

  it('splits out the hand rules, which the open-chord rules relax', () => {
    // Every generated grip is a comfortable hand shape on its own.
    for (const template of GRIP_TEMPLATES) {
      for (let rootFret = 2; rootFret <= 12; rootFret++) {
        expect(handProblems(gripShape(template, rootFret))).toEqual([]);
      }
    }
    // An open C: open strings ring only when allowed.
    const openC = {
      frets: 'X-3-2-0-1-0',
      diagramStartFret: 1,
      fingering: [
        { finger: 3 as const, string: 5 as const, fret: 3 },
        { finger: 2 as const, string: 4 as const, fret: 2 },
        { finger: 1 as const, string: 2 as const, fret: 1 },
      ],
    };
    expect(handProblems(openC)).toContain('open string');
    expect(handProblems(openC, { allowOpen: true })).toEqual([]);
    // Still no open string under a barre.
    const underBarre = {
      frets: '1-3-3-2-0-1',
      diagramStartFret: 1,
      fingering: [
        { finger: 1 as const, string: 6 as const, fret: 1 },
        { finger: 3 as const, string: 5 as const, fret: 3 },
        { finger: 4 as const, string: 4 as const, fret: 3 },
        { finger: 2 as const, string: 3 as const, fret: 2 },
        { finger: 1 as const, string: 1 as const, fret: 1 },
      ],
      barre: {
        fret: 1,
        fromString: 6 as const,
        toString: 1 as const,
        finger: 1 as const,
      },
    };
    expect(handProblems(underBarre, { allowOpen: true })).toContain(
      'string 2 fretted below the barre',
    );
    // A muted string beside a fretted bass is damped by the bass finger
    // (F/G, 3-X-3-2-1-1); beside an open bass it isn't.
    const fOverG = {
      frets: '3-X-3-2-1-1',
      diagramStartFret: 1,
      fingering: [
        { finger: 3 as const, string: 6 as const, fret: 3 },
        { finger: 4 as const, string: 4 as const, fret: 3 },
        { finger: 2 as const, string: 3 as const, fret: 2 },
        { finger: 1 as const, string: 2 as const, fret: 1 },
        { finger: 1 as const, string: 1 as const, fret: 1 },
      ],
      barre: {
        fret: 1,
        fromString: 2 as const,
        toString: 1 as const,
        finger: 1 as const,
      },
    };
    expect(handProblems(fOverG)).toContain('muted string inside the grip');
    expect(handProblems(fOverG, { allowBassMute: true })).toEqual([]);
    const openBass = {
      frets: '0-X-0-2-3-2',
      diagramStartFret: 1,
      fingering: [
        { finger: 1 as const, string: 3 as const, fret: 2 },
        { finger: 3 as const, string: 2 as const, fret: 3 },
        { finger: 2 as const, string: 1 as const, fret: 2 },
      ],
    };
    expect(
      handProblems(openBass, { allowOpen: true, allowBassMute: true }),
    ).toContain('muted string inside the grip');
  });
});
