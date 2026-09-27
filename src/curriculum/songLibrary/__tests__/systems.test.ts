import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import {
  authoredRowSizes,
  opensPage,
  sectionRowSizes,
  songSystemCount,
  songSystemOffsets,
  systemRowSizes,
} from '../systems';

const bars = (n: number): ChordBar[] =>
  Array.from({ length: n }, () => ({ chords: [] }));

const section = (
  id: string,
  barCount: number,
  over: Partial<SongSection> = {},
): SongSection => ({ id, label: id, bars: bars(barCount), ...over });

const song = (sections: SongSection[]) => ({ sections }) as unknown as Song;

describe('systemRowSizes', () => {
  it('breaks into systems of four', () => {
    expect(systemRowSizes(8)).toEqual([4, 4]);
    expect(systemRowSizes(4)).toEqual([4]);
  });
  it('folds a leftover one or two bars into the system before', () => {
    expect(systemRowSizes(9)).toEqual([4, 5]);
    expect(systemRowSizes(10)).toEqual([4, 6]);
    expect(systemRowSizes(5)).toEqual([5]);
  });
  it('leaves a leftover three, or a short section, as its own row', () => {
    expect(systemRowSizes(7)).toEqual([4, 3]);
    expect(systemRowSizes(11)).toEqual([4, 4, 3]);
    expect(systemRowSizes(2)).toEqual([2]);
  });
});

describe('authoredRowSizes', () => {
  it('leaves the short last row short', () => {
    expect(authoredRowSizes(10, 4)).toEqual([4, 4, 2]);
    expect(authoredRowSizes(7, 3)).toEqual([3, 3, 1]);
    expect(authoredRowSizes(9, 4)).toEqual([4, 4, 1]);
  });
  it('divides evenly when it divides evenly', () => {
    expect(authoredRowSizes(6, 3)).toEqual([3, 3]);
    expect(authoredRowSizes(4, 4)).toEqual([4]);
    expect(authoredRowSizes(0, 4)).toEqual([]);
  });
});

describe('sectionRowSizes', () => {
  it('folds a leftover bar or two when nobody asked for a row width', () => {
    expect(sectionRowSizes(section('verse', 10))).toEqual([4, 6]);
    expect(sectionRowSizes(section('verse', 8))).toEqual([4, 4]);
  });

  it('lays a section that sets its own row width out as written', () => {
    // The fold would make this [3, 4] and lose the three-bar phrasing.
    expect(sectionRowSizes(section('verse', 7, { measuresPerRow: 3 }))).toEqual(
      [3, 3, 1],
    );
    expect(sectionRowSizes(section('intro', 6, { measuresPerRow: 2 }))).toEqual(
      [2, 2, 2],
    );
  });

  it('gives the reader width the last word, and folds on it', () => {
    // A phone reading two to a row is our decision, not the author's, so the
    // authored three goes and the leftover bar folds in.
    expect(
      sectionRowSizes(section('verse', 7, { measuresPerRow: 3 }), 2),
    ).toEqual([2, 2, 3]);
    expect(sectionRowSizes(section('verse', 10), 2)).toEqual([2, 2, 2, 2, 2]);
  });

  it('counts a legacy repeatCount as the bars it stands for', () => {
    expect(sectionRowSizes(section('verse', 4, { repeatCount: 2 }))).toEqual([
      4,
    ]);
  });
});

describe('songSystemOffsets', () => {
  it('counts systems straight through the sections', () => {
    const s = song([
      section('intro', 4),
      section('verse', 8),
      section('tag', 2),
    ]);
    expect(songSystemOffsets(s)).toEqual([0, 1, 3]);
    expect(songSystemCount(s)).toBe(4);
  });

  it('respects a section that sets its own row width', () => {
    const s = song([
      section('intro', 6, { measuresPerRow: 2 }), // 2 + 2 + 2 → 3 systems
      section('verse', 8),
    ]);
    expect(songSystemOffsets(s)).toEqual([0, 3]);
    expect(songSystemCount(s)).toBe(5);
  });

  it('counts the short row an authored width ends on', () => {
    // Intro is 3 + 3 + 1, not the folded 3 + 4, so the verse starts a system
    // later than the fold would put it.
    const s = song([
      section('intro', 7, { measuresPerRow: 3 }),
      section('verse', 8),
    ]);
    expect(songSystemOffsets(s)).toEqual([0, 3]);
    expect(songSystemCount(s)).toBe(5);
  });

  it('counts the reader width, folded, when the reader sets one', () => {
    // Two to a row on a phone: 2 + 2 + 3, the authored three ignored.
    const s = song([section('intro', 7, { measuresPerRow: 3 })]);
    expect(songSystemCount(s, 2)).toBe(3);
  });

  it('counts a legacy repeatCount as the bars it stands for', () => {
    // 4 bars played twice is still one written system, not two.
    const s = song([section('verse', 4, { repeatCount: 2 })]);
    expect(songSystemCount(s)).toBe(1);
  });

  it('handles an empty chart', () => {
    expect(songSystemOffsets(song([]))).toEqual([]);
    expect(songSystemCount(song([]))).toBe(0);
  });
});

describe('opensPage', () => {
  it('never breaks before the first system', () => {
    expect(opensPage(0, 8)).toBe(false);
  });

  it('breaks every N systems, counted across sections', () => {
    expect(opensPage(8, 8)).toBe(true);
    expect(opensPage(16, 8)).toBe(true);
    expect(opensPage(7, 8)).toBe(false);
    expect(opensPage(9, 8)).toBe(false);
    expect(opensPage(10, 10)).toBe(true);
  });

  it('is off when no page size is set, so the chart stays continuous', () => {
    expect(opensPage(8, undefined)).toBe(false);
    expect(opensPage(8, 0)).toBe(false);
  });

  it('puts every page boundary of a real-shaped chart in the right place', () => {
    // Intro 4, Verse 16, Chorus 8, Verse 16, Outro 8 → 1+4+2+4+2 = 13 systems.
    const s = song([
      section('intro', 4),
      section('verse_1', 16),
      section('chorus', 8),
      section('verse_2', 16),
      section('outro', 8),
    ]);
    expect(songSystemCount(s)).toBe(13);
    const starts = Array.from(
      { length: songSystemCount(s) },
      (_, i) => i,
    ).filter((i) => opensPage(i, 8));
    // One break, at system 8 — which falls inside Verse 2, not on a section.
    expect(starts).toEqual([8]);
    const offsets = songSystemOffsets(s);
    expect(offsets).toEqual([0, 1, 5, 7, 11]);
    expect(offsets.includes(8)).toBe(false);
  });
});

/**
 * The count and the layout are the same call.
 *
 * `songSystemOffsets` numbers the systems and `ChordChart` draws them. Once a
 * section with its own `measuresPerRow` stopped folding its last row, the two
 * could disagree — the counter saying three systems where the renderer drew
 * two — and the page marks are keyed on those numbers. A break then lands on
 * a system that is never drawn, no break is emitted at all, and two pages of
 * staves print on one sheet.
 */
describe('counting and laying out agree', () => {
  const laidOut = (bars: number, measuresPerRow?: number): SongSection => ({
    id: 's',
    label: 'Verse',
    bars: Array.from({ length: bars }, () => ({ chords: [] })),
    ...(measuresPerRow === undefined ? {} : { measuresPerRow }),
  });

  it('agrees for a section laid out as its author asked', () => {
    // Seven bars three to a row: the author wants 3+3+1, not 3+4.
    const s = laidOut(7, 3);
    expect(sectionRowSizes(s)).toEqual([3, 3, 1]);
    expect(songSystemCount({ sections: [s] })).toBe(3);
  });

  it('agrees for a section with no width of its own', () => {
    const s = laidOut(10);
    expect(sectionRowSizes(s)).toEqual([4, 6]);
    expect(songSystemCount({ sections: [s] })).toBe(2);
  });

  it('agrees when a reader width overrides the author', () => {
    // A phone reads two to a row whatever the chart says, and folds.
    const s = laidOut(7, 3);
    expect(sectionRowSizes(s, 2)).toEqual([2, 2, 3]);
    expect(songSystemCount({ sections: [s] }, 2)).toBe(3);
  });

  it('numbers every system the renderer will draw, with no gaps', () => {
    // The invariant the page marks depend on: offsets run 0..count-1.
    const sections = [laidOut(7, 3), laidOut(10), laidOut(5, 5)];
    const offsets = songSystemOffsets({ sections });
    const drawn = sections.flatMap((s) => sectionRowSizes(s)).length;
    expect(offsets).toEqual([0, 3, 5]);
    expect(songSystemCount({ sections })).toBe(drawn);
  });
});
