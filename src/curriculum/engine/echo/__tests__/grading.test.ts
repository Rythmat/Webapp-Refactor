import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import { bossCalls, chordCall, melodyCall } from '../calls';
import {
  bossTimelines,
  chordEchoNotes,
  echoCountOff,
  echoTimeline,
  gradeChordEcho,
  gradeEcho,
  gradeMelodyEcho,
  melodyEchoNotes,
} from '../grading';
import { echoRandom } from '../random';
import { msToTicks } from '../tempo';

/**
 * An echo graded by Music Literacy's graders on a run of count-in, call
 * and response: an exact echo passes, a wrong one fails, by the series'
 * pass rule.
 */

const KEY = { tonic: 'D', mode: 'major' } as const;

describe('the run', () => {
  it('lays out a bar of count-in, the call, a bar’s count-off, then the response', () => {
    // A melody's call is a bar, and so is its answer.
    const call = melodyCall(1, KEY, echoRandom(1));
    const timeline = echoTimeline(call);
    expect(timeline.countIn).toEqual({ start: 0, length: 1920 });
    expect(timeline.call).toEqual({ start: 1920, length: 1920 });
    expect(echoCountOff(timeline)).toEqual({ start: 3840, length: 1920 });
    expect(timeline.response).toEqual({ start: 5760, length: 1920 });
    expect(timeline.words.length).toBe(0);
    expect(timeline.total).toBe(7680);
    // A chord call's two bars, the count-off, and two to answer.
    const chords = echoTimeline(chordCall(1, KEY, echoRandom(1)));
    expect(chords.call).toEqual({ start: 1920, length: 3840 });
    expect(echoCountOff(chords)).toEqual({ start: 5760, length: 1920 });
    expect(chords.response).toEqual({ start: 7680, length: 3840 });
    expect(timeline.tempo).toBe(80);
    expect(echoTimeline(call, { tempo: 96, countInBars: 2 })).toMatchObject({
      call: { start: 3840 },
      tempo: 96,
    });
  });

  it('places the response as the call again, on the response’s bars', () => {
    const call = melodyCall(2, KEY, echoRandom(2));
    const timeline = echoTimeline(call);
    const notes = melodyEchoNotes(call, timeline);
    notes.response.forEach((note, i) => {
      expect(note.midi).toBe(notes.call[i].midi);
      // A bar's call, a bar's count-off: two bars on.
      expect(note.onset - notes.call[i].onset).toBe(3840);
    });
    expect(notes.call[0].onset).toBe(1920);
  });

  it('plays the boss’s calls back to back after one count-in', () => {
    const calls = bossCalls(2, KEY, echoRandom(3));
    const timelines = bossTimelines(calls);
    // Melody, chords, melody, chords: a bar's call, a bar's count-off and
    // a bar's answer, or two, one and two.
    expect(timelines.map((t) => t.call.start)).toEqual([
      1920,
      1920 + 5760,
      1920 + 5760 + 9600,
      1920 + 2 * 5760 + 9600,
    ]);
    expect(timelines.at(-1)!.total).toBe(1920 + 2 * 5760 + 2 * 9600);
  });
});

/** Exactly what the response asks, a little late if `late`. */
const playMelody = (
  call: ReturnType<typeof melodyCall>,
  late = 0,
  shift = 0,
): PlayedNote[] =>
  melodyEchoNotes(call, echoTimeline(call)).response.map((note) => ({
    midi: note.midi + shift,
    onset: note.onset + late,
    duration: note.duration,
  }));

describe('a melody echo', () => {
  it('passes an exact echo at 100%', () => {
    const rng = echoRandom('exact');
    for (let i = 0; i < 20; i++) {
      const call = melodyCall(3, KEY, rng);
      const result = gradeMelodyEcho(call, playMelody(call));
      expect(result.passed).toBe(true);
      expect(result.percent).toBe(100);
    }
  });

  it('fails wrong notes, nothing, and the call played along only', () => {
    const call = melodyCall(1, KEY, echoRandom('wrong'));
    expect(gradeMelodyEcho(call, playMelody(call, 0, 1)).passed).toBe(false);
    expect(gradeMelodyEcho(call, []).passed).toBe(false);
    const alongWithCall = melodyEchoNotes(call, echoTimeline(call)).call.map(
      (note) => ({ midi: note.midi, onset: note.onset, duration: 240 }),
    );
    expect(gradeMelodyEcho(call, alongWithCall).passed).toBe(false);
  });

  it('fails the right notes a beat late', () => {
    const call = melodyCall(2, KEY, echoRandom('late'));
    const result = gradeMelodyEcho(call, playMelody(call, 480));
    expect(result.passed).toBe(false);
  });

  it('grades at a timeline’s place, for the boss’s later calls', () => {
    const calls = bossCalls(1, KEY, echoRandom('boss'));
    const timelines = bossTimelines(calls);
    const third = calls[2];
    if (third.kind !== 'melody') throw new Error('melody third');
    const played = melodyEchoNotes(third, timelines[2]).response.map((n) => ({
      midi: n.midi,
      onset: n.onset,
      duration: n.duration,
    }));
    expect(gradeEcho(third, played, { timeline: timelines[2] }).passed).toBe(
      true,
    );
    // The same notes, graded as if the call came first, are far off.
    expect(gradeEcho(third, played).passed).toBe(false);
  });
});

/** Every chord tone of every response strike, a few ticks apart. */
const playChords = (
  call: ReturnType<typeof chordCall>,
  pick: (midis: readonly number[]) => number[] = (m) => [...m],
): PlayedNote[] =>
  chordEchoNotes(call, echoTimeline(call)).response.flatMap((attack) =>
    pick(attack.chord.midis).map((midi, i) => ({
      midi,
      onset: attack.onset + i * 10,
      duration: attack.duration,
    })),
  );

describe('a chord echo', () => {
  it('passes the right chords in time', () => {
    const rng = echoRandom('chords');
    for (let i = 0; i < 20; i++) {
      const call = chordCall((1 + (i % 3)) as 1 | 2 | 3, KEY, rng);
      const result = gradeChordEcho(call, playChords(call));
      expect(result.passed).toBe(true);
      expect(result.percent).toBe(100);
    }
  });

  it('passes an inversion in another octave: graded by pitch class', () => {
    const call = chordCall(1, KEY, echoRandom('inversion'));
    const result = gradeChordEcho(
      call,
      playChords(call, ([root, third, fifth]) => [
        third - 12,
        fifth,
        root + 12,
      ]),
    );
    expect(result.passed).toBe(true);
  });

  it('fails wrong chords and chords missing a note', () => {
    const call = chordCall(1, KEY, echoRandom('wrong-chords'), {
      degrees: ['1', '4'],
    });
    const wrong = playChords(call, (m) => m.map((midi) => midi + 2));
    expect(gradeChordEcho(call, wrong).passed).toBe(false);
    const thin = playChords(call, ([root, , fifth]) => [root, fifth]);
    const result = gradeChordEcho(call, thin);
    expect(result.passed).toBe(false);
    expect(result.attacks.every((a) => a.status === 'wrong')).toBe(true);
  });
});

describe('a chord echo in 16ths', () => {
  /**
   * A call of chords a 16th apart at a tempo (the Double Skank: two on
   * each offbeat), and its response played back.
   */
  const sixteenths = (tempo: number, rollMs = 15, early = 0) => {
    const call = chordCall(3, KEY, echoRandom('sixteenths'), {
      degrees: ['1', '4'],
      rhythmId: 'comp_reg_04',
      tempo,
    });
    const timeline = echoTimeline(call);
    const played = chordEchoNotes(call, timeline).response.flatMap(
      (attack, a) =>
        attack.chord.midis.map((midi, i) => ({
          midi,
          // Every other strike rushed by `early` ticks.
          onset:
            attack.onset - (a % 2 ? early : 0) + msToTicks(i * rollMs, tempo),
          duration: 100,
        })),
    );
    return { call, timeline, played };
  };

  it('hears every strike, a 16th apart, at 80, 100 and 116 BPM', () => {
    for (const tempo of [80, 100, 116]) {
      const { call, timeline, played } = sixteenths(tempo);
      expect(timeline.tempo).toBe(tempo);
      // Two a beat, four beats; then three, the last beat the breath.
      expect(call.attacks).toHaveLength(2 * 4 + 2 * 3);
      const result = gradeChordEcho(call, played);
      expect(
        result.attacks.every((a) => a.status === 'hit'),
        `${tempo}`,
      ).toBe(true);
      expect(result.extraAttacks).toEqual([]);
      expect(result.percent).toBe(100);
      expect(result.passed).toBe(true);
    }
  });

  it('keeps them two, every other one rushed, where 100 ticks would join them', () => {
    for (const tempo of [80, 100, 116]) {
      const { call, played } = sixteenths(tempo, 15, 40);
      const result = gradeChordEcho(call, played);
      expect(result.attacks.every((a) => a.status === 'hit')).toBe(true);
      expect(result.extraAttacks).toEqual([]);
      expect(result.passed).toBe(true);
    }
  });

  it('hears a rolled chord (about 30 ms) as one', () => {
    for (const tempo of [80, 100, 116]) {
      const { call, played } = sixteenths(tempo, 15);
      const result = gradeChordEcho(call, played);
      expect(result.attacks.map((a) => a.struck?.notes.length)).toEqual(
        call.attacks.map(() => 3),
      );
    }
  });

  it('keeps the pass rule: the right chords off the beat fail on timing', () => {
    const call = chordCall(1, KEY, echoRandom('off-beat'), {
      degrees: ['1', '5'],
      rhythmId: 'comp_pop_01',
      tempo: 116,
    });
    const played = chordEchoNotes(call, echoTimeline(call)).response.flatMap(
      (attack) =>
        attack.chord.midis.map((midi) => ({
          midi,
          onset: attack.onset + 100,
          duration: 300,
        })),
    );
    const result = gradeChordEcho(call, played);
    expect(result.percent).toBeGreaterThanOrEqual(70);
    expect(result.timingAccuracy).toBeLessThan(0.5);
    expect(result.passed).toBe(false);
  });
});

describe('a chord held, struck again', () => {
  /** Quarter-note chords: the 1, then the 4. */
  const quarters = () =>
    chordCall(1, KEY, echoRandom('held'), {
      degrees: ['1', '4'],
      rhythmId: 'comp_pop_01',
    });

  it('passes the root and fifth held, the third struck again on each beat', () => {
    const call = quarters();
    const timeline = echoTimeline(call);
    const response = chordEchoNotes(call, timeline).response;
    const played = [0, 1].flatMap((bar) => {
      const strikes = response.filter((attack) => attack.bar === bar);
      const [root, third, fifth] = strikes[0].chord.midis;
      const start = strikes[0].onset;
      const length = strikes.length * 480 - 20;
      return [
        { midi: root, onset: start, duration: length },
        { midi: fifth, onset: start + 10, duration: length },
        ...strikes.map((attack) => ({
          midi: third,
          onset: attack.onset + 5,
          duration: 400,
        })),
      ];
    });
    const result = gradeChordEcho(call, played);
    expect(result.attacks.every((a) => a.status === 'hit')).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('costs a note held outside the chord once, where it was struck', () => {
    const call = quarters();
    const timeline = echoTimeline(call);
    const response = chordEchoNotes(call, timeline).response;
    const played = response.flatMap((attack) =>
      attack.chord.midis.map((midi) => ({
        midi,
        onset: attack.onset,
        duration: 400,
      })),
    );
    // A stray key under the first chord, held to the end.
    played.push({ midi: 63, onset: response[0].onset, duration: 0 });
    const result = gradeChordEcho(call, played);
    expect(result.extras.map((n) => n.midi)).toEqual([63]);
    expect(result.attacks.every((a) => a.status === 'hit')).toBe(true);
  });
});
