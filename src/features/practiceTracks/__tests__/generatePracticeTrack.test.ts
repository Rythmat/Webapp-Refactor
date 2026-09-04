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
