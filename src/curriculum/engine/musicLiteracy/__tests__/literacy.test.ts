import { describe, expect, it } from 'vitest';
import { LITERACY_FIXTURE } from '../__fixtures__/literacyFixture';
import {
  degreeLabel,
  degreeOfMidi,
  noteMidi,
  stepNotes,
  stepTimeline,
  tonicMidi,
} from '../literacy';
import { getLiveMusicLiteracy, listMusicLiteracy } from '../registry';

describe('the series register', () => {
  it('keeps the 1 within a tritone of middle C', () => {
    expect(tonicMidi('F#')).toBe(54); // an augmented 4th below middle C
    expect(tonicMidi('Gb')).toBe(54);
    expect(tonicMidi('G')).toBe(55);
    expect(tonicMidi('C')).toBe(60);
    expect(tonicMidi('F')).toBe(65); // a perfect 4th above
  });

  it('puts the low 5 to the 5 above on C3–C5 in every key', () => {
    for (const tonic of ['F#', 'G', 'C', 'Eb', 'F'] as const) {
      const one = tonicMidi(tonic);
      expect(noteMidi({ degree: '5', octave: -1 }, one)).toBeGreaterThanOrEqual(
        48,
      );
      expect(noteMidi({ degree: '5' }, one)).toBeLessThanOrEqual(72);
    }
  });
});

describe('degrees and pitches', () => {
  it('turns a degree into a pitch and back', () => {
    const one = tonicMidi('C');
    expect(noteMidi({ degree: 'b3' }, one)).toBe(63);
    expect(noteMidi({ degree: '7', octave: -1 }, one)).toBe(59);
    for (let midi = 48; midi <= 76; midi++) {
      expect(noteMidi(degreeOfMidi(midi, one), one)).toBe(midi);
    }
    expect(degreeOfMidi(59, one)).toEqual({ degree: '7', octave: -1 });
    expect(degreeOfMidi(64, one)).toEqual({ degree: '3' });
  });

  it('writes flats and sharps as signs', () => {
    expect(degreeLabel('b3')).toBe('♭3');
    expect(degreeLabel('#4')).toBe('♯4');
    expect(degreeLabel('5')).toBe('5');
  });
});

describe('the registry', () => {
  // The real file, as the console last saved it: that it is there and live,
  // never what it says. The tests below play the fixture.
  it('serves Part 1, live', () => {
    const live = getLiveMusicLiteracy('music-literacy-part-1');
    expect(live).toMatchObject({ part: 1, status: 'live' });
    expect(listMusicLiteracy().map((l) => l.id)).toContain(
      'music-literacy-part-1',
    );
  });
});

describe('a step on its timeline', () => {
  const lesson = LITERACY_FIXTURE;

  it('is the fixture’s Part 1, in C, with its seven verses', () => {
    expect(lesson.key).toEqual({ tonic: 'C', mode: 'major' });
    expect(lesson.steps).toHaveLength(7);
  });

  it('runs count-in, words, call, then the student’s bar', () => {
    const step = lesson.steps[0];
    expect(stepTimeline(lesson, step)).toMatchObject({
      countIn: { start: 0, length: 1920 },
      words: { start: 1920, length: 3840 },
      call: { start: 5760, length: 1920 },
      response: { start: 7680, length: 1920 },
      total: 9600,
      tempo: 80,
    });
  });

  it('echoes the call: C C C, then the student plays C C C', () => {
    const { call, response } = stepNotes(lesson, lesson.steps[0]);
    expect(call.map((n) => [n.midi, n.onset])).toEqual([
      [60, 5760],
      [60, 6240],
      [60, 6720],
    ]);
    expect(response.map((n) => [n.midi, n.onset, n.duration])).toEqual([
      [60, 7680, 480],
      [60, 8160, 480],
      [60, 8640, 480],
    ]);
  });

  it('sings Minor on the flat 3', () => {
    const minor = lesson.steps.find((s) => s.tag === 'flat-the-3')!;
    const { words, call } = stepNotes(lesson, minor);
    expect(words.filter((w) => w.midi === 63).map((w) => w.text)).toEqual([
      'Mi-',
      'nor',
    ]);
    expect(call.map((n) => n.midi)).toEqual([60, 63, 60]);
  });
});
