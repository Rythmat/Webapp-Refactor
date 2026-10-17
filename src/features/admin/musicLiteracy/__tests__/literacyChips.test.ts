import { describe, expect, it } from 'vitest';
import type {
  LiteracyNote,
  LiteracyWord,
} from '@/content/musicLiteracy/schemas';
import { listMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  barBeat,
  dropIndex,
  figureChips,
  figureNotes,
  insertRest,
  lengthLabel,
  lineText,
  moveItem,
  moveSyllable,
  notesEnd,
  overlaps,
  overrun,
  restBefore,
  retypeLine,
  spanWords,
  splitSyllables,
  withRestBefore,
  wordsLine,
  wordsNotes,
  type FigureChip,
} from '../literacyChips';

/**
 * The editor's chips are views of the stored ticks: the words as a typed
 * line of syllables, a call or response as notes and rests. Each turns back
 * into exactly the notes it came from, and retyping a line keeps the notes
 * and rhythm of every syllable it can.
 */

const FOUR: [number, number] = [4, 4];
const word = (
  tick: number,
  duration: number,
  text: string,
  degree: LiteracyNote['degree'] = '1',
): LiteracyWord => ({ tick, duration, degree, text });

describe('the words line', () => {
  it('splits typed text into syllables at spaces and hyphens', () => {
    expect(
      splitSyllables('Hey hey hey  I’m gon-na play on a note called C'),
    ).toEqual([
      'Hey',
      'hey',
      'hey',
      'I’m',
      'gon-',
      'na',
      'play',
      'on',
      'a',
      'note',
      'called',
      'C',
    ]);
    expect(splitSyllables(' - ')).toEqual([]);
    expect(splitSyllables('mu-si-cal gra-vi-ty-')).toEqual([
      'mu-',
      'si-',
      'cal',
      'gra-',
      'vi-',
      'ty',
    ]);
  });

  it('writes a hyphenated word back whole', () => {
    const line = {
      syllables: ['That’s', 'mu-', 'si-', 'cal', 'gra-', 'vi-', 'ty'].map(
        (text) => ({ text }),
      ),
    } as unknown as Parameters<typeof lineText>[0];
    expect(lineText(line)).toBe('That’s mu-si-cal gra-vi-ty');
  });

  it('turns every seeded step’s words into a line and back, tick for tick', () => {
    const lessons = listMusicLiteracy();
    expect(lessons.length).toBeGreaterThan(0);
    for (const lesson of lessons)
      for (const step of lesson.steps)
        expect(wordsNotes(wordsLine(step.words.notes)), step.tag).toEqual(
          step.words.notes,
        );
  });

  it('keeps a rest before the first syllable, between two, and an octave', () => {
    const notes: LiteracyWord[] = [
      { tick: 240, duration: 240, degree: '5', octave: -1, text: 'Hey' },
      word(480, 480, 'there'),
      word(1440, 240, 'you', '3'),
    ];
    const line = wordsLine(notes);
    expect(line.lead).toBe(240);
    expect(line.syllables.map((s) => s.rest)).toEqual([0, 480, 0]);
    expect(line.syllables[0].octave).toBe(-1);
    expect(wordsNotes(line)).toEqual(notes);
  });

  it('keeps every note and length when the syllable count is unchanged', () => {
    const line = wordsLine([
      word(0, 480, 'When'),
      word(480, 240, 'I', '3'),
      word(960, 480, 'play', '5'),
    ]);
    const retyped = retypeLine(line, 'Now we play');
    expect(lineText(retyped)).toBe('Now we play');
    expect(wordsNotes(retyped)).toEqual([
      word(0, 480, 'Now'),
      word(480, 240, 'we', '3'),
      word(960, 480, 'play', '5'),
    ]);
  });

  it('keeps the syllables around a word put in or taken out', () => {
    const line = wordsLine([
      word(0, 240, 'play'),
      word(240, 240, 'the', '3'),
      word(960, 480, 'note', '5'),
    ]);
    // A word in the middle: the start and end keep their notes, the new
    // one sings the note before it, as long.
    const longer = retypeLine(line, 'play the low note');
    expect(longer.syllables.map((s) => [s.text, s.degree, s.duration])).toEqual(
      [
        ['play', '1', 240],
        ['the', '3', 240],
        ['low', '3', 240],
        ['note', '5', 480],
      ],
    );
    // The rest before "note" moved with "the"'s chip, and "low" has none.
    expect(longer.syllables.map((s) => s.rest)).toEqual([0, 480, 0, 0]);
    const shorter = retypeLine(line, 'play note');
    expect(shorter.syllables.map((s) => [s.text, s.degree])).toEqual([
      ['play', '1'],
      ['note', '5'],
    ]);
  });

  it('gives a line typed from empty a note per syllable', () => {
    const line = retypeLine({ lead: 0, syllables: [] }, 'one two');
    expect(wordsNotes(line)).toEqual([
      word(0, 480, 'one'),
      word(480, 480, 'two'),
    ]);
  });
});

describe('a figure’s chips', () => {
  it('turns every seeded call into chips and back, tick for tick', () => {
    for (const lesson of listMusicLiteracy())
      for (const step of lesson.steps)
        expect(figureNotes(figureChips(step.call.notes)), step.tag).toEqual(
          step.call.notes,
        );
  });

  it('makes a rest of every gap, and none after the last note', () => {
    const notes: LiteracyNote[] = [
      { tick: 0, duration: 480, degree: '1' },
      { tick: 960, duration: 240, degree: 'b3' },
      { tick: 1200, duration: 720, degree: '5', octave: 1 },
    ];
    const chips = figureChips(notes);
    expect(chips).toEqual<FigureChip[]>([
      { kind: 'note', degree: '1', octave: 0, duration: 480 },
      { kind: 'rest', duration: 480 },
      { kind: 'note', degree: 'b3', octave: 0, duration: 240 },
      { kind: 'note', degree: '5', octave: 1, duration: 720 },
    ]);
    expect(figureNotes(chips)).toEqual(notes);
  });

  it('starts with a rest when the first note is late, and rests stay gaps', () => {
    const chips: FigureChip[] = [
      { kind: 'rest', duration: 240 },
      { kind: 'note', degree: '1', octave: 0, duration: 240 },
      { kind: 'rest', duration: 120 },
      { kind: 'rest', duration: 120 },
      { kind: 'note', degree: '7', octave: -1, duration: 480 },
    ];
    const notes = figureNotes(chips);
    expect(notes).toEqual([
      { tick: 240, duration: 240, degree: '1' },
      { tick: 720, duration: 480, degree: '7', octave: -1 },
    ]);
    // Two rests in a row read back as one of their joint length.
    expect(figureNotes(figureChips(notes))).toEqual(notes);
  });
});

describe('positions and lengths', () => {
  it('counts bar · beat with the 16ths as "1 e & a"', () => {
    expect(barBeat(0, FOUR)).toBe('1·1');
    expect(barBeat(480 + 120, FOUR)).toBe('1·2e');
    expect(barBeat(1920 + 960 + 240, FOUR)).toBe('2·3&');
    expect(barBeat(360, FOUR)).toBe('1·1a');
    expect(barBeat(160, FOUR)).toBe('1·1trip');
    expect(barBeat(1440, [3, 4])).toBe('2·1');
  });

  it('says how far a line runs past its bars', () => {
    const notes = [word(0, 1920, 'long'), word(1920, 720, 'more')];
    expect(overrun(notes, 2, FOUR)).toBe(0);
    expect(overrun(notes, 1, FOUR)).toBe(720);
    expect(spanWords(720, FOUR)).toBe('1 beat and an eighth');
    expect(spanWords(1920 + 480, FOUR)).toBe('1 bar and 1 beat');
    expect(lengthLabel(480)).toBe('Quarter');
    expect(lengthLabel(160)).toBe('Eighth triplet');
    expect(lengthLabel(600)).toBe('Quarter + 16th');
    expect(lengthLabel(1920 + 960)).toBe('Whole + half');
    expect(lengthLabel(100)).toBe('100 ticks');
  });

  it('sees notes that overlap', () => {
    expect(overlaps([word(0, 480, 'a'), word(240, 240, 'b')])).toBe(true);
    expect(overlaps([word(0, 480, 'a'), word(480, 240, 'b')])).toBe(false);
  });
});

describe('reordering', () => {
  it('moves an item to where it is dropped', () => {
    const items = ['a', 'b', 'c', 'd'];
    // Dropped in the gap before "a", and in the gap after the last.
    expect(moveItem(items, 2, dropIndex(2, 0))).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(items, 0, dropIndex(0, 4))).toEqual(['b', 'c', 'd', 'a']);
    // Either side of itself, it stays.
    expect(dropIndex(1, 1)).toBe(1);
    expect(dropIndex(1, 2)).toBe(1);
    expect(moveItem(items, 1, 1)).toEqual(items);
  });
});

describe('dragging a syllable', () => {
  const line = () =>
    wordsLine([
      word(0, 480, 'Hey'),
      word(480, 240, 'there', '3'),
      // A quarter rest, then "you" on the 5.
      { tick: 1200, duration: 720, degree: '5', octave: 1, text: 'you' },
      word(1920, 480, 'all', '2'),
    ]);

  it('moves its note, its length and the rest before it with it', () => {
    const moved = moveSyllable(line(), 2, 0);
    expect(lineText(moved)).toBe('you Hey there all');
    expect(wordsNotes(moved)).toEqual([
      // The rest that was before "you" still is, so the line starts late.
      { tick: 480, duration: 720, degree: '5', octave: 1, text: 'you' },
      word(1200, 480, 'Hey'),
      word(1680, 240, 'there', '3'),
      word(1920, 480, 'all', '2'),
    ]);
    // Nothing lost: the line ends where it did.
    expect(notesEnd(wordsNotes(moved))).toBe(notesEnd(wordsNotes(line())));
  });

  it('takes the line’s opening rest with the first syllable', () => {
    const late = withRestBefore(line(), 0, 240);
    const moved = moveSyllable(late, 0, 3);
    expect(lineText(moved)).toBe('there you all Hey');
    expect(moved.lead).toBe(0);
    expect(wordsNotes(moved).map((n) => [n.text, n.tick])).toEqual([
      ['there', 0],
      ['you', 720],
      ['all', 1440],
      ['Hey', 2160],
    ]);
    expect(moveSyllable(moved, 3, 0)).toEqual(late);
  });

  it('turns back into exactly the ticks it shows', () => {
    for (const [from, to] of [
      [0, 3],
      [3, 0],
      [1, 2],
      [2, 1],
    ]) {
      const notes = wordsNotes(moveSyllable(line(), from, to));
      expect(wordsNotes(wordsLine(notes))).toEqual(notes);
    }
  });
});

describe('a rest before or after a syllable', () => {
  const line = () =>
    wordsLine([word(0, 480, 'one'), word(480, 480, 'two', '3')]);

  it('is the gap ahead of it: the line’s lead for the first', () => {
    const late = withRestBefore(line(), 0, 240);
    expect(restBefore(late, 0)).toBe(240);
    expect(wordsNotes(late)).toEqual([
      word(240, 480, 'one'),
      word(720, 480, 'two', '3'),
    ]);
  });

  it('after one syllable is before the next, the same gap', () => {
    const after = { ...line(), syllables: line().syllables.slice() };
    after.syllables[0] = { ...after.syllables[0], rest: 960 };
    const before = withRestBefore(line(), 1, 960);
    expect(before).toEqual(after);
    expect(restBefore(before, 1)).toBe(960);
    expect(wordsNotes(before)).toEqual([
      word(0, 480, 'one'),
      word(1440, 480, 'two', '3'),
    ]);
    expect(wordsLine(wordsNotes(before))).toEqual(before);
  });
});

describe('a rest before or after a figure’s note', () => {
  const notes: LiteracyNote[] = [
    { tick: 0, duration: 480, degree: '1' },
    { tick: 480, duration: 480, degree: '3' },
  ];

  it('puts a rest chip on that side, and the notes after it move up', () => {
    const chips = figureChips(notes);
    // Before note 2 (chip 1), and after it.
    expect(figureNotes(insertRest(chips, 1, 240))).toEqual([
      { tick: 0, duration: 480, degree: '1' },
      { tick: 720, duration: 480, degree: '3' },
    ]);
    // Before the first: the figure starts late.
    expect(figureNotes(insertRest(chips, 0, 960))).toEqual([
      { tick: 960, duration: 480, degree: '1' },
      { tick: 1440, duration: 480, degree: '3' },
    ]);
    // After note 1, which is before note 2: the same ticks.
    expect(figureNotes(insertRest(chips, 1, 480))).toEqual(
      figureNotes(insertRest(insertRest(chips, 1, 240), 1, 240)),
    );
  });

  it('joins a rest put next to another, and reads back tick for tick', () => {
    const chips = insertRest(insertRest(figureChips(notes), 1, 480), 1, 240);
    const stored = figureNotes(chips);
    expect(figureChips(stored)).toEqual<FigureChip[]>([
      { kind: 'note', degree: '1', octave: 0, duration: 480 },
      { kind: 'rest', duration: 720 },
      { kind: 'note', degree: '3', octave: 0, duration: 480 },
    ]);
    expect(figureNotes(figureChips(stored))).toEqual(stored);
  });

  it('moves a note or a rest chip alone when it is dragged', () => {
    const chips = insertRest(figureChips(notes), 1, 480);
    // The rest to the front: the figure starts late.
    expect(figureNotes(moveItem(chips, 1, 0))).toEqual([
      { tick: 480, duration: 480, degree: '1' },
      { tick: 960, duration: 480, degree: '3' },
    ]);
    // The second note to the front: the rest stays put, last, where it is
    // the silence before the bar line.
    expect(figureNotes(moveItem(chips, 2, 0))).toEqual([
      { tick: 0, duration: 480, degree: '3' },
      { tick: 480, duration: 480, degree: '1' },
    ]);
    // The first note to the end: it sounds after the rest.
    expect(figureNotes(moveItem(chips, 0, 2))).toEqual([
      { tick: 480, duration: 480, degree: '3' },
      { tick: 960, duration: 480, degree: '1' },
    ]);
  });
});
