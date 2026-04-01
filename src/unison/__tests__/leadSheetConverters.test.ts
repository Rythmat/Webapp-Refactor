import { describe, it, expect } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  leadSheetToUnison,
  unisonToLeadSheet,
} from '../converters/leadSheetConverters';

const PPQ = 480;

/** Create a basic ChordRegion. */
function region(
  id: string,
  startBeat: number,
  endBeat: number,
  name: string,
  noteName: string,
): ChordRegion {
  return {
    id,
    startTick: startBeat * PPQ,
    endTick: endBeat * PPQ,
    name,
    noteName,
    color: [0, 0, 0] as [number, number, number],
  };
}

// ── Sample 4-bar ii-V-I-VI progression ────────────────────────────────────────

function sampleRegions(): ChordRegion[] {
  return [
    region('cr-0', 0, 4, '2 min7', 'D min7'),
    region('cr-1', 4, 8, '5 dom7', 'G dom7'),
    region('cr-2', 8, 12, '1 maj7', 'C maj7'),
    region('cr-3', 12, 16, '6 min7', 'A min7'),
  ];
}

describe('leadSheetToUnison', () => {
  it('produces a valid UnisonDocument from chord regions', () => {
    const doc = leadSheetToUnison({ chordRegions: sampleRegions() });

    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('lead-sheet');
    expect(doc.analysis.chordTimeline.length).toBeGreaterThan(0);
  });

  it('sets title from options', () => {
    const doc = leadSheetToUnison(
      { chordRegions: sampleRegions() },
      { title: 'My Song' },
    );
    expect(doc.metadata.title).toBe('My Song');
  });

  it('uses provided BPM', () => {
    const doc = leadSheetToUnison(
      { chordRegions: sampleRegions() },
      { bpm: 92 },
    );
    expect(doc.rhythm.bpm).toBe(92);
  });

  it('uses provided time signature', () => {
    const doc = leadSheetToUnison(
      { chordRegions: sampleRegions() },
      { timeSignatureNumerator: 3, timeSignatureDenominator: 4 },
    );
    expect(doc.rhythm.timeSignatureNumerator).toBe(3);
    expect(doc.rhythm.timeSignatureDenominator).toBe(4);
  });

  it('builds form from sections', () => {
    const doc = leadSheetToUnison({
      chordRegions: sampleRegions(),
      sections: [
        { measureIdx: 0, label: 'Intro' },
        { measureIdx: 2, label: 'Verse' },
      ],
    });

    expect(doc.form).not.toBeNull();
    expect(doc.form!.sections.length).toBe(2);
    expect(doc.form!.sections[0].label).toBe('Intro');
    expect(doc.form!.sections[0].type).toBe('intro');
    expect(doc.form!.sections[1].label).toBe('Verse');
    expect(doc.form!.sections[1].type).toBe('verse');
  });

  it('builds form label from sections (AABA pattern)', () => {
    const doc = leadSheetToUnison({
      chordRegions: sampleRegions(),
      sections: [
        { measureIdx: 0, label: 'Verse' },
        { measureIdx: 1, label: 'Verse' },
        { measureIdx: 2, label: 'Bridge' },
        { measureIdx: 3, label: 'Verse' },
      ],
    });

    expect(doc.form!.formLabel).toBe('AABA');
  });

  it('includes repeats in form', () => {
    const doc = leadSheetToUnison({
      chordRegions: sampleRegions(),
      sections: [{ measureIdx: 0, label: 'A' }],
      repeats: [{ startMeasure: 0, endMeasure: 3 }],
    });

    expect(doc.form!.repeats.length).toBe(1);
    expect(doc.form!.repeats[0].startMeasure).toBe(0);
    expect(doc.form!.repeats[0].endMeasure).toBe(3);
  });

  it('form is null when no sections or repeats', () => {
    const doc = leadSheetToUnison({ chordRegions: sampleRegions() });
    expect(doc.form).toBeNull();
  });

  it('handles empty chord regions', () => {
    const doc = leadSheetToUnison({ chordRegions: [] });
    expect(doc.version).toBe('1.0.0');
    expect(doc.metadata.source).toBe('lead-sheet');
  });
});

describe('unisonToLeadSheet', () => {
  it('round-trips chord regions through UNISON', () => {
    const regions = sampleRegions();
    const doc = leadSheetToUnison({ chordRegions: regions });
    const result = unisonToLeadSheet(doc);

    // Should have same number of chord regions
    expect(result.chordRegions.length).toBe(regions.length);
  });

  it('preserves chord timing', () => {
    const regions = sampleRegions();
    const doc = leadSheetToUnison({ chordRegions: regions });
    const result = unisonToLeadSheet(doc);

    for (let i = 0; i < regions.length; i++) {
      expect(result.chordRegions[i].startTick).toBe(regions[i].startTick);
      expect(result.chordRegions[i].endTick).toBe(regions[i].endTick);
    }
  });

  it('round-trips sections', () => {
    const sections = [
      { measureIdx: 0, label: 'Verse' },
      { measureIdx: 2, label: 'Chorus' },
    ];
    const doc = leadSheetToUnison({
      chordRegions: sampleRegions(),
      sections,
    });
    const result = unisonToLeadSheet(doc);

    expect(result.sections.length).toBe(2);
    expect(result.sections[0].label).toBe('Verse');
    expect(result.sections[0].measureIdx).toBe(0);
    expect(result.sections[1].label).toBe('Chorus');
    expect(result.sections[1].measureIdx).toBe(2);
  });

  it('round-trips repeats', () => {
    const doc = leadSheetToUnison({
      chordRegions: sampleRegions(),
      sections: [{ measureIdx: 0, label: 'A' }],
      repeats: [{ startMeasure: 0, endMeasure: 3 }],
    });
    const result = unisonToLeadSheet(doc);

    expect(result.repeats.length).toBe(1);
    expect(result.repeats[0].startMeasure).toBe(0);
    expect(result.repeats[0].endMeasure).toBe(3);
  });

  it('returns empty arrays when no form data', () => {
    const doc = leadSheetToUnison({ chordRegions: sampleRegions() });
    const result = unisonToLeadSheet(doc);

    expect(result.sections).toEqual([]);
    expect(result.repeats).toEqual([]);
  });

  it('preserves chord display names', () => {
    const regions = sampleRegions();
    const doc = leadSheetToUnison({ chordRegions: regions });
    const result = unisonToLeadSheet(doc);

    // noteName should be preserved through the round-trip
    for (const chord of result.chordRegions) {
      expect(chord.noteName).toBeTruthy();
      expect(chord.name).toBeTruthy();
    }
  });
});
