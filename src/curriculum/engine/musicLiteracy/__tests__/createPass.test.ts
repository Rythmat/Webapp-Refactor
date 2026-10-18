import { describe, expect, it } from 'vitest';
import type { LiteracyStep } from '@/content/musicLiteracy/schemas';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import { PART2_FIXTURE, part2Step } from '../__fixtures__/part2Fixture';
import { emptyChoices, withMode, withTonic } from '../choices';
import {
  CREATE_GRID_TICKS,
  EMPTY_CALL_FEEDBACK,
  bestCreateReading,
  createPass,
  gradeCreateRepeat,
  quantizeTick,
  transcribeCall,
  type CreatePass,
} from '../createPass';
import { LITERACY_PASS_MARK, isRightNote, type PlayedNote } from '../grading';
import { createRunCues, type RunGroove } from '../run';

/**
 * Pass 2, "Now Create Your Own Rhythms!": the student's own call on the
 * step's material, quantized to 16ths and transcribed, then their repeat
 * of it graded against it, on one pulse after the count-in.
 */

const lesson = PART2_FIXTURE;
const cMajor = withMode(withTonic(emptyChoices(), 'C'), 'major');
const pass = (tag: string, choices = cMajor): CreatePass =>
  createPass(lesson, part2Step(tag), choices)!;

const melody = pass('one-three-five');
const CALL = melody.timeline.call.start; // 1920
const REPEAT = melody.timeline.response.start; // 3840

const note = (midi: number, onset: number, duration = 400): PlayedNote => ({
  midi,
  onset,
  duration,
});

/** The student's call, and the same again in the repeat, `off` ticks off. */
const callAndRepeat = (
  call: PlayedNote[],
  off = 0,
  at = REPEAT - CALL,
): PlayedNote[] => [
  ...call,
  ...call.map((n) => ({ ...n, onset: n.onset + at + off })),
];

const grade = (p: CreatePass, played: PlayedNote[]) =>
  gradeCreateRepeat(p, transcribeCall(p, played), played, {
    tempo: 80,
    passMark: LITERACY_PASS_MARK,
  });

describe('the create pass', () => {
  it('lasts the call’s bars by default, after a count-in, then the repeat', () => {
    expect(melody.bars).toBe(1);
    expect(melody.timeline).toMatchObject({
      countIn: { start: 0, length: 1920 },
      words: { start: 1920, length: 0 },
      call: { start: 1920, length: 1920 },
      response: { start: 3840, length: 1920 },
      total: 5760,
    });
    const chords = pass('the-1-chord');
    expect(chords.bars).toBe(2);
    expect(chords.timeline.total).toBe(1920 + 2 * 3840);
  });

  it('takes its own bars when the step sets them', () => {
    const long = {
      ...part2Step('one-three-five'),
      passes: { createBars: 2 },
    } as LiteracyStep;
    const p = createPass(lesson, long, cMajor)!;
    expect(p.bars).toBe(2);
    expect(p.timeline.response).toEqual({ start: 5760, length: 3840 });
  });

  it('is the step’s material: only 1, 3 and 5 on 1-3-5, in the chosen mode', () => {
    expect(melody.material).toMatchObject({ kind: 'notes' });
    const midis = (p: CreatePass) =>
      p.material.kind === 'notes' ? p.material.notes.map((n) => n.midi) : [];
    expect(midis(melody)).toEqual([60, 64, 67]);
    const minor = pass('one-three-five', withMode(cMajor, 'minor'));
    expect(midis(minor)).toEqual([60, 63, 67]);
    expect(
      minor.material.kind === 'notes' &&
        minor.material.notes.map((n) => [n.written.degree, n.degree]),
    ).toEqual([
      ['1', '1'],
      ['3', 'b3'],
      ['5', '5'],
    ]);
    // A chord call's material: each bar's chord.
    const chords = pass('the-1-chord');
    expect(
      chords.material.kind === 'chords' &&
        chords.material.chords.map((c) => c.label),
    ).toEqual(['1 maj', '4 maj']);
  });

  it('isn’t there where the step has none: Part 1, a choose step', () => {
    for (const step of LITERACY_FIXTURE.steps)
      expect(createPass(LITERACY_FIXTURE, step)).toBeNull();
    expect(createPass(lesson, part2Step('choose-x'))).toBeNull();
    const off = { ...part2Step('one-three-five'), passes: { create: false } };
    expect(createPass(lesson, off as LiteracyStep)).toBeNull();
  });
});

describe('quantizing the call', () => {
  it('rounds to the nearest 16th', () => {
    expect(CREATE_GRID_TICKS).toBe(120);
    expect([0, 59, 60, 179, 181, -50].map((t) => quantizeTick(t))).toEqual([
      0, 0, 120, 120, 240, 0,
    ]);
  });

  it('transcribes a melody onto the 16th grid, in the format’s own notes', () => {
    const played = [
      note(60, CALL - 40, 430), // just early: on the downbeat
      note(64, CALL + 470, 200),
      note(64, CALL + 735, 190),
      note(67, CALL + 965, 1200), // held past the call: up to its end
    ];
    const t = transcribeCall(melody, played);
    expect(t.empty).toBe(false);
    expect(t.flags).toEqual([]);
    expect(t.figure).toEqual({
      bars: 1,
      notes: [
        { tick: 0, duration: 360, degree: '1' },
        { tick: 480, duration: 240, degree: '3' },
        { tick: 720, duration: 240, degree: '3' },
        { tick: 960, duration: 960, degree: '5' },
      ],
    });
    expect(t.used).toHaveLength(4);
    expect(t.targets.map((n) => [n.midi, n.onset])).toEqual([
      [60, REPEAT],
      [64, REPEAT + 480],
      [64, REPEAT + 720],
      [67, REPEAT + 960],
    ]);
  });

  it('keeps a note no longer than the next one starts, a 16th at least', () => {
    const t = transcribeCall(melody, [
      note(60, CALL, 900), // legato into the 3
      note(64, CALL + 480, 10),
      note(64, CALL + 482, 10), // the same key, the same 16th: one note
    ]);
    expect(t.figure?.notes).toEqual([
      { tick: 0, duration: 480, degree: '1' },
      { tick: 480, duration: 120, degree: '3' },
    ]);
  });

  it('writes the call the lesson’s way: in minor, ♭3 is "3"', () => {
    const minor = pass('one-three-five', withMode(cMajor, 'minor'));
    const t = transcribeCall(minor, [note(63, CALL), note(67, CALL + 480)]);
    expect(t.figure?.notes.map((n) => n.degree)).toEqual(['3', '5']);
    expect(t.targets.map((n) => n.degree)).toEqual(['b3', '5']);
  });

  it('leaves out and flags a note off the material', () => {
    const t = transcribeCall(melody, [
      note(60, CALL),
      note(62, CALL + 480),
      note(65, CALL + 960),
    ]);
    expect(t.figure?.notes.map((n) => n.degree)).toEqual(['1']);
    expect(t.flags.map((f) => [f.reason, f.tick, f.message])).toEqual([
      [
        'offMaterial',
        480,
        '2 isn’t one of this step’s notes: play 1, 3 and 5.',
      ],
      [
        'offMaterial',
        960,
        '4 isn’t one of this step’s notes: play 1, 3 and 5.',
      ],
    ]);
    // Taken by the call all the same: never heard as the repeat.
    expect(t.used).toHaveLength(3);
  });

  it('leaves the count-in and the repeat out of the call', () => {
    const t = transcribeCall(melody, [
      note(60, 960), // noodling in the count-in
      note(64, CALL + 480),
      note(67, REPEAT - 50), // the repeat's first note, a touch early
    ]);
    expect(t.figure?.notes.map((n) => n.tick)).toEqual([480]);
    expect(t.used.map((n) => n.midi)).toEqual([64]);
  });

  it('calls a call with nothing of the material empty: try again', () => {
    expect(transcribeCall(melody, []).empty).toBe(true);
    const off = transcribeCall(melody, [note(62, CALL)]);
    expect(off.empty).toBe(true);
    expect(off.figure).toBeNull();
    expect(off.flags).toHaveLength(1);
    expect(grade(melody, [note(62, CALL)])).toEqual({
      kind: 'empty',
      passed: false,
      feedbackText: EMPTY_CALL_FEEDBACK,
    });
  });
});

describe('transcribing chords', () => {
  const chords = pass('the-1-chord');
  const C = [60, 64, 67];
  const F = [53, 57, 60];
  const strike = (midis: number[], onset: number, duration = 400) =>
    midis.map((midi, i) => note(midi, onset + i * 20, duration));

  it('clusters notes struck together into one chord, on the grid', () => {
    const t = transcribeCall(chords, [
      ...strike([64, 67, 72], CALL + 10, 900), // C, first inversion
      ...strike(F, CALL + 1920 + 470, 300),
    ]);
    expect(t.flags).toEqual([]);
    expect(
      t.chords.map((c) => [c.tick, c.duration, c.bar, c.chord.label]),
    ).toEqual([
      [0, 960, 0, '1 maj'],
      [2400, 360, 1, '4 maj'],
    ]);
    // Drawn as the bar's chord, root position, in the lesson's numbering.
    expect(t.figure?.notes.slice(0, 3)).toEqual([
      { tick: 0, duration: 960, degree: '1' },
      { tick: 0, duration: 960, degree: '3' },
      { tick: 0, duration: 960, degree: '5' },
    ]);
    expect(t.attacks.map((a) => a.onset)).toEqual([
      chords.timeline.response.start,
      chords.timeline.response.start + 2400,
    ]);
  });

  it('checks each chord against its bar’s, and flags what doesn’t fit', () => {
    const t = transcribeCall(chords, [
      ...strike(F, CALL), // F in bar 1, the 1 chord's bar
      ...strike([60, 64], CALL + 960), // C missing its 5
      ...strike([...F, 62], CALL + 1920), // F with a D
    ]);
    expect(t.flags.map((f) => [f.reason, f.bar])).toEqual([
      // F in the 1 chord's bar: its F and A aren't C's, its C alone is.
      ['notInChord', 0],
      ['missingChordTones', 0],
      ['missingChordTones', 0],
      ['notInChord', 1],
    ]);
    expect(t.flags[0].notes.map((n) => n.midi)).toEqual([53, 57]);
    expect(t.flags[2].missing).toEqual([7]);
    expect(t.flags[3].notes.map((n) => n.midi)).toEqual([62]);
    // F's C is the 1 chord's too: that chord is kept, as bar 1's 1 chord.
    expect(t.chords.map((c) => [c.tick, c.chord.label])).toEqual([
      [0, '1 maj'],
      [960, '1 maj'],
      [1920, '4 maj'],
    ]);
  });

  it('keeps a chord inside its bar', () => {
    const t = transcribeCall(chords, strike(C, CALL + 960, 3000));
    expect(t.chords[0]).toMatchObject({ tick: 960, duration: 960, bar: 0 });
  });

  it('calls a call of no chord tones empty', () => {
    const t = transcribeCall(chords, strike([61, 66], CALL));
    expect(t.empty).toBe(true);
    expect(t.flags.map((f) => f.reason)).toEqual(['notInChord']);
  });
});

describe('grading the repeat', () => {
  const call = [
    note(60, CALL),
    note(64, CALL + 240),
    note(67, CALL + 960, 900),
  ];

  it('passes the call repeated exactly, right after it', () => {
    const result = grade(melody, callAndRepeat(call));
    expect(result.kind).toBe('notes');
    expect(result.passed).toBe(true);
    if (result.kind === 'notes') {
      expect(result.result.percent).toBe(100);
      expect(result.result.feedbackText).toBe(
        'You repeated your own rhythm. Nice!',
      );
    }
  });

  it('fails a repeat in another rhythm, by the same pass rule', () => {
    const other = [
      note(60, REPEAT),
      note(64, REPEAT + 960),
      note(67, REPEAT + 1440),
    ];
    const result = grade(melody, [...call, ...other]);
    expect(result.passed).toBe(false);
    const late = grade(melody, callAndRepeat(call, 150));
    expect(late.kind === 'notes' && late.result.percent).toBeLessThan(100);
  });

  it('never takes the call’s own notes for the repeat', () => {
    const result = grade(melody, call);
    expect(result.passed).toBe(false);
    expect(result.kind === 'notes' && result.result.missedNotes).toEqual([
      60, 64, 67,
    ]);
  });

  it('grades a chord repeat as a chord echo', () => {
    const chords = pass('the-1-chord');
    const strike = (midis: number[], onset: number) =>
      midis.map((midi) => note(midi, onset, 300));
    const own = [
      ...strike([60, 64, 67], CALL),
      ...strike([60, 64, 67], CALL + 1440),
      ...strike([53, 57, 60], CALL + 1920),
    ];
    const repeat = chords.timeline.response.start - CALL;
    const passed = grade(chords, callAndRepeat(own, 0, repeat));
    expect(passed.kind).toBe('chords');
    expect(passed.passed).toBe(true);
    const missingFifth = grade(chords, [
      ...own,
      ...own
        .filter((n) => n.midi !== 67 && n.midi !== 60)
        .map((n) => ({ ...n, onset: n.onset + repeat })),
    ]);
    expect(missingFifth.passed).toBe(false);
  });

  it('lights the call’s own notes right in the repeat, through the existing check', () => {
    const t = transcribeCall(melody, call);
    expect(isRightNote(64, REPEAT + 240, t.targets, melody.timeline)).toBe(
      true,
    );
    expect(isRightNote(60, REPEAT + 240, t.targets, melody.timeline)).toBe(
      false,
    );
    // The student's call is theirs: never wrong while they make it.
    expect(isRightNote(62, CALL + 100, t.targets, melody.timeline)).toBe(true);
  });
});

describe('the create pass’s run', () => {
  const groove: RunGroove = {
    loopTicks: 1920,
    hits: [0, 960].map((tick) => ({ tick, note: 36, velocity: 100 })),
  };

  it('counts in, then the student’s call and repeat on one pulse, Atlas silent', () => {
    const cues = createRunCues(lesson, melody, { metronome: true });
    const beats = cues.filter((c) => c.kind === 'beat');
    expect(beats.map((b) => b.tick)).toEqual(
      Array.from({ length: 12 }, (_, i) => i * 480),
    );
    expect(beats.map((b) => b.kind === 'beat' && b.phase)).toEqual([
      ...Array(4).fill('countIn'),
      ...Array(4).fill('call'),
      ...Array(4).fill('response'),
    ]);
    expect(cues.some((c) => c.kind === 'note')).toBe(false);
    expect(cues.at(-1)).toEqual({ kind: 'end', tick: 5760 });
  });

  it('clicks the count-in always, the rest as the setting says', () => {
    const quiet = createRunCues(lesson, melody, { metronome: false });
    expect(
      quiet.flatMap((c) => (c.kind === 'beat' && c.click ? [c.tick] : [])),
    ).toEqual([0, 480, 960, 1440]);
  });

  it('brings a groove in on the call’s downbeat and lands it after the repeat', () => {
    const cues = createRunCues(lesson, melody, { metronome: false, groove });
    const drums = cues.flatMap((c) => (c.kind === 'drum' ? [c.tick] : []));
    expect(drums[0]).toBe(1920);
    expect(drums.filter((t) => t === 5760)).toHaveLength(2); // kick + crash
    expect(cues.at(-1)).toEqual({ kind: 'end', tick: 5760 + 960 });
  });
});

describe('the call’s last eighth', () => {
  const timing = { tempo: 80, passMark: LITERACY_PASS_MARK };
  // 1-3-5 in C: the student's call is C on 1, E on 2, G on 3.
  const call = [note(60, CALL), note(64, CALL + 480), note(67, CALL + 960)];

  it('reads a repeat’s downbeat played a little early as the repeat’s', () => {
    // The repeat's first C comes 140 ticks early, inside the call's last eighth.
    const played = [
      ...call,
      note(60, REPEAT - 140),
      note(64, REPEAT + 480),
      note(67, REPEAT + 960),
    ];
    const plain = grade(melody, played);
    expect(plain.kind).toBe('notes');
    if (plain.kind === 'notes') expect(plain.passed).toBe(false);

    const best = bestCreateReading(melody, played, timing);
    expect(best.transcription.targets.map((t) => t.midi)).toEqual([60, 64, 67]);
    expect(best.result.passed).toBe(true);
  });

  it('keeps a note meant for the call’s last "and" in the call', () => {
    // The call ends on the "and" of 4, and the repeat plays it there too.
    const syncopated = [...call, note(64, REPEAT - 240, 200)];
    const played = callAndRepeat(syncopated);
    const best = bestCreateReading(melody, played, timing);
    expect(best.transcription.targets.map((t) => t.midi)).toEqual([
      60, 64, 67, 64,
    ]);
    expect(best.result.passed).toBe(true);
  });

  it('reads it as the call when nothing in the repeat says otherwise', () => {
    const played = [...call, note(64, REPEAT - 240, 200)];
    const best = bestCreateReading(melody, played, timing);
    expect(best.transcription.targets).toHaveLength(4);
  });

  it('leaves a call with nothing in its last eighth alone', () => {
    const played = callAndRepeat(call);
    const best = bestCreateReading(melody, played, timing);
    expect(best.transcription).toEqual(transcribeCall(melody, played));
    expect(best.result.passed).toBe(true);
  });
});
