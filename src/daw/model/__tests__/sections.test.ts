import { describe, expect, it } from 'vitest';
import type { TimeSignature } from '@/daw/time/timeModel';
import type { SectionType } from '@/unison/types/schema';
import {
  DEFAULT_SECTION_BARS,
  SECTION_TYPES,
  appendSection,
  isSectionType,
  markSectionAtBar,
  marksOfSections,
  newSectionId,
  normalizeSections,
  relabelForType,
  removeSectionAtBar,
  resizeSectionEdge,
  sectionAt,
  sectionName,
  sectionTypeInfo,
  sectionTypeOfLabel,
  sectionsFromMarks,
  shiftSectionsForBars,
  type SongSection,
} from '../sections';

// ── Song sections ──────────────────────────────────────────────────────────
// One section model for the Timeline's sections lane and the Lead Sheet's
// section marks (milestone 2.13): named spans of the song on the bar lines
// of the project's metre, typed from UNISON's vocabulary or named by the
// student. Written from the milestone's contract, apart from the code, so it
// checks the code rather than repeating it.

const FOUR: TimeSignature = { numerator: 4, denominator: 4 };
const THREE: TimeSignature = { numerator: 3, denominator: 4 };
const BAR = 1920; // a bar of 4/4
const BAR3 = 1440; // a bar of 3/4

const section = (
  id: string,
  startTick: number,
  endTick: number,
  type: SectionType = 'verse',
  label = 'Verse',
): SongSection => ({ id, type, label, startTick, endTick });

/** A section over bars [from, to) of 4/4. */
const bars = (
  id: string,
  from: number,
  to: number,
  type: SectionType = 'verse',
  label = 'Verse',
): SongSection => section(id, from * BAR, to * BAR, type, label);

/** Each section as `id from-to`, counted in bars of `bar` ticks. */
const spans = (list: readonly SongSection[], bar = BAR): string[] =>
  list.map((s) => `${s.id} ${s.startTick / bar}-${s.endTick / bar}`);

describe('section types', () => {
  it.each<[string, SectionType]>([
    ['Intro', 'intro'],
    ['Verse', 'verse'],
    ['Verse 1', 'verse'],
    ['Pre-Chorus', 'pre-chorus'],
    ['Pre Chorus', 'pre-chorus'],
    ['Prechorus', 'pre-chorus'],
    ['Chorus 2', 'chorus'],
    ['Chorus 10', 'chorus'],
    ['Bridge', 'bridge'],
    ['Interlude', 'interlude'],
    ['Tag', 'tag'],
    ['Outro', 'outro'],
    ['Build Up', 'build-up'],
    ['build-up', 'build-up'],
    ['Build-up', 'build-up'],
    ['Buildup', 'build-up'],
    ['Refrain', 'chorus'],
    ['Instrumental', 'interlude'],
    ['Middle 8', 'bridge'],
    ['Middle eight', 'bridge'],
    ['Hook', 'hook'],
    ['Drop', 'drop'],
    ['Breakdown', 'breakdown'],
    ['Solo', 'solo'],
    ['Coda', 'coda'],
  ])('reads the chart name %j as %s', (label, type) => {
    expect(sectionTypeOfLabel(label)).toBe(type);
  });

  it('ignores case, the spaces around a name and the marks between its words', () => {
    expect(sectionTypeOfLabel('  VERSE 3  ')).toBe('verse');
    expect(sectionTypeOfLabel('chorus')).toBe('chorus');
    expect(sectionTypeOfLabel('pre_chorus')).toBe('pre-chorus');
    expect(sectionTypeOfLabel('BUILD   UP')).toBe('build-up');
  });

  it('calls any other name custom', () => {
    for (const label of ['A', 'Section', '', '   ']) {
      expect(sectionTypeOfLabel(label)).toBe('custom');
    }
  });

  it('lists fourteen types in menu order, the six common ones first, and no custom', () => {
    expect(SECTION_TYPES.map((t) => [t.type, t.name, t.common])).toEqual([
      ['intro', 'Intro', true],
      ['verse', 'Verse', true],
      ['pre-chorus', 'Pre-chorus', true],
      ['chorus', 'Chorus', true],
      ['bridge', 'Bridge', true],
      ['outro', 'Outro', true],
      ['solo', 'Solo', false],
      ['interlude', 'Interlude', false],
      ['breakdown', 'Breakdown', false],
      ['build-up', 'Build-up', false],
      ['drop', 'Drop', false],
      ['hook', 'Hook', false],
      ['tag', 'Tag', false],
      ['coda', 'Coda', false],
    ]);
  });

  it('says what every type is for', () => {
    for (const info of SECTION_TYPES) {
      expect(typeof info.purpose).toBe('string');
      expect(info.purpose.trim().length).toBeGreaterThan(0);
    }
  });

  it('names every type, custom too', () => {
    for (const info of SECTION_TYPES) {
      expect(sectionTypeInfo(info.type)).toEqual(info);
      expect(sectionName(info.type)).toBe(info.name);
      // A type's own name reads back as that type.
      expect(sectionTypeOfLabel(info.name)).toBe(info.type);
    }
    expect(sectionTypeInfo('custom').name).toBe('Custom');
    expect(sectionName('custom')).toBe('Custom');
    expect(sectionName('pre-chorus')).toBe('Pre-chorus');
  });

  it('tells a section type from anything else', () => {
    for (const info of SECTION_TYPES)
      expect(isSectionType(info.type)).toBe(true);
    expect(isSectionType('custom')).toBe(true);
    for (const value of [
      'Verse',
      'refrain',
      'section',
      '',
      null,
      undefined,
      4,
      {},
    ]) {
      expect(isSectionType(value)).toBe(false);
    }
  });

  it('makes ids of "section-" and eight hex digits, a new one each time', () => {
    const ids = Array.from({ length: 200 }, () => newSectionId());
    for (const id of ids) expect(id).toMatch(/^section-[0-9a-f]{8}$/i);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('normalizeSections', () => {
  it('returns the very same array when the list is already in order', () => {
    const list = [bars('a', 0, 4), bars('b', 4, 8), bars('c', 10, 12)];
    expect(normalizeSections(list)).toBe(list);
    const none: SongSection[] = [];
    expect(normalizeSections(none)).toBe(none);
  });

  it('sorts by start', () => {
    const list = [bars('c', 8, 12), bars('a', 0, 4), bars('b', 4, 8)];
    expect(spans(normalizeSections(list))).toEqual([
      'a 0-4',
      'b 4-8',
      'c 8-12',
    ]);
  });

  it('breaks a tie on the start by id', () => {
    // a sorts first, so it keeps bar 1 and b is pushed after it.
    const list = [bars('b', 0, 2), bars('a', 0, 4)];
    expect(spans(normalizeSections(list))).toEqual(['a 0-4', 'b 4-6']);
  });

  it('pushes a section that overlaps the one before to start at its end, keeping its length, down the line', () => {
    const list = [bars('a', 0, 4), bars('b', 2, 6), bars('c', 6, 7)];
    expect(normalizeSections(list)).toEqual([
      bars('a', 0, 4),
      bars('b', 4, 8),
      // b now ends at bar 8, so c moves too, still a bar long.
      bars('c', 8, 9),
    ]);
  });

  it('drops a section with no length', () => {
    const list = [
      bars('a', 0, 4),
      section('empty', 4 * BAR, 4 * BAR),
      section('backwards', 6 * BAR, 5 * BAR),
      bars('b', 8, 12),
    ];
    expect(spans(normalizeSections(list))).toEqual(['a 0-4', 'b 8-12']);
  });

  it('clamps a start before the song to 0', () => {
    expect(normalizeSections([section('a', -960, BAR)])).toEqual([
      section('a', 0, BAR),
    ]);
  });

  it('rounds ticks to whole ticks', () => {
    expect(
      normalizeSections([
        section('a', 0.4, 1919.6),
        section('b', 1920.2, 3840.4),
      ]),
    ).toEqual([section('a', 0, BAR), section('b', BAR, 2 * BAR)]);
  });

  it('gives the same answer for the same sections in any order, every time', () => {
    const a = bars('a', 0, 4);
    const b = bars('b', 2, 6);
    const c = bars('c', 0, 2);
    const want = [bars('a', 0, 4), bars('c', 4, 6), bars('b', 6, 10)];
    expect(normalizeSections([c, a, b])).toEqual(want);
    expect(normalizeSections([b, c, a])).toEqual(want);
    expect(normalizeSections([a, b, c])).toEqual(want);
    expect(normalizeSections([c, a, b])).toEqual(want);
  });

  it('never changes the list it is given', () => {
    const list = [bars('b', 2, 6), bars('a', 0, 4), section('c', -5.5, 3)];
    const copy = structuredClone(list);
    normalizeSections(list);
    expect(list).toEqual(copy);
  });
});

describe('sectionAt', () => {
  const list = [bars('a', 0, 4), bars('b', 4, 8), bars('c', 10, 12)];

  it('finds the section a tick falls in', () => {
    expect(sectionAt(list, 2 * BAR)?.id).toBe('a');
    expect(sectionAt(list, 6 * BAR + 100)?.id).toBe('b');
    expect(sectionAt(list, 10 * BAR)?.id).toBe('c');
  });

  it('finds none in a gap or past the last section', () => {
    expect(sectionAt(list, 9 * BAR)).toBeUndefined();
    expect(sectionAt(list, 20 * BAR)).toBeUndefined();
  });
});

describe('appendSection', () => {
  it('puts the first section at bar 1, eight bars long', () => {
    expect(DEFAULT_SECTION_BARS).toBe(8);
    const { sections, section: added } = appendSection(
      [],
      { type: 'intro', label: 'Intro' },
      FOUR,
      'first',
    );
    expect(added).toEqual(section('first', 0, 15360, 'intro', 'Intro'));
    expect(sections).toEqual([added]);
  });

  it('adds a section after the last one', () => {
    const list = [bars('a', 0, 4), bars('b', 4, 8)];
    const { sections, section: added } = appendSection(
      list,
      { type: 'chorus', label: 'Chorus' },
      FOUR,
      'c',
    );
    expect(added).toEqual(bars('c', 8, 16, 'chorus', 'Chorus'));
    expect(sections).toEqual([...list, added]);
  });

  it('starts on the next bar line when the last section ends inside a bar', () => {
    const { sections, section: added } = appendSection(
      [section('a', 0, 2000)],
      { type: 'verse', label: 'Verse' },
      FOUR,
      'v',
    );
    expect([added.startTick, added.endTick]).toEqual([2 * BAR, 10 * BAR]);
    expect(sections.map((s) => s.id)).toEqual(['a', 'v']);
  });

  it("counts bars in the project's metre", () => {
    const first = appendSection(
      [],
      { type: 'verse', label: 'Verse' },
      THREE,
      'v',
    ).section;
    expect([first.startTick, first.endTick]).toEqual([0, 8 * BAR3]);
    const next = appendSection(
      [section('a', 0, 1500)],
      { type: 'chorus', label: 'Chorus' },
      THREE,
      'c',
    ).section;
    expect([next.startTick, next.endTick]).toEqual([2 * BAR3, 10 * BAR3]);
  });

  it('mints an id when none is given', () => {
    const { sections, section: added } = appendSection(
      [],
      { type: 'drop', label: 'Drop' },
      FOUR,
    );
    expect(added.id).toMatch(/^section-[0-9a-f]{8}$/i);
    expect(sections[0].id).toBe(added.id);
  });
});

describe('resizeSectionEdge', () => {
  /** Two sections with two empty bars between them. */
  const apart = [bars('a', 0, 4), bars('b', 8, 12)];
  /** Two sections that share an edge at bar 4. */
  const joined = [bars('a', 0, 4), bars('b', 4, 8)];

  it('moves a free end to the nearest bar line', () => {
    expect(
      spans(resizeSectionEdge(apart, 'a', 'end', 6 * BAR + 100, FOUR)),
    ).toEqual(['a 0-6', 'b 8-12']);
    expect(
      spans(resizeSectionEdge(apart, 'a', 'end', 5 * BAR + 1000, FOUR)),
    ).toEqual(['a 0-6', 'b 8-12']);
    expect(
      spans(resizeSectionEdge(apart, 'a', 'end', 2 * BAR - 300, FOUR)),
    ).toEqual(['a 0-2', 'b 8-12']);
    // The last section's end has nothing after it to stop at.
    expect(spans(resizeSectionEdge(apart, 'b', 'end', 20 * BAR, FOUR))).toEqual(
      ['a 0-4', 'b 8-20'],
    );
  });

  it('stops a free end at the next section', () => {
    expect(spans(resizeSectionEdge(apart, 'a', 'end', 10 * BAR, FOUR))).toEqual(
      ['a 0-8', 'b 8-12'],
    );
  });

  it('moves a free start, stopping at the section before and never before 0', () => {
    expect(
      spans(resizeSectionEdge(apart, 'b', 'start', 6 * BAR - 200, FOUR)),
    ).toEqual(['a 0-4', 'b 6-12']);
    expect(
      spans(resizeSectionEdge(apart, 'b', 'start', 2 * BAR, FOUR)),
    ).toEqual(['a 0-4', 'b 4-12']);
    expect(
      spans(resizeSectionEdge([bars('c', 4, 8)], 'c', 'start', -3 * BAR, FOUR)),
    ).toEqual(['c 0-8']);
  });

  it('moves a shared edge for both sections', () => {
    expect(spans(resizeSectionEdge(joined, 'a', 'end', 6 * BAR, FOUR))).toEqual(
      ['a 0-6', 'b 6-8'],
    );
    expect(spans(resizeSectionEdge(joined, 'a', 'end', 2 * BAR, FOUR))).toEqual(
      ['a 0-2', 'b 2-8'],
    );
    expect(
      spans(resizeSectionEdge(joined, 'b', 'start', 3 * BAR, FOUR)),
    ).toEqual(['a 0-3', 'b 3-8']);
    expect(
      spans(resizeSectionEdge(joined, 'b', 'start', 5 * BAR + 300, FOUR)),
    ).toEqual(['a 0-5', 'b 5-8']);
  });

  it('keeps every section it touches at least a bar long', () => {
    expect(spans(resizeSectionEdge(joined, 'a', 'end', 0, FOUR))).toEqual([
      'a 0-1',
      'b 1-8',
    ]);
    expect(spans(resizeSectionEdge(joined, 'a', 'end', 9 * BAR, FOUR))).toEqual(
      ['a 0-7', 'b 7-8'],
    );
    expect(
      spans(resizeSectionEdge(joined, 'b', 'start', 8 * BAR, FOUR)),
    ).toEqual(['a 0-7', 'b 7-8']);
    expect(spans(resizeSectionEdge(joined, 'b', 'start', 0, FOUR))).toEqual([
      'a 0-1',
      'b 1-8',
    ]);
    expect(spans(resizeSectionEdge(apart, 'a', 'end', -2 * BAR, FOUR))).toEqual(
      ['a 0-1', 'b 8-12'],
    );
    expect(
      spans(resizeSectionEdge(apart, 'b', 'start', 15 * BAR, FOUR)),
    ).toEqual(['a 0-4', 'b 11-12']);
  });

  it("counts bars in the project's metre", () => {
    expect(
      resizeSectionEdge(
        [section('a', 0, 4 * BAR3)],
        'a',
        'end',
        5 * BAR3 + 100,
        THREE,
      ),
    ).toEqual([section('a', 0, 5 * BAR3)]);
  });

  it('returns the same list for a section it does not know, or an edge that stays put', () => {
    expect(resizeSectionEdge(apart, 'nope', 'end', 6 * BAR, FOUR)).toBe(apart);
    expect(resizeSectionEdge(apart, 'a', 'end', 4 * BAR + 300, FOUR)).toBe(
      apart,
    );
    expect(resizeSectionEdge(joined, 'b', 'start', 4 * BAR - 300, FOUR)).toBe(
      joined,
    );
  });
});

describe('marksOfSections', () => {
  it('marks the bar each section starts on with its label', () => {
    expect(
      marksOfSections(
        [
          bars('i', 0, 4, 'intro', 'Intro'),
          bars('v', 4, 12, 'verse', 'Verse 1'),
        ],
        FOUR,
      ),
    ).toEqual([
      { measureIdx: 0, label: 'Intro' },
      { measureIdx: 4, label: 'Verse 1' },
    ]);
  });

  it('lists the marks in start order', () => {
    expect(
      marksOfSections(
        [bars('v', 4, 8, 'verse', 'Verse'), bars('i', 0, 4, 'intro', 'Intro')],
        FOUR,
      ),
    ).toEqual([
      { measureIdx: 0, label: 'Intro' },
      { measureIdx: 4, label: 'Verse' },
    ]);
  });

  it('puts a section that starts inside a bar on that bar', () => {
    expect(
      marksOfSections(
        [
          section('a', 0, 2 * BAR + 500, 'custom', 'A'),
          section('b', 2 * BAR + 500, 5 * BAR, 'custom', 'B'),
        ],
        FOUR,
      ),
    ).toEqual([
      { measureIdx: 0, label: 'A' },
      { measureIdx: 2, label: 'B' },
    ]);
  });

  it('keeps one mark per bar, the first', () => {
    expect(
      marksOfSections(
        [
          section('x', 0, 100, 'custom', 'X'),
          section('y', 100, BAR, 'custom', 'Y'),
          section('z', BAR, 2 * BAR, 'custom', 'Z'),
        ],
        FOUR,
      ),
    ).toEqual([
      { measureIdx: 0, label: 'X' },
      { measureIdx: 1, label: 'Z' },
    ]);
  });

  it("counts bars in the project's metre", () => {
    const list = [
      section('a', 0, 2 * BAR3, 'custom', 'A'),
      section('b', 2 * BAR3, 4 * BAR3, 'custom', 'B'),
    ];
    expect(marksOfSections(list, THREE).map((m) => m.measureIdx)).toEqual([
      0, 2,
    ]);
    // 2,880 ticks is inside the second bar of 4/4.
    expect(marksOfSections(list, FOUR).map((m) => m.measureIdx)).toEqual([
      0, 1,
    ]);
  });

  it('has no marks without sections', () => {
    expect(marksOfSections([], FOUR)).toEqual([]);
  });
});

describe('sectionsFromMarks', () => {
  it('runs each section to the next mark and the last to the end of the chart', () => {
    expect(
      sectionsFromMarks(
        [
          { measureIdx: 0, label: 'Verse 1' },
          { measureIdx: 4, label: 'Chorus' },
          { measureIdx: 8, label: 'Middle 8' },
        ],
        FOUR,
        12,
      ),
    ).toEqual([
      section('section-bar-0', 0, 4 * BAR, 'verse', 'Verse 1'),
      section('section-bar-4', 4 * BAR, 8 * BAR, 'chorus', 'Chorus'),
      section('section-bar-8', 8 * BAR, 12 * BAR, 'bridge', 'Middle 8'),
    ]);
  });

  it('sorts the marks, keeps the first in a bar and drops empty labels', () => {
    expect(
      sectionsFromMarks(
        [
          { measureIdx: 4, label: 'Chorus' },
          { measureIdx: 0, label: 'A' },
          { measureIdx: 4, label: 'Bridge' },
          { measureIdx: 6, label: '   ' },
          { measureIdx: 8, label: 'Outro' },
        ],
        FOUR,
        10,
      ),
    ).toEqual([
      section('section-bar-0', 0, 4 * BAR, 'custom', 'A'),
      section('section-bar-4', 4 * BAR, 8 * BAR, 'chorus', 'Chorus'),
      section('section-bar-8', 8 * BAR, 10 * BAR, 'outro', 'Outro'),
    ]);
  });

  it('runs the last section at least a bar, past the end of the chart', () => {
    expect(
      sectionsFromMarks([{ measureIdx: 10, label: 'Tag' }], FOUR, 8),
    ).toEqual([section('section-bar-10', 10 * BAR, 11 * BAR, 'tag', 'Tag')]);
  });

  it("counts bars in the project's metre", () => {
    expect(
      sectionsFromMarks(
        [
          { measureIdx: 0, label: 'A' },
          { measureIdx: 2, label: 'B' },
        ],
        THREE,
        4,
      ),
    ).toEqual([
      section('section-bar-0', 0, 2 * BAR3, 'custom', 'A'),
      section('section-bar-2', 2 * BAR3, 4 * BAR3, 'custom', 'B'),
    ]);
  });

  it('has no sections without marks', () => {
    expect(sectionsFromMarks([], FOUR, 8)).toEqual([]);
  });
});

describe('markSectionAtBar', () => {
  const verse = [bars('v', 0, 8, 'verse', 'Verse')];

  it("relabels the section that starts on the bar, its type following the label's", () => {
    expect(markSectionAtBar(verse, 0, 'Chorus 2', FOUR, 16)).toEqual([
      bars('v', 0, 8, 'chorus', 'Chorus 2'),
    ]);
  });

  it('keeps the type when the new label names none', () => {
    expect(markSectionAtBar(verse, 0, 'A', FOUR, 16)).toEqual([
      bars('v', 0, 8, 'verse', 'A'),
    ]);
  });

  it('splits a section at a bar inside it, the new part running to its end', () => {
    expect(markSectionAtBar(verse, 4, 'Chorus', FOUR, 16, 'new')).toEqual([
      bars('v', 0, 4, 'verse', 'Verse'),
      bars('new', 4, 8, 'chorus', 'Chorus'),
    ]);
    expect(markSectionAtBar(verse, 6, 'B', FOUR, 16, 'b')).toEqual([
      bars('v', 0, 6, 'verse', 'Verse'),
      bars('b', 6, 8, 'custom', 'B'),
    ]);
  });

  it('fills a gap up to the next section', () => {
    const list = [bars('v', 0, 4), bars('c', 8, 12, 'chorus', 'Chorus')];
    expect(markSectionAtBar(list, 5, 'Bridge', FOUR, 16, 'g')).toEqual([
      bars('v', 0, 4),
      bars('g', 5, 8, 'bridge', 'Bridge'),
      bars('c', 8, 12, 'chorus', 'Chorus'),
    ]);
  });

  it('runs a section after the last one to the end of the chart, at least a bar', () => {
    const list = [bars('v', 0, 4)];
    expect(markSectionAtBar(list, 6, 'Outro', FOUR, 10, 'o')).toEqual([
      bars('v', 0, 4),
      bars('o', 6, 10, 'outro', 'Outro'),
    ]);
    expect(markSectionAtBar(list, 6, 'Outro', FOUR, 4, 'o')).toEqual([
      bars('v', 0, 4),
      bars('o', 6, 7, 'outro', 'Outro'),
    ]);
  });

  it('starts the first section on an empty chart', () => {
    expect(markSectionAtBar([], 0, 'Intro', FOUR, 8, 'i')).toEqual([
      bars('i', 0, 8, 'intro', 'Intro'),
    ]);
  });

  it("counts bars in the project's metre", () => {
    expect(
      markSectionAtBar([section('v', 0, 8 * BAR3)], 4, 'Chorus', THREE, 8, 'c'),
    ).toEqual([
      section('v', 0, 4 * BAR3),
      section('c', 4 * BAR3, 8 * BAR3, 'chorus', 'Chorus'),
    ]);
  });
});

describe('removeSectionAtBar', () => {
  const list = [
    bars('a', 0, 4, 'intro', 'Intro'),
    bars('b', 4, 8),
    bars('c', 8, 12, 'chorus', 'Chorus'),
  ];

  it('removes the section that starts on the bar and leaves its bars unlabelled', () => {
    expect(removeSectionAtBar(list, 4, FOUR)).toEqual([
      bars('a', 0, 4, 'intro', 'Intro'),
      bars('c', 8, 12, 'chorus', 'Chorus'),
    ]);
  });

  it('finds a section that starts inside the bar', () => {
    const offBeat = [
      section('a', 0, 4 * BAR + 300),
      section('b', 4 * BAR + 300, 8 * BAR),
    ];
    expect(removeSectionAtBar(offBeat, 4, FOUR)).toEqual([
      section('a', 0, 4 * BAR + 300),
    ]);
  });

  it('returns the same list when no section starts on the bar', () => {
    expect(removeSectionAtBar(list, 5, FOUR)).toBe(list);
    expect(removeSectionAtBar(list, 2, FOUR)).toBe(list);
  });

  it("counts bars in the project's metre", () => {
    const waltz = [section('a', 0, 4 * BAR3), section('b', 4 * BAR3, 8 * BAR3)];
    expect(removeSectionAtBar(waltz, 4, THREE)).toEqual([
      section('a', 0, 4 * BAR3),
    ]);
    // In 4/4, tick 5,760 is in bar 3, not bar 4.
    expect(removeSectionAtBar(waltz, 4, FOUR)).toBe(waltz);
  });
});

describe('shiftSectionsForBars', () => {
  it('makes the section before a boundary longer when bars go in there, the two still adjacent', () => {
    expect(
      spans(
        shiftSectionsForBars([bars('a', 0, 4), bars('b', 4, 8)], 4, 2, FOUR),
      ),
    ).toEqual(['a 0-6', 'b 6-10']);
  });

  it('lengthens a section that bars go into', () => {
    expect(spans(shiftSectionsForBars([bars('a', 0, 4)], 2, 1, FOUR))).toEqual([
      'a 0-5',
    ]);
  });

  it('moves every section when bars go in before them all', () => {
    expect(
      spans(
        shiftSectionsForBars([bars('a', 2, 4), bars('b', 4, 6)], 0, 2, FOUR),
      ),
    ).toEqual(['a 4-6', 'b 6-8']);
  });

  it('leaves a section before the new bars alone', () => {
    expect(shiftSectionsForBars([bars('a', 0, 4)], 6, 2, FOUR)).toEqual([
      bars('a', 0, 4),
    ]);
  });

  it('shrinks a section that bars are deleted from', () => {
    expect(spans(shiftSectionsForBars([bars('a', 0, 8)], 2, -2, FOUR))).toEqual(
      ['a 0-6'],
    );
  });

  it('removes a section whose bars are all deleted', () => {
    const list = [bars('a', 0, 2), bars('b', 2, 4), bars('c', 4, 8)];
    expect(spans(shiftSectionsForBars(list, 2, -2, FOUR))).toEqual([
      'a 0-2',
      'c 2-6',
    ]);
  });

  it('keeps sections adjacent across a deleted boundary', () => {
    expect(
      spans(
        shiftSectionsForBars([bars('a', 0, 4), bars('b', 4, 8)], 3, -2, FOUR),
      ),
    ).toEqual(['a 0-3', 'b 3-6']);
  });

  it("counts bars in the project's metre", () => {
    expect(
      shiftSectionsForBars([section('a', 0, 2 * BAR3)], 1, 1, THREE),
    ).toEqual([section('a', 0, 3 * BAR3)]);
  });
});

describe('relabelForType', () => {
  it('renames a section that is named for its type', () => {
    expect(relabelForType(bars('v', 0, 4, 'verse', 'Verse'), 'chorus')).toBe(
      'Chorus',
    );
    expect(relabelForType(bars('v', 0, 4, 'verse', 'Verse 2'), 'chorus')).toBe(
      'Chorus',
    );
    expect(
      relabelForType(bars('p', 0, 4, 'pre-chorus', 'Pre-Chorus'), 'build-up'),
    ).toBe('Build-up');
  });

  it("keeps a name of the student's own", () => {
    expect(relabelForType(bars('v', 0, 4, 'verse', 'My part'), 'chorus')).toBe(
      'My part',
    );
    // The label names another type than the section's.
    expect(relabelForType(bars('v', 0, 4, 'verse', 'Chorus'), 'bridge')).toBe(
      'Chorus',
    );
    expect(relabelForType(bars('x', 0, 4, 'custom', 'A'), 'chorus')).toBe('A');
    expect(relabelForType(bars('x', 0, 4, 'custom', 'Custom'), 'chorus')).toBe(
      'Custom',
    );
  });
});
