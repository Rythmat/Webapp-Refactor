import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import { bossCalls, chordCall, melodyCall } from '../calls';
import {
  bossTimelines,
  chordEchoNotes,
  echoTimeline,
  gradeChordEcho,
  gradeEcho,
  gradeMelodyEcho,
  melodyEchoNotes,
} from '../grading';
import { echoRandom } from '../random';

/**
 * An echo graded by Music Literacy's graders on a run of count-in, call
 * and response: an exact echo passes, a wrong one fails, by the series'
 * pass rule.
 */

const KEY = { tonic: 'D', mode: 'major' } as const;

describe('the run', () => {
  it('lays out a bar of count-in, the call, then the response', () => {
    const call = melodyCall(1, KEY, echoRandom(1));
    const timeline = echoTimeline(call);
    expect(timeline.countIn).toEqual({ start: 0, length: 1920 });
    expect(timeline.call).toEqual({ start: 1920, length: 3840 });
    expect(timeline.response).toEqual({ start: 5760, length: 3840 });
    expect(timeline.words.length).toBe(0);
    expect(timeline.total).toBe(9600);
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
      expect(note.onset - notes.call[i].onset).toBe(3840);
    });
    expect(notes.call[0].onset).toBe(1920);
  });

  it('plays the boss’s calls back to back after one count-in', () => {
    const calls = bossCalls(2, KEY, echoRandom(3));
    const timelines = bossTimelines(calls);
    expect(timelines.map((t) => t.call.start)).toEqual([
      1920,
      1920 + 7680,
      1920 + 2 * 7680,
      1920 + 3 * 7680,
    ]);
    expect(timelines.at(-1)!.total).toBe(1920 + 4 * 7680);
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
