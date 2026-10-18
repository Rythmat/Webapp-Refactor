import { describe, expect, it } from 'vitest';
import type {
  LiteracyChooseChordsStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  PART2_FIXTURE,
  part2Step,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  addTemplateBar,
  barsText,
  beatsWords,
  chooserStandIn,
  chordBarOptions,
  progressionUsers,
  removeTemplateBar,
  renameSaved,
  rhythmPresets,
  rhythmTotal,
  savedBefore,
  toggleTemplateBar,
  xCount,
} from '../literacyChords';
import { lessonIssues } from '../literacyLesson';

/**
 * The editor's chords: what a chord call's bars may be, named in the
 * preview key; a rhythm's total against its bar; a template's bars; and the
 * saved progressions a step may play (only those saved before it).
 */

const FOUR_FOUR = [4, 4] as const;

describe('a chord call’s bars', () => {
  it('names each in the preview key and harmony, both modes when the student picks', () => {
    const options = chordBarOptions(PART2_FIXTURE, 'triads');
    expect(options.map((o) => [o.bar, o.label, o.other, o.available])).toEqual([
      ['1', '1 maj', '1 min', true],
      ['2', '2 min', null, false],
      ['3', '3 min', '♭3 maj', true],
      ['4', '4 maj', '4 min', true],
      ['5', '5 maj', '5 min', true],
      ['6', '6 min', '♭6 maj', true],
      ['7', null, '♭7 maj', false],
      ['X', null, null, true],
    ]);
    expect(options[1].reason).toBe('diminished in minor');
    expect(options[6].reason).toBe('diminished in major');
  });

  it('leaves out only the diminished chord of a lesson’s own mode', () => {
    const minor: MusicLiteracyLesson = {
      ...PART2_FIXTURE,
      keyChoice: undefined,
      key: { tonic: 'A', mode: 'minor' },
    };
    const options = chordBarOptions(minor, 'sevenths');
    expect(options.filter((o) => !o.available).map((o) => o.bar)).toEqual([
      '2',
    ]);
    expect(options.find((o) => o.bar === '7')?.label).toBe('♭7 dom7');
    expect(options.every((o) => o.other === null)).toBe(true);
  });
});

describe('a chord rhythm', () => {
  it('adds up against its bar: full, short of it, or past it', () => {
    expect(rhythmTotal([480, 480, 960], FOUR_FOUR)).toEqual({
      total: 1920,
      bar: 1920,
      rest: 0,
      over: 0,
    });
    expect(rhythmTotal([480, 480, 480], FOUR_FOUR)).toMatchObject({
      rest: 480,
      over: 0,
    });
    expect(rhythmTotal([960, 960, 480], FOUR_FOUR)).toMatchObject({
      rest: 0,
      over: 480,
    });
    expect(rhythmTotal([480, 480], [3, 4])).toMatchObject({
      bar: 1440,
      rest: 480,
    });
  });

  it('counts in beats, halves and quarters of one too', () => {
    expect(beatsWords(1920, FOUR_FOUR)).toBe('4 beats');
    expect(beatsWords(480, FOUR_FOUR)).toBe('1 beat');
    expect(beatsWords(720, FOUR_FOUR)).toBe('1½ beats');
    expect(beatsWords(240, FOUR_FOUR)).toBe('½ beat');
    expect(beatsWords(240, [6, 8])).toBe('1 beat');
  });

  it('offers quick rhythms that fill the bar', () => {
    const presets = rhythmPresets(FOUR_FOUR);
    expect(presets.map((p) => [p.label, p.rhythm])).toEqual([
      ['Short, short, long', [480, 480, 960]],
      ['Every beat', [480, 480, 480, 480]],
      ['Held all bar', [1920]],
    ]);
    for (const ts of [FOUR_FOUR, [3, 4], [2, 4], [6, 8]] as const)
      for (const preset of rhythmPresets(ts))
        expect(rhythmTotal(preset.rhythm, ts).rest, preset.label).toBe(0);
  });
});

describe('a choose-chords template', () => {
  it('switches a bar between 1 and X, adds an X, and keeps at least one bar', () => {
    const template = ['1', 'X'] as const;
    expect(toggleTemplateBar(template, 0)).toEqual(['X', 'X']);
    expect(toggleTemplateBar(template, 1)).toEqual(['1', '1']);
    expect(addTemplateBar(template)).toEqual(['1', 'X', 'X']);
    expect(addTemplateBar(Array(8).fill('X'))).toHaveLength(8);
    expect(removeTemplateBar(template, 0)).toEqual(['X']);
    expect(removeTemplateBar(['X'], 0)).toEqual(['X']);
    expect(xCount(['1', 'X', 'X', '1'])).toBe(2);
    expect(barsText(['1', 'X', 'X', 'X'])).toBe('| 1 | X | X | X |');
  });
});

describe('saved progressions', () => {
  const index = (tag: string) =>
    PART2_FIXTURE.steps.findIndex((step) => step.tag === tag);

  it('lists only those saved before a step', () => {
    const names = (tag: string) =>
      savedBefore(PART2_FIXTURE, index(tag)).map((s) => [s.name, s.index]);
    expect(names('the-1-chord')).toEqual([]);
    expect(names('play-1-x')).toEqual([['one-x', index('choose-x')]]);
    expect(names('choose-four')).toEqual([['one-x', index('choose-x')]]);
    expect(names('hear-four')).toEqual([
      ['one-x', index('choose-x')],
      ['four', index('choose-four')],
    ]);
  });

  it('knows which steps play one', () => {
    expect(progressionUsers(PART2_FIXTURE, 'one-x')).toEqual([
      index('play-1-x'),
      index('play-x-1'),
    ]);
    expect(progressionUsers(PART2_FIXTURE, 'four')).toEqual([
      index('hear-four'),
    ]);
  });

  it('renames one where it is saved and everywhere it is played, as a free tag', () => {
    const renamed = renameSaved(PART2_FIXTURE, index('choose-x'), 'My X!');
    expect(
      (renamed.steps[index('choose-x')] as LiteracyChooseChordsStep).saveAs,
    ).toBe('my-x');
    expect(progressionUsers(renamed, 'my-x')).toEqual([
      index('play-1-x'),
      index('play-x-1'),
    ]);
    expect(progressionUsers(renamed, 'one-x')).toEqual([]);
    expect(lessonIssues(renamed)).toEqual([]);
    // Another step's name is taken: it gets a number.
    const clash = renameSaved(PART2_FIXTURE, index('choose-x'), 'four');
    expect(
      (clash.steps[index('choose-x')] as LiteracyChooseChordsStep).saveAs,
    ).toBe('four-2');
    // Not a choose-chords step, or no change: the lesson as it was.
    expect(renameSaved(PART2_FIXTURE, 0, 'x')).toBe(PART2_FIXTURE);
    expect(renameSaved(PART2_FIXTURE, index('choose-x'), 'one-x')).toBe(
      PART2_FIXTURE,
    );
  });

  it('plays a choose-chords step as its sample, in its first player’s rhythm', () => {
    const chooser = part2Step('choose-x') as LiteracyChooseChordsStep;
    expect(chooserStandIn(PART2_FIXTURE, chooser).call).toEqual({
      chords: ['1', '4'],
      rhythm: [480, 480, 960],
      harmony: 'triads',
    });
    // Played only by a replay: a chord held each bar.
    const four = part2Step('choose-four') as LiteracyChooseChordsStep;
    expect(chooserStandIn(PART2_FIXTURE, four).call).toEqual({
      chords: ['4', '5', '6', '2'],
      rhythm: [1920],
      harmony: 'sevenths',
    });
  });
});
