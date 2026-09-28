import { describe, expect, it } from 'vitest';
import {
  ALL_BLUES_PHRASES,
  BLUES_LESSON_PHRASES,
  BLUES_PHRASE_PPQ,
  getBluesPhrases,
  transposeBluesPhrase,
  type BluesPhrase,
} from '../bluesPhrases';
import { SCALE_LESSONS, type ScaleLessonSlug } from '../scaleLessons';

const BAR = BLUES_PHRASE_PPQ * 4;
const pc = (n: number) => ((n % 12) + 12) % 12;

const slugOf = (phrase: BluesPhrase) =>
  phrase.id.split('-')[0] as ScaleLessonSlug;

describe('written blues phrases', () => {
  it.each(ALL_BLUES_PHRASES.map((p) => [p.id, p] as const))(
    '%s only uses notes of its own scale',
    (_id, phrase) => {
      // The transcription's safety net. Every note of Aaron's manuscript is a
      // degree of the scale it was written on, so an offset typed one semitone
      // out fails here rather than teaching a wrong note.
      const steps = new Set(SCALE_LESSONS[slugOf(phrase)].steps.map(pc));
      const strays = phrase.notes
        .filter((n) => !steps.has(pc(n.offset)))
        .map((n) => `bar ${Math.floor(n.startTicks / BAR) + 1}: ${n.offset}`);
      expect(strays).toEqual([]);
    },
  );

  it.each(ALL_BLUES_PHRASES.map((p) => [p.id, p] as const))(
    '%s is in order and fits the bars it claims',
    (_id, phrase) => {
      expect(phrase.notes.length).toBeGreaterThan(0);
      let previousStart = -1;
      for (const note of phrase.notes) {
        expect(note.startTicks).toBeGreaterThan(previousStart);
        expect(note.durationTicks).toBeGreaterThan(0);
        previousStart = note.startTicks;
      }
      const end = phrase.notes.reduce(
        (max, n) => Math.max(max, n.startTicks + n.durationTicks),
        0,
      );
      // Nothing may spill past the last barline. A phrase may well stop short
      // of it — the calls are answered by a bar of silence.
      expect(end).toBeLessThanOrEqual(phrase.bars * BAR);
    },
  );

  it.each(ALL_BLUES_PHRASES.map((p) => [p.id, p] as const))(
    '%s lands on the sixteenth-note grid',
    (_id, phrase) => {
      const sixteenth = BLUES_PHRASE_PPQ / 4;
      for (const note of phrase.notes) {
        expect(note.startTicks % sixteenth).toBe(0);
        expect(note.durationTicks % sixteenth).toBe(0);
      }
    },
  );

  it('never plays the same phrase across an In Time activity', () => {
    // The rule the generated lessons follow too: short, long and articulation
    // are three different pieces of music.
    for (const phrases of Object.values(BLUES_LESSON_PHRASES)) {
      const ids = [phrases.short.id, phrases.long.id, phrases.articulation.id];
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('gives both blues lessons a line and no other lesson one', () => {
    expect(getBluesPhrases('majorblues')).not.toBeNull();
    expect(getBluesPhrases('minorblues')).not.toBeNull();
    expect(getBluesPhrases('MinorBlues')).not.toBeNull();
    expect(getBluesPhrases('majorpentatonic')).toBeNull();
    expect(getBluesPhrases('dorian')).toBeNull();
    expect(getBluesPhrases(null)).toBeNull();
  });

  it('transposes a line without changing its rhythm', () => {
    const line = BLUES_LESSON_PHRASES.minorblues!.long;
    // C minor blues, the key it was written in: the first call is
    // C5 E♭5 F5 G♭5 F5 E♭5 C5, the last one F♯4 G4 B♭4 C5.
    const inC = transposeBluesPhrase(line, 60);
    expect(inC.slice(0, 7).map((n) => n.midi)).toEqual([
      72, 75, 77, 78, 77, 75, 72,
    ]);
    expect(inC.slice(-4).map((n) => n.midi)).toEqual([66, 67, 70, 72]);

    const inF = transposeBluesPhrase(line, 65);
    expect(inF.map((n) => n.midi - 5)).toEqual(inC.map((n) => n.midi));
    expect(inF.map((n) => n.startTicks)).toEqual(inC.map((n) => n.startTicks));
    expect(inF.map((n) => n.durationTicks)).toEqual(
      inC.map((n) => n.durationTicks),
    );
  });

  it('keeps the major blues line in F, the key it was written in', () => {
    // F G A♭ A C D — the ♭3 – 3 crush is the scale's whole character, so the
    // first bar's D5 A♭4 A4 F4 is the transcription's other anchor.
    const line = BLUES_LESSON_PHRASES.majorblues!.long;
    expect(
      transposeBluesPhrase(line, 65)
        .slice(0, 4)
        .map((n) => n.midi),
    ).toEqual([74, 68, 69, 65]);
  });

  it('answers each minor-blues call with a bar of space', () => {
    // The two calls from the call-and-response page are written over two bars
    // and sound for one: the second bar is the student's.
    for (const id of ['minorblues-call-up', 'minorblues-call-down']) {
      const phrase = ALL_BLUES_PHRASES.find((p) => p.id === id)!;
      expect(phrase.bars).toBe(2);
      const end = phrase.notes.reduce(
        (max, n) => Math.max(max, n.startTicks + n.durationTicks),
        0,
      );
      expect(end).toBe(BAR);
    }
  });
});
