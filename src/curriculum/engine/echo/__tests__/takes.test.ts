import { describe, expect, it } from 'vitest';
import type { PlayedNote } from '../../musicLiteracy/grading';
import {
  NO_SCAFFOLDING,
  processTake,
  recognizeChord,
  rootChord,
  snapToKey,
  type EchoScaffolding,
} from '../takes';

/**
 * Make Your Song's takes: quantized to 16ths, the phrase's length, and each
 * scaffolding switch (all off unless turned on) doing what Game Settings
 * says, on and off.
 */

const C_MAJOR = { tonic: 'C', mode: 'major' } as const;
const C_MINOR = { tonic: 'C', mode: 'minor' } as const;

const note = (midi: number, onset: number, duration = 200): PlayedNote => ({
  midi,
  onset,
  duration,
});

/** A chord's notes struck together, a few ticks apart. */
const strike = (midis: number[], onset: number, duration = 400) =>
  midis.map((midi, i) => note(midi, onset + i * 15, duration));

const melody = (
  played: PlayedNote[],
  scaffolding: Partial<EchoScaffolding> = {},
  level: 1 | 2 | 3 = 1,
  key: typeof C_MAJOR | typeof C_MINOR = C_MAJOR,
) => processTake(played, { kind: 'melody', key, level, scaffolding });

const chords = (
  played: PlayedNote[],
  scaffolding: Partial<EchoScaffolding> = {},
  level: 1 | 2 | 3 = 1,
) => processTake(played, { kind: 'chords', key: C_MAJOR, level, scaffolding });

describe('a take', () => {
  it('has every switch off by default', () => {
    expect(NO_SCAFFOLDING).toEqual({
      autoTune: false,
      rootsOnly: false,
      autoFill: false,
    });
    expect(melody([note(60, 0)]).scaffolding).toEqual(NO_SCAFFOLDING);
  });

  it('is its level’s phrase: 2, 4 or 8 bars', () => {
    expect(melody([], {}, 1)).toMatchObject({ bars: 2, length: 3840 });
    expect(melody([], {}, 2)).toMatchObject({ bars: 4, length: 7680 });
    expect(melody([], {}, 3)).toMatchObject({ bars: 8, length: 15360 });
    expect(melody([]).empty).toBe(true);
  });

  it('quantizes a melody to 16ths, a note lasting until the next starts', () => {
    const take = melody([
      note(60, 10, 520),
      note(62, 470, 250),
      note(64, 1010, 190),
    ]);
    expect(take.notes.map((n) => [n.midi, n.tick, n.duration])).toEqual([
      [60, 0, 480],
      [62, 480, 240],
      [64, 960, 240],
    ]);
    expect(take.notes.map((n) => n.label)).toEqual(['1', '2', '3']);
  });

  it('reads its notes from its downbeat, wherever the recording starts', () => {
    const take = processTake([note(60, 1920 + 5, 480)], {
      kind: 'melody',
      key: C_MAJOR,
      level: 1,
      start: 1920,
    });
    expect(take.notes[0].tick).toBe(0);
  });

  it('leaves out notes outside the phrase, and stops one ringing past it', () => {
    const take = melody([
      note(60, -300),
      note(62, -40), // just early: on the downbeat
      note(64, 3500, 1000), // rings past the end
      note(65, 3900), // after the end
    ]);
    expect(take.notes.map((n) => [n.midi, n.tick])).toEqual([
      [62, 0],
      [64, 3480],
    ]);
    expect(take.notes[1].duration).toBe(360);
    expect(take.flags.map((f) => f.reason)).toEqual([
      'outsidePhrase',
      'outsidePhrase',
    ]);
  });
});

describe('Auto-Tune Melody', () => {
  it('off: a note outside the key stays as played', () => {
    const take = melody([note(61, 0), note(63, 480)]);
    expect(take.notes.map((n) => [n.midi, n.label, n.inKey])).toEqual([
      [61, '♭2', false],
      [63, '♭3', false],
    ]);
  });

  it('on: snaps to the nearest key note, between two to the 1 chord’s, else the lower', () => {
    const played = [61, 63, 66, 68, 70, 65].map((midi, i) =>
      note(midi, i * 480),
    );
    const take = melody(played, { autoTune: true });
    expect(take.notes.map((n) => n.midi)).toEqual([60, 64, 67, 67, 69, 65]);
    expect(take.notes.every((n) => n.inKey)).toBe(true);
    expect(take.notes.map((n) => n.played)).toEqual([61, 63, 66, 68, 70, 65]);
    // In minor: E to the ♭3, A to the ♭6, B up to the 1.
    expect([61, 64, 66, 69, 71].map((m) => snapToKey(m, C_MINOR))).toEqual([
      60, 63, 67, 68, 72,
    ]);
  });
});

describe('Auto Fill Bars, on a melody', () => {
  it('off: notes on the 16th grid', () => {
    const take = melody([note(60, 130), note(62, 600)]);
    expect(take.notes.map((n) => n.tick)).toEqual([120, 600]);
  });

  it('on at Level 1: notes on the eighth grid, an eighth long at least', () => {
    const take = melody([note(60, 130, 60), note(62, 560, 60)], {
      autoFill: true,
    });
    expect(take.notes.map((n) => [n.tick, n.duration])).toEqual([
      [240, 240],
      [480, 240],
    ]);
  });

  it('on from Level 2: the level’s grid is the 16th', () => {
    const take = melody([note(60, 130)], { autoFill: true }, 2);
    expect(take.notes[0].tick).toBe(120);
  });
});

describe('a chords take', () => {
  it('recognizes the key’s chords from their notes, any voicing', () => {
    const take = chords([
      ...strike([60, 64, 67], 0),
      ...strike([65, 69, 72], 1920),
      ...strike([57, 64, 72], 2880), // A minor, root low
    ]);
    expect(take.chords.map((c) => [c.degree, c.label, c.tick])).toEqual([
      ['1', '1 maj', 0],
      ['4', '4 maj', 1920],
      ['6', '6 min', 2880],
    ]);
    expect(take.flags).toEqual([]);
  });

  it('prefers the chord rooted on the lowest note when two are struck', () => {
    expect(recognizeChord([60, 64, 67, 69], C_MAJOR)).toBe('1');
    expect(recognizeChord([57, 60, 64, 67], C_MAJOR)).toBe('6');
    expect(recognizeChord([60, 64], C_MAJOR)).toBeNull();
    expect(recognizeChord([59, 62, 65], C_MAJOR)).toBeNull(); // diminished
  });

  it('leaves out a strike that isn’t one of the six, flagged', () => {
    const take = chords([...strike([60, 64], 0), ...strike([60, 63, 67], 960)]);
    expect(take.chords).toEqual([]);
    expect(take.flags.map((f) => f.reason)).toEqual([
      'unrecognized',
      'unrecognized',
    ]);
  });

  it('voices the take’s chords as a progression', () => {
    const take = chords([
      ...strike([45, 48, 52], 0), // A minor, low
      ...strike([84, 88, 91], 1920), // C major, high
    ]);
    const [a, c] = take.chords.map((x) => x.chord);
    expect(Math.abs(c.root - a.root)).toBeLessThanOrEqual(5);
  });
});

describe('Roots Only Chords', () => {
  it('off: one note makes no chord', () => {
    expect(chords([note(67, 0)]).chords).toEqual([]);
  });

  it('on: one note makes its diatonic chord', () => {
    const take = chords([note(67, 0), note(62, 1920)], { rootsOnly: true });
    expect(take.chords.map((c) => c.label)).toEqual(['5 maj', '2 min']);
    expect(rootChord(69, C_MAJOR)).toBe('6');
    expect(rootChord(65, C_MINOR)).toBe('4');
  });

  it('on: the 7 in major (its chord diminished) and a note off the key make none', () => {
    const take = chords([note(71, 0), note(61, 1920)], { rootsOnly: true });
    expect(take.chords).toEqual([]);
    expect(take.flags.map((f) => f.reason)).toEqual(['noChord', 'noChord']);
    expect(rootChord(62, C_MINOR)).toBeNull(); // minor's 2
  });

  it('on with Auto-Tune: the root is tuned first', () => {
    const take = chords([note(61, 0)], { rootsOnly: true, autoTune: true });
    expect(take.chords.map((c) => c.label)).toEqual(['1 maj']);
  });

  it('Auto-Tune alone tunes a chord’s notes before it’s recognized', () => {
    const minorish = strike([60, 63, 67], 0);
    expect(chords(minorish).chords).toEqual([]);
    expect(
      chords(minorish, { autoTune: true }).chords.map((c) => c.label),
    ).toEqual(['1 maj']);
  });
});

describe('Auto Fill Bars, on chords', () => {
  const ticks = (take: ReturnType<typeof chords>) =>
    take.chords.map((c) => [c.degree, c.tick, c.duration]);

  it('off: chords where they were played, as long as they were held', () => {
    const take = chords([
      ...strike([60, 64, 67], 30, 440),
      ...strike([65, 69, 72], 2400, 600),
    ]);
    // Its notes held to 470–500: the chord, to the nearest 16th, 480.
    expect(ticks(take)).toEqual([
      ['1', 0, 480],
      ['4', 2400, 600],
    ]);
  });

  it('on: changes on the bar line, each chord lasting until the next', () => {
    const take = chords(
      [
        ...strike([60, 64, 67], 30, 300),
        ...strike([60, 64, 67], 960, 300), // the same chord again
        ...strike([65, 69, 72], 2400, 300), // late into bar 2
      ],
      { autoFill: true },
    );
    expect(ticks(take)).toEqual([
      ['1', 0, 1920],
      ['4', 1920, 1920],
    ]);
  });

  it('on: a change just before a bar line goes to it; before the first, the first', () => {
    const early = chords(
      [...strike([60, 64, 67], 0), ...strike([65, 69, 72], 1800)],
      { autoFill: true },
    );
    expect(ticks(early)).toEqual([
      ['1', 0, 1920],
      ['4', 1920, 1920],
    ]);
    const late = chords([...strike([65, 69, 72], 2000)], { autoFill: true });
    expect(ticks(late)).toEqual([['4', 0, 3840]]);
  });

  it('on at Level 3: changes on the half bar', () => {
    const take = chords(
      [...strike([60, 64, 67], 0), ...strike([67, 71, 74], 1000)],
      { autoFill: true },
      3,
    );
    expect(ticks(take)).toEqual([
      ['1', 0, 960],
      ['5', 960, 15360 - 960],
    ]);
    // Off, at Level 3, it's where it was played.
    const off = chords(
      [...strike([60, 64, 67], 0), ...strike([67, 71, 74], 1000)],
      {},
      3,
    );
    expect(off.chords.map((c) => c.tick)).toEqual([0, 960]);
    const offBeat = chords(
      [...strike([60, 64, 67], 0), ...strike([67, 71, 74], 1100)],
      {},
      3,
    );
    expect(offBeat.chords.map((c) => c.tick)).toEqual([0, 1080]);
  });
});
