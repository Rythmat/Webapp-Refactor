import { describe, expect, it } from 'vitest';
import { KEY_OF_COLORS } from '@/constants/theme';
import type { LiteracyReplayStep } from '@/content/musicLiteracy/schemas';
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
  resolveReplay,
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
    // C5, E5 and G5: middle C would need a ledger line.
    const major = stepNotes(lesson, triad, inKey('C', 'major'));
    expect(major.call.map((n) => n.midi)).toEqual([72, 76, 79]);
    // In the treble staff: A4, C5 and E5, not A3 below it.
    const minor = stepNotes(lesson, triad, inKey('A', 'minor'));
    expect(minor.call.map((n) => n.midi)).toEqual([69, 72, 76]);
    expect(minor.tonic).toBe(69);
    expect(minor.call.map((n) => n.degree)).toEqual(['1', 'b3', '5']);
    expect(minor.key).toEqual({ tonic: 'A', mode: 'minor' });
    // No choices yet: the lesson's key, C major.
    expect(stepNotes(lesson, triad).call.map((n) => n.midi)).toEqual([
      72, 76, 79,
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
    // In E♭ its 7 is D4, in the staff already: E♭4 and E♭5 need none, so
    // the lower.
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
    // C4 E4 G4, then up a 4th to F4 A4 C5: C5 to start would take F5's A5
    // and C6, and F4 under C5 is down a 5th.
    expect(call[0].chord.midis).toEqual([60, 64, 67]);
    expect(call[3].chord.midis).toEqual([65, 69, 72]);
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
    // A4 C5 E5, then D5 F5 A5: no ledger line but the A5's.
    expect(call[0].chord.midis).toEqual([69, 72, 76]);
    expect(call[3].chord.midis).toEqual([74, 77, 81]);
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
    // A4 C5 E5 G5, then up a minor 3rd to C5 E5 G5 B5: never down a 6th.
    expect(figure.chords[0].midis).toEqual([69, 72, 76, 79]);
    expect(figure.chords[1].midis).toEqual([72, 76, 79, 83]);
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

  it('voices its triads and then its 7ths as one figure, no root past a 4th', () => {
    const replay = part2Step('hear-four') as LiteracyReplayStep;
    const choices = saved(inKey('C', 'major'));
    const passes = resolveReplay(lesson, replay, choices);
    expect(passes.map((p) => p.harmony)).toEqual(['triads', 'sevenths']);
    // 6 4 5 3 comes round where it began: A4 F4 G4 E4, twice, in the staff.
    expect(passes.map((p) => p.chords.map((c) => c.root))).toEqual([
      [69, 65, 67, 64],
      [69, 65, 67, 64],
    ]);
    const roots = passes.flatMap((p) => p.chords.map((c) => c.root));
    expect(roots.slice(1).map((r, i) => r - roots[i])).toEqual([
      -4, 2, -3, 5, -4, 2, -3,
    ]);
    // What the step plays, bar by bar.
    expect(
      stepNotes(lesson, replay, choices).chords!.call.map((a) => a.chord.root),
    ).toEqual(roots);
  });

  it('starts its 7ths over as a new phrase when the progression climbs going round', () => {
    // Before the student chooses, the sample 4 5 6 2: F G A D. Both passes
    // sit on F4 in the staff; the 7ths start over rather than pushing the
    // triads down to F3 to come round within a 4th.
    const replay = part2Step('hear-four') as LiteracyReplayStep;
    const passes = resolveReplay(lesson, replay, inKey('C', 'major'));
    expect(passes.every((p) => p.sample)).toBe(true);
    expect(passes[0].degrees).toEqual(['4', '5', '6', '2']);
    expect(passes.map((p) => p.chords.map((c) => c.root))).toEqual([
      [65, 67, 69, 74],
      [65, 67, 69, 74],
    ]);
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
