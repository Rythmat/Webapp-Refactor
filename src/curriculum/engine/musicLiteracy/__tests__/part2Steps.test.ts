import { describe, expect, it } from 'vitest';
import { KEY_OF_COLORS } from '@/constants/theme';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import {
  emptyChoices,
  withMode,
  withProgression,
  withTonic,
  type LiteracyChoices,
} from '../choices';
import {
  lessonSections,
  resolveChordFigure,
  stepKey,
  stepNotes,
  stepTimeline,
} from '../literacy';
import { runCues } from '../run';
import { stepKeyColor, stepMode } from '../stepColor';

/**
 * Part 2's steps on their timelines, in the key the student chose: a
 * melody in scale numbering, a chord figure a chord a bar in its rhythm,
 * an X from a saved progression, a replay in each harmony.
 */

const lesson = PART2_FIXTURE;
const inKey = (tonic: 'C' | 'A' | 'Eb', mode: 'major' | 'minor') =>
  withMode(withTonic(emptyChoices(), tonic), mode);
const saved = (choices: LiteracyChoices) =>
  withProgression(
    withProgression(choices, 'one-x', {
      template: ['1', 'X'],
      chords: ['1', '6'],
      harmony: 'triads',
      tonic: choices.tonic ?? 'C',
      mode: choices.mode ?? 'major',
    }),
    'four',
    {
      template: ['X', 'X', 'X', 'X'],
      chords: ['6', '4', '5', '3'],
      harmony: 'sevenths',
      tonic: choices.tonic ?? 'C',
      mode: choices.mode ?? 'major',
    },
  );

describe('a melody in the student’s key', () => {
  it('plays 1-3-5 in their key and mode, the 3 flat in minor', () => {
    const triad = part2Step('one-three-five');
    const major = stepNotes(lesson, triad, inKey('C', 'major'));
    expect(major.call.map((n) => n.midi)).toEqual([60, 64, 67]);
    // In the treble staff: A4, C5 and E5, not A3 below it.
    const minor = stepNotes(lesson, triad, inKey('A', 'minor'));
    expect(minor.call.map((n) => n.midi)).toEqual([69, 72, 76]);
    expect(minor.tonic).toBe(69);
    expect(minor.call.map((n) => n.degree)).toEqual(['1', 'b3', '5']);
    expect(minor.key).toEqual({ tonic: 'A', mode: 'minor' });
    // No choices yet: the lesson's key, C major.
    expect(stepNotes(lesson, triad).call.map((n) => n.midi)).toEqual([
      60, 64, 67,
    ]);
  });

  it('puts the 7 neighbor below the 1, a ♭7 in minor', () => {
    const neighbor = part2Step('one-seven-one');
    // B3 is under middle C, so the whole figure goes up to C5: B4 in it.
    expect(
      stepNotes(lesson, neighbor, inKey('C', 'major')).call.map((n) => n.midi),
    ).toEqual([72, 71, 72]);
    expect(
      stepNotes(lesson, neighbor, inKey('C', 'minor')).call.map((n) => n.midi),
    ).toEqual([72, 70, 72]);
    // In E♭ its 7 is D4, in the staff already.
    expect(
      stepNotes(lesson, neighbor, inKey('Eb', 'major')).call.map((n) => n.midi),
    ).toEqual([63, 62, 63]);
  });

  it('comes straight in after the count-in when it has no words', () => {
    const timeline = stepTimeline(lesson, part2Step('one-three-five'));
    expect(timeline).toMatchObject({
      countIn: { start: 0, length: 1920 },
      words: { start: 1920, length: 0 },
      call: { start: 1920, length: 1920 },
      response: { start: 3840, length: 1920 },
      total: 5760,
    });
    const cues = runCues(lesson, part2Step('one-three-five'), 'play', {
      metronome: false,
      choices: inKey('A', 'minor'),
    });
    expect(
      cues.flatMap((c) =>
        c.kind === 'note' && c.segment === 'call' ? [c.midi] : [],
      ),
    ).toEqual([69, 72, 76]);
    expect(cues.some((c) => c.kind === 'beat' && c.phase === 'words')).toBe(
      false,
    );
  });

  it('wears the student’s mode’s color', () => {
    const triad = part2Step('one-three-five');
    expect(stepMode(lesson, triad, inKey('C', 'minor'))).toBe('minor');
    expect(stepKeyColor(lesson, triad, inKey('C', 'minor'))).toBe(
      KEY_OF_COLORS.Eb,
    );
    expect(stepKeyColor(lesson, triad, inKey('A', 'major'))).toBe(
      KEY_OF_COLORS.A,
    );
  });
});

describe('a chord figure on the timeline', () => {
  it('strikes each bar’s chord at every value of its rhythm', () => {
    const notes = stepNotes(
      lesson,
      part2Step('the-1-chord'),
      inKey('C', 'major'),
    );
    const { call, response } = notes.chords!;
    expect(
      call.map((a) => [a.onset, a.duration, a.bar, a.chord.label]),
    ).toEqual([
      [1920, 480, 0, '1 maj'],
      [2400, 480, 0, '1 maj'],
      [2880, 960, 0, '1 maj'],
      [3840, 480, 1, '4 maj'],
      [4320, 480, 1, '4 maj'],
      [4800, 960, 1, '4 maj'],
    ]);
    expect(call[0].chord.midis).toEqual([60, 64, 67]);
    expect(call[3].chord.midis).toEqual([53, 57, 60]);
    // The student echoes it in the two bars after.
    expect(response.map((a) => a.onset)).toEqual(
      call.map((a) => a.onset + 3840),
    );
    expect(notes.timeline).toMatchObject({
      call: { start: 1920, length: 3840 },
      response: { start: 5760, length: 3840 },
    });
    // Its notes, for the roll and the run: three to a chord.
    expect(notes.call).toHaveLength(18);
    expect(notes.call.slice(0, 3).map((n) => [n.midi, n.attack])).toEqual([
      [60, 0],
      [64, 0],
      [67, 0],
    ]);
    expect(notes.sample).toBe(false);
  });

  it('plays the chords in minor as minor’s', () => {
    const { call } = stepNotes(
      lesson,
      part2Step('the-1-chord'),
      inKey('A', 'minor'),
    ).chords!;
    expect([call[0].chord.label, call[3].chord.label]).toEqual([
      '1 min',
      '4 min',
    ]);
    expect(call[0].chord.midis).toEqual([57, 60, 64]);
  });

  it('plays a saved progression in the key it was made in', () => {
    const choices = saved(inKey('Eb', 'major'));
    const notes = stepNotes(lesson, part2Step('play-1-x'), choices);
    expect(notes.chords!.call.map((a) => a.chord.label)).toEqual([
      '1 maj',
      '1 maj',
      '1 maj',
      '6 min',
      '6 min',
      '6 min',
    ]);
    // The student has moved to A minor since: their progression stays in E♭.
    const moved = withMode(withTonic(choices, 'A'), 'minor');
    expect(stepKey(lesson, part2Step('play-1-x'), moved)).toEqual({
      tonic: 'Eb',
      mode: 'major',
    });
  });

  it('takes an X from the progression, in its own harmony', () => {
    const figure = resolveChordFigure(
      lesson,
      (
        part2Step('play-x-1') as {
          call: Parameters<typeof resolveChordFigure>[1];
        }
      ).call,
      saved(inKey('C', 'major')),
    );
    expect(figure.degrees).toEqual(['6', '1']);
    expect(figure.chords.map((c) => c.label)).toEqual(['6 min7', '1 maj7']);
    expect(figure.chords[0].midis).toEqual([57, 60, 64, 67]);
  });

  it('stands in common chords, and says so, before the student chooses', () => {
    const notes = stepNotes(lesson, part2Step('play-1-x'), inKey('C', 'major'));
    expect(notes.sample).toBe(true);
    expect(notes.chords!.call.map((a) => a.chord.label)).toEqual([
      '1 maj',
      '1 maj',
      '1 maj',
      '4 maj',
      '4 maj',
      '4 maj',
    ]);
  });
});

describe('a replay', () => {
  it('plays the progression as triads, then with 7ths, and asks nothing back', () => {
    const notes = stepNotes(
      lesson,
      part2Step('hear-four'),
      saved(inKey('C', 'major')),
    );
    const labels = notes.chords!.call.map((a) => a.chord.label);
    expect(labels).toEqual([
      '6 min',
      '4 maj',
      '5 maj',
      '3 min',
      '6 min7',
      '4 maj7',
      '5 dom7',
      '3 min7',
    ]);
    expect(notes.chords!.call.map((a) => a.onset)).toEqual([
      1920, 3840, 5760, 7680, 9600, 11520, 13440, 15360,
    ]);
    expect(notes.chords!.call.map((a) => a.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(notes.response).toEqual([]);
    expect(notes.timeline.response.length).toBe(0);
    expect(notes.timeline.total).toBe(1920 + 8 * 1920);
  });

  it('has nothing to lay out for a choose step', () => {
    const notes = stepNotes(lesson, part2Step('choose-x'));
    expect([notes.words, notes.call, notes.response, notes.chords]).toEqual([
      [],
      [],
      [],
      null,
    ]);
  });
});

describe('the sections', () => {
  it('groups consecutive steps under their label', () => {
    expect(
      lessonSections(lesson).map((s) => [s.title, s.steps.length]),
    ).toEqual([
      [null, 1],
      ['Choose a Color', 1],
      [null, 1],
      ['Create a Melody', 1],
      ['Chords', 4],
      ['7th Chords', 2],
    ]);
  });
});
