import { describe, expect, it } from 'vitest';
import { generatePracticeTrack } from '../generatePracticeTrack';

// rootMidi is always 60 + root, so root=0 keeps expected note math simple (C).
const ROOT_C = 0;

describe('generatePracticeTrack chord progressions', () => {
  it('builds the Ionian Level 1 I-IV-V-I progression in C', async () => {
    const result = await generatePracticeTrack('ionian', ROOT_C, 'melody', 1);
    const midis = result.chordRegions.map((r) => r.midis);
    expect(midis).toEqual([
      [60, 64, 67], // 1 major (C)
      [65, 69, 72], // 4 major (F)
      [67, 71, 74], // 5 major (G)
      [60, 64, 67], // 1 major (C)
    ]);
  });

  it("builds Dorian's flat-7 major chord (bVII) a whole step below the tonic", async () => {
    const result = await generatePracticeTrack('dorian', ROOT_C, 'melody', 1);
    // Bar index 2 is "b7maj" — in C Dorian that's a Bb major triad.
    expect(result.chordRegions[2].midis).toEqual([70, 74, 77]);
  });

  it('builds the Ionian Level 2 sus4 chord with no 3rd', async () => {
    const result = await generatePracticeTrack('ionian', ROOT_C, 'melody', 2);
    // Bar index 2 is "5maj(sus4)" — G sus4: root, 4th, 5th, no 3rd.
    expect(result.chordRegions[2].midis).toEqual([67, 72, 74]);
  });

  it('plays the slash-chord bass note (not the chord root) for Lydian Level 2', async () => {
    const result = await generatePracticeTrack('lydian', ROOT_C, 'melody', 2);
    // Bar 0 is "2maj/1": chord voicing is a D major triad, bass plays C (tonic).
    expect(result.chordRegions[0].midis).toEqual([62, 66, 69]);
    const bassRoot = result.bassClip.events[0];
    expect(bassRoot.note).toBe(60 - 24 + 0); // tonic, 2 octaves below rootMidi
  });

  it('plays only chord roots in a repeating dotted-quarter/eighth pattern', async () => {
    const result = await generatePracticeTrack('ionian', ROOT_C, 'melody', 1);
    // Bar 0 of I-IV-V-I in C: every bass note is C, 2 octaves below rootMidi.
    const bar0 = result.bassClip.events.filter((e) => e.startTick < 1920);
    expect(bar0.map((e) => e.note)).toEqual([36, 36, 36, 36]);
    // Two dotted-quarter (720) + eighth (240) cells per 4/4 bar.
    expect(bar0.map((e) => [e.startTick, e.durationTicks])).toEqual([
      [0, 720],
      [720, 240],
      [960, 720],
      [1680, 240],
    ]);
  });

  it('uses the identical progression for all three Locrian levels', async () => {
    const [l1, l2, l3] = await Promise.all([
      generatePracticeTrack('locrian', ROOT_C, 'melody', 1),
      generatePracticeTrack('locrian', ROOT_C, 'melody', 2),
      generatePracticeTrack('locrian', ROOT_C, 'melody', 3),
    ]);
    const degreeKeys = (r: typeof l1) =>
      r.chordRegions.map((region) => region.degreeKey);
    expect(degreeKeys(l1)).toEqual(degreeKeys(l2));
    expect(degreeKeys(l1)).toEqual(degreeKeys(l3));
  });

  it('normalizes Aeolian Level 2 to a 4-bar progression', async () => {
    const result = await generatePracticeTrack('aeolian', ROOT_C, 'melody', 2);
    expect(result.chordRegions).toHaveLength(4);
  });

  it('defaults to Level 1 when no level is passed', async () => {
    const withDefault = await generatePracticeTrack('ionian', ROOT_C, 'melody');
    const level1 = await generatePracticeTrack('ionian', ROOT_C, 'melody', 1);
    expect(withDefault.chordRegions.map((r) => r.midis)).toEqual(
      level1.chordRegions.map((r) => r.midis),
    );
  });
});

// ---------------------------------------------------------------------------
// Melody — the 2 Bar Melody Phrase Rule
// ---------------------------------------------------------------------------

const MODE_INTERVALS = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const;

const ALL_MODES = Object.keys(
  MODE_INTERVALS,
) as (keyof typeof MODE_INTERVALS)[];
const LEVELS = [1, 2, 3] as const;
const BAR = 1920;
const PHRASE = 2 * BAR;

describe('generatePracticeTrack melody', () => {
  it('generates a 2-bar phrase repeated across the 4-bar progression', async () => {
    // The engine is random, so assert the structural rule over many draws.
    for (const level of LEVELS) {
      const result = await generatePracticeTrack(
        'ionian',
        ROOT_C,
        'chords',
        level,
      );
      const events = result.melodyClip!.events;

      const phrase = events.filter((e) => e.startTick < PHRASE);
      const repeat = events.filter((e) => e.startTick >= PHRASE);
      expect(phrase.length).toBeGreaterThan(0);
      // Bars 3-4 repeat bars 1-2 note-for-note, apart from the resolved final note.
      expect(repeat.map((e) => e.startTick - PHRASE)).toEqual(
        phrase.map((e) => e.startTick),
      );
      expect(repeat.slice(0, -1).map((e) => e.note)).toEqual(
        phrase.slice(0, -1).map((e) => e.note),
      );
      // The phrase spans both bars, not just bar 1.
      expect(phrase.some((e) => e.startTick >= BAR)).toBe(true);
      expect(
        events.every((e) => e.startTick + e.durationTicks <= 4 * BAR),
      ).toBe(true);
    }
  });

  it('keeps every melody note inside the key center and mode', async () => {
    for (const mode of ALL_MODES) {
      for (const level of LEVELS) {
        const result = await generatePracticeTrack(
          mode,
          ROOT_C,
          'chords',
          level,
        );
        const scale = new Set<number>(MODE_INTERVALS[mode]);
        const outOfKey = result
          .melodyClip!.events.map((e) => ((e.note % 12) + 12) % 12)
          .filter((pitchClass) => !scale.has(pitchClass));
        expect(outOfKey).toEqual([]);
      }
    }
  });

  it('resolves the final note onto a chord tone of the last chord', async () => {
    for (const mode of ALL_MODES) {
      for (const level of LEVELS) {
        const result = await generatePracticeTrack(
          mode,
          ROOT_C,
          'chords',
          level,
        );
        const events = result.melodyClip!.events;
        const finalNote = events[events.length - 1];
        const lastChord = result.chordRegions[result.chordRegions.length - 1];
        const chordTones = new Set(
          lastChord.midis.map((m) => ((m % 12) + 12) % 12),
        );
        expect(chordTones.has(((finalNote.note % 12) + 12) % 12)).toBe(true);
      }
    }
  });

  it('scales phrase density with the level', async () => {
    const [l1, l3] = await Promise.all([
      generatePracticeTrack('ionian', ROOT_C, 'chords', 1),
      generatePracticeTrack('ionian', ROOT_C, 'chords', 3),
    ]);
    // L1 chains two 3-note cells; L3 chains two 4- or 5-note cells.
    expect(l1.melodyClip!.events).toHaveLength(12);
    expect(l3.melodyClip!.events.length).toBeGreaterThan(12);
  });

  it('leaves the melody track empty when the student is filling it in', async () => {
    const result = await generatePracticeTrack('ionian', ROOT_C, 'melody', 1);
    expect(result.melodyClip).toBeNull();
  });
});
