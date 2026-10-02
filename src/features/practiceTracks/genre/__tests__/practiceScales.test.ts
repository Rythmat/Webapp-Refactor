import { describe, it, expect } from 'vitest';
import {
  funkL1,
  funkL2,
  funkL3,
} from '@/curriculum/data/activityFlows/funk_v2';
import { popL1, popL3 } from '@/curriculum/data/activityFlows/pop_v2';
import { reggaeL1 } from '@/curriculum/data/activityFlows/reggae_v2';
import { flowPracticeScales } from '../practiceScales';

describe('flowPracticeScales', () => {
  it('puts the level default first, then the rest by first appearance', () => {
    const scales = flowPracticeScales(funkL2);
    expect(scales.map((s) => s.id)).toEqual(['dorian', 'minor_blues']);
  });

  it('spells A Dorian with one letter per degree', () => {
    const [dorian] = flowPracticeScales(funkL2);
    expect(dorian.names).toEqual(['A', 'B', 'C', 'D', 'E', 'F♯', 'G']);
    expect(dorian.degrees).toEqual(['1', '2', '♭3', '4', '5', '6', '♭7']);
  });

  it('spells the A minor blues scale with a flat five', () => {
    const blues = flowPracticeScales(funkL2).find(
      (s) => s.id === 'minor_blues',
    );
    expect(blues?.names).toEqual(['A', 'C', 'D', 'E♭', 'E', 'G']);
    expect(blues?.degrees).toEqual(['1', '♭3', '4', '♭5', '5', '♭7']);
  });

  it('titles a scale the way a student reads it', () => {
    const titles = flowPracticeScales(funkL2).map((s) => s.title);
    expect(titles).toEqual(['Dorian', 'Minor Blues']);
  });

  it('dedupes by the notes, not the id', () => {
    for (const flow of [funkL1, funkL2, funkL3]) {
      const signatures = flowPracticeScales(flow).map((s) =>
        s.intervals.join(','),
      );
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });

  it('gives a stub genre only its default scale', () => {
    expect(flowPracticeScales(reggaeL1).map((s) => s.id)).toEqual(['minor']);
  });

  it('leaves chord tones off the switcher', () => {
    // A step's `scaleIntervals` is whatever notes it draws from, and plenty of
    // steps draw from a chord — Pop L1 has [0,4,7] and [0,7], Pop L3 has
    // [0,4,7,11] and [0,3,6], Funk L1 has a [0,3,7,10] Dm7 arpeggio. None of
    // them is a scale to improvise on.
    expect(flowPracticeScales(popL1).map((s) => s.id)).toEqual([
      'major_pentatonic',
      'ionian',
    ]);
    expect(flowPracticeScales(popL3).map((s) => s.id)).toEqual([
      'ionian',
      'dorian',
      'aeolian',
    ]);
    // Funk L1's pentatonic phrases (tagged Dorian) now come before the blues
    // scale: each scale is followed by its phrases (ledger D-043).
    expect(flowPracticeScales(funkL1).map((s) => s.id)).toEqual([
      'minor_pentatonic',
      'dorian',
      'minor_blues',
    ]);
  });

  it('never offers a set of notes too small to be a scale', () => {
    for (const flow of [popL1, popL3, funkL1, funkL2, funkL3]) {
      for (const scale of flowPracticeScales(flow)) {
        expect({
          flow: `${flow.genre} L${flow.level}`,
          scale: scale.title,
          notes: scale.intervals.length,
        }).toMatchObject({ notes: expect.any(Number) });
        expect(scale.intervals.length).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('never titles a scale with the bare fallback name', () => {
    for (const flow of [popL1, popL3, funkL1, funkL2, funkL3]) {
      for (const scale of flowPracticeScales(flow)) {
        expect(scale.title).not.toBe('Scale');
      }
    }
  });
});
