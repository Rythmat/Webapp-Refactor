import { describe, expect, it } from 'vitest';
import type {
  LiteracyNote,
  LiteracyWord,
} from '@/content/musicLiteracy/schemas';
import { listMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  barBeat,
  figureChips,
  figureNotes,
  lengthLabel,
  lineText,
  overlaps,
  overrun,
  retypeLine,
  spanWords,
  splitSyllables,
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
      'gon',
      'na',
      'play',
      'on',
      'a',
      'note',
      'called',
      'C',
    ]);
    expect(splitSyllables(' - ')).toEqual([]);
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
