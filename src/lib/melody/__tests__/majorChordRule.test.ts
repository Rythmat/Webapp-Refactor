import { describe, expect, it } from 'vitest';
import {
  hasMajorThird,
  majorChordViolations,
  noteViolation,
  obeysMajorChordRule,
  repairMajorChordRule,
  singleChordWindow,
  type ChordWindow,
  type RuleNote,
} from '../majorChordRule';

const Q = 480;
const SIXTEENTH = 120;

// C major: C=60 D=62 E=64 F=65 G=67 A=69 B=71
const [C, D, E, F, G, A, B] = [60, 62, 64, 65, 67, 69, 71];
const Eb = 63;

/** A melody of quarter notes, unless a duration is given per note. */
const line = (midis: number[], duration = Q): RuleNote[] =>
  midis.map((midi, i) => ({ midi, startTick: i * Q, durationTicks: duration }));

const overC: ChordWindow[] = singleChordWindow(0, true);
const overCm: ChordWindow[] = singleChordWindow(0, false);

describe('hasMajorThird', () => {
  it('holds for every chord built on a major 3rd', () => {
    expect(hasMajorThird([0, 4, 7])).toBe(true); // major triad
    expect(hasMajorThird([0, 4, 7, 11])).toBe(true); // maj7
    expect(hasMajorThird([0, 4, 7, 9])).toBe(true); // 6
    expect(hasMajorThird([0, 4, 7, 10])).toBe(true); // dominant 7
    expect(hasMajorThird([0, 4, 7, 10, 14])).toBe(true); // 9
  });

  it('does not hold where there is no major 3rd', () => {
    expect(hasMajorThird([0, 3, 7])).toBe(false); // minor
    expect(hasMajorThird([0, 3, 7, 10])).toBe(false); // m7
    expect(hasMajorThird([0, 3, 6])).toBe(false); // diminished
    expect(hasMajorThird([0, 5, 7])).toBe(false); // sus4 — the 4 IS the chord
  });

  it('treats a chord carrying both 3rds as not governed', () => {
    // A ♯9 voicing spells the ♭3 deliberately; leave it alone.
    expect(hasMajorThird([0, 4, 7, 10, 15])).toBe(false);
  });
});

describe('the 4 over a major chord', () => {
  it('is allowed when the next note is the major 3', () => {
    expect(obeysMajorChordRule(line([C, F, E, C]), overC)).toBe(true);
  });

  it('is not allowed when it goes anywhere else', () => {
    expect(obeysMajorChordRule(line([C, F, G, C]), overC)).toBe(false);
    expect(obeysMajorChordRule(line([C, F, D, C]), overC)).toBe(false);
    expect(obeysMajorChordRule(line([C, E, F, G]), overC)).toBe(false);
  });

  it('is not allowed to end a phrase, where it resolves to nothing', () => {
    expect(obeysMajorChordRule(line([C, E, G, F]), overC)).toBe(false);
  });

  it('is still not allowed when it is brief', () => {
    // Shortness excuses the ♭3, never the 4.
    const brief = [
      { midi: C, startTick: 0, durationTicks: Q },
      { midi: F, startTick: Q, durationTicks: SIXTEENTH },
      { midi: G, startTick: Q + SIXTEENTH, durationTicks: Q },
    ];
    expect(obeysMajorChordRule(brief, overC)).toBe(false);
  });

  it('names what it found', () => {
    const notes = line([F, G]);
    expect(noteViolation(notes[0], notes[1], overC)).toBe('unresolved-fourth');
  });
});

describe('the ♭3 over a major chord', () => {
  const ornament = (duration: number): RuleNote[] => [
    { midi: C, startTick: 0, durationTicks: Q },
    { midi: Eb, startTick: Q, durationTicks: duration },
    { midi: E, startTick: Q + duration, durationTicks: Q },
  ];

  it('is allowed as a brief hammer-on into the major 3', () => {
    expect(obeysMajorChordRule(ornament(SIXTEENTH), overC)).toBe(true);
    expect(obeysMajorChordRule(ornament(60), overC)).toBe(true);
  });

  it('is not allowed once it is long enough to be heard as a note', () => {
    expect(obeysMajorChordRule(ornament(240), overC)).toBe(false);
    expect(obeysMajorChordRule(ornament(Q), overC)).toBe(false);
  });

  it('is not allowed even when brief if it does not reach the 3', () => {
    const notes = [
      { midi: Eb, startTick: 0, durationTicks: SIXTEENTH },
      { midi: G, startTick: SIXTEENTH, durationTicks: Q },
    ];
    expect(noteViolation(notes[0], notes[1], overC)).toBe(
      'clashing-minor-third',
    );
  });
});

describe('notes the rule leaves alone', () => {
  it('says nothing about the 2, which is the 9', () => {
    expect(obeysMajorChordRule(line([C, D, G, E]), overC)).toBe(true);
    expect(obeysMajorChordRule(line([D, D, D, D]), overC)).toBe(true);
  });

  it('governs only chords with a major 3rd', () => {
    // Over C minor the 4 and the ♭3 are ordinary notes.
    expect(obeysMajorChordRule(line([C, F, G, Eb]), overCm)).toBe(true);
  });

  it('leaves notes with no chord under them alone', () => {
    expect(obeysMajorChordRule(line([F, G]), [])).toBe(true);
  });

  it('measures the 4 from the chord, not the key', () => {
    // In C major over an F chord, the 4 of F is B♭ — not in the key, so it
    // never appears. B natural is the ♯11 and is not the avoid note.
    const overF = singleChordWindow(5, true);
    expect(obeysMajorChordRule(line([F, B, A]), overF)).toBe(true);
    // C is the 5 of F, also fine.
    expect(obeysMajorChordRule(line([F, C, A]), overF)).toBe(true);
  });
});

describe('across a progression', () => {
  const chords: ChordWindow[] = [
    { rootPc: 0, majorThird: true, startTick: 0, endTick: 1920 }, // C
    { rootPc: 7, majorThird: true, startTick: 1920, endTick: 3840 }, // G7
  ];

  it('judges each note against the chord it sounds over', () => {
    // C is the 4 of G, so it must reach B; over the C chord it is the root.
    const notes: RuleNote[] = [
      { midi: C, startTick: 0, durationTicks: Q }, // root of C — fine
      { midi: E, startTick: Q, durationTicks: Q },
      { midi: C, startTick: 1920, durationTicks: Q }, // the 4 of G7
      { midi: B, startTick: 2400, durationTicks: Q }, // resolves to its 3
    ];
    expect(obeysMajorChordRule(notes, chords)).toBe(true);

    notes[3] = { midi: D, startTick: 2400, durationTicks: Q };
    expect(majorChordViolations(notes, chords)).toEqual([2]);
  });
});

describe('repair', () => {
  it('drops an unresolved 4 onto the major 3', () => {
    const repaired = repairMajorChordRule(line([C, F, G, C]), overC);
    expect(repaired.map((n) => n.midi)).toEqual([C, E, G, C]);
    expect(obeysMajorChordRule(repaired, overC)).toBe(true);
  });

  it('raises a clashing ♭3 onto the major 3', () => {
    const repaired = repairMajorChordRule(line([C, Eb, G, C]), overC);
    expect(repaired.map((n) => n.midi)).toEqual([C, E, G, C]);
  });

  it('keeps timing and leaves obedient notes untouched', () => {
    const before = line([C, F, E, G]);
    const after = repairMajorChordRule(before, overC);
    expect(after).toEqual(before);
  });

  it('fixes a 4 that ended the phrase', () => {
    const repaired = repairMajorChordRule(line([C, E, G, F]), overC);
    expect(repaired.map((n) => n.midi)).toEqual([C, E, G, E]);
    expect(obeysMajorChordRule(repaired, overC)).toBe(true);
  });

  it('always yields a melody that obeys the rule', () => {
    const chords: ChordWindow[] = [
      { rootPc: 0, majorThird: true, startTick: 0, endTick: 3840 },
    ];
    for (let seed = 0; seed < 200; seed += 1) {
      const midis = Array.from(
        { length: 8 },
        (_, i) => 60 + ((seed * 7 + i * 5) % 13),
      );
      const repaired = repairMajorChordRule(line(midis), chords);
      expect(obeysMajorChordRule(repaired, chords)).toBe(true);
    }
  });
});
