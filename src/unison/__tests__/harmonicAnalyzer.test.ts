import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { analyzeHarmony } from '../engine/harmonicAnalyzer';
import type { KeyDetection } from '../types/schema';

/** Helper: create a MidiNoteEvent */
function note(
  midi: number,
  startTick: number,
  durationTicks = 480,
): MidiNoteEvent {
  return { note: midi, velocity: 80, startTick, durationTicks, channel: 1 };
}

/** Helper: create a ChordRegion with sensible defaults */
function region(
  overrides: Partial<ChordRegion> & { name: string; noteName: string },
): ChordRegion {
  return {
    id: 'r1',
    startTick: 0,
    endTick: 1920,
    color: [0, 100, 50] as [number, number, number],
    ...overrides,
  };
}

const defaultKey: KeyDetection = {
  rootPc: 0,
  rootName: 'C',
  mode: 'ionian',
  modeDisplay: 'Ionian',
  confidence: 0.9,
  alternateKeys: [],
};

describe('analyzeHarmony', () => {
  it('returns empty array for empty input', () => {
    expect(analyzeHarmony([], defaultKey)).toEqual([]);
  });

  it('parses degreeKey (long form) when available', () => {
    const regions: ChordRegion[] = [
      region({ name: '1 maj', noteName: 'C', degreeKey: '1 major' }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result).toHaveLength(1);
    expect(result[0].degree).toBe('1');
    expect(result[0].quality).toBe('major');
    expect(result[0].hybridName).toBe('1 major');
  });

  it('falls back to name (abbreviated form) when degreeKey is absent', () => {
    const regions: ChordRegion[] = [region({ name: '4 dom7', noteName: 'F' })];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].degree).toBe('4');
    expect(result[0].quality).toBe('dominant7');
    expect(result[0].hybridName).toBe('4 dominant7');
  });

  it('expands abbreviated qualities correctly', () => {
    const abbreviations: Array<[string, string]> = [
      ['1 maj', 'major'],
      ['2 min', 'minor'],
      ['5 dom7', 'dominant7'],
      ['3 dim', 'diminished'],
      ['6 aug', 'augmented'],
      ['1 maj7', 'major7'],
      ['2 min7', 'minor7'],
      ['7 min7b5', 'minor7b5'],
      ['5 dom9', 'dominant9'],
    ];

    for (const [name, expectedQuality] of abbreviations) {
      const regions: ChordRegion[] = [region({ name, noteName: 'C' })];
      const result = analyzeHarmony(regions, defaultKey);
      expect(result[0].quality).toBe(expectedQuality);
    }
  });

  it('generates correct roman numerals for major chords', () => {
    const cases: Array<[string, string, string]> = [
      ['1 major', 'C', 'I'],
      ['4 major', 'F', 'IV'],
      ['5 major', 'G', 'V'],
    ];

    for (const [degreeKey, noteName, expectedRoman] of cases) {
      const regions: ChordRegion[] = [
        region({ name: degreeKey, noteName, degreeKey }),
      ];
      const result = analyzeHarmony(regions, defaultKey);
      expect(result[0].romanNumeral).toBe(expectedRoman);
    }
  });

  it('generates lowercase roman numerals for minor chords', () => {
    const cases: Array<[string, string, string]> = [
      ['2 minor', 'D', 'iim'],
      ['3 minor', 'E', 'iiim'],
      ['6 minor', 'A', 'vim'],
    ];

    for (const [degreeKey, noteName, expectedRoman] of cases) {
      const regions: ChordRegion[] = [
        region({ name: degreeKey, noteName, degreeKey }),
      ];
      const result = analyzeHarmony(regions, defaultKey);
      expect(result[0].romanNumeral).toBe(expectedRoman);
    }
  });

  it('handles flat degrees (borrowed chords)', () => {
    const regions: ChordRegion[] = [
      region({ name: 'b3 maj', noteName: 'Eb', degreeKey: 'b3 major' }),
      region({
        id: 'r2',
        name: 'b7 dom7',
        noteName: 'Bb',
        degreeKey: 'b7 dominant7',
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].romanNumeral).toBe('bIII');
    expect(result[1].romanNumeral).toBe('bVII7');
  });

  it('handles sharp degrees', () => {
    const regions: ChordRegion[] = [
      region({
        name: '#4 diminished',
        noteName: 'F#',
        degreeKey: '#4 diminished',
      }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].romanNumeral).toBe('#ivdim');
  });

  it('handles seventh chord suffixes in roman numerals', () => {
    const cases: Array<[string, string]> = [
      ['1 major7', 'Imaj7'],
      ['2 minor7', 'iim7'],
      ['5 dominant7', 'V7'],
      ['7 minor7b5', 'viim7b5'],
      ['7 diminished7', 'viidim7'],
    ];

    for (const [degreeKey, expectedRoman] of cases) {
      const regions: ChordRegion[] = [
        region({ name: degreeKey, noteName: 'C', degreeKey }),
      ];
      const result = analyzeHarmony(regions, defaultKey);
      expect(result[0].romanNumeral).toBe(expectedRoman);
    }
  });

  it('extracts rootPc from note names correctly', () => {
    const cases: Array<[string, number]> = [
      ['C', 0],
      ['D', 2],
      ['Eb', 3],
      ['F#', 6],
      ['Bb', 10],
    ];

    for (const [noteName, expectedPc] of cases) {
      const regions: ChordRegion[] = [
        region({ name: '1 major', noteName, degreeKey: '1 major' }),
      ];
      const result = analyzeHarmony(regions, defaultKey);
      expect(result[0].rootPc).toBe(expectedPc);
    }
  });

  it('preserves original region properties', () => {
    const regions: ChordRegion[] = [
      region({
        id: 'test-id-123',
        startTick: 480,
        endTick: 960,
        name: '1 major',
        noteName: 'C',
        color: [120, 80, 60] as [number, number, number],
        degreeKey: '1 major',
      }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].id).toBe('test-id-123');
    expect(result[0].startTick).toBe(480);
    expect(result[0].endTick).toBe(960);
    expect(result[0].noteName).toBe('C');
    expect(result[0].color).toEqual([120, 80, 60]);
  });

  it('handles bare name fallback (no space)', () => {
    const regions: ChordRegion[] = [region({ name: 'C', noteName: 'C' })];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].degree).toBe('1');
    expect(result[0].quality).toBe('major');
    expect(result[0].romanNumeral).toBe('I');
  });

  it('handles sus chords', () => {
    const regions: ChordRegion[] = [
      region({ name: '4 sus4', noteName: 'F', degreeKey: '4 sus4' }),
      region({
        id: 'r2',
        name: '2 sus2',
        noteName: 'D',
        degreeKey: '2 sus2',
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].romanNumeral).toBe('IVsus4');
    expect(result[1].romanNumeral).toBe('IIsus2');
  });

  it('processes a full I-IV-V-I progression', () => {
    const regions: ChordRegion[] = [
      region({
        id: 'r1',
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        id: 'r2',
        name: '4 major',
        noteName: 'F',
        degreeKey: '4 major',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        id: 'r3',
        name: '5 major',
        noteName: 'G',
        degreeKey: '5 major',
        startTick: 3840,
        endTick: 5760,
      }),
      region({
        id: 'r4',
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 5760,
        endTick: 7680,
      }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.romanNumeral)).toEqual(['I', 'IV', 'V', 'I']);
    expect(result.map((r) => r.hybridName)).toEqual([
      '1 major',
      '4 major',
      '5 major',
      '1 major',
    ]);
  });

  // ── Inversion + Bass Note Detection ───────────────────────────────────

  it('detects root position (inversion = 0) with bass note', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
    ];
    // C major root position: C3-E3-G3
    const events = [note(48, 0), note(52, 0), note(55, 0)];
    const result = analyzeHarmony(regions, defaultKey, events);
    expect(result[0].inversion).toBe(0);
    expect(result[0].bassNote).toBe(48); // C3
  });

  it('detects first inversion (bass = 3rd)', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
    ];
    // C major first inversion: E3-G3-C4
    const events = [note(52, 0), note(55, 0), note(60, 0)];
    const result = analyzeHarmony(regions, defaultKey, events);
    expect(result[0].inversion).toBe(1);
    expect(result[0].bassNote).toBe(52); // E3
  });

  it('detects second inversion (bass = 5th)', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
    ];
    // C major second inversion: G3-C4-E4
    const events = [note(55, 0), note(60, 0), note(64, 0)];
    const result = analyzeHarmony(regions, defaultKey, events);
    expect(result[0].inversion).toBe(2);
    expect(result[0].bassNote).toBe(55); // G3
  });

  it('detects non-root-position 7th chord with correct bass note', () => {
    const regions: ChordRegion[] = [
      region({
        name: '5 dom7',
        noteName: 'G',
        degreeKey: '5 dominant7',
        startTick: 0,
        endTick: 1920,
      }),
    ];
    // G7 with B in bass: B3-D4-F4-G4
    const events = [note(59, 0), note(62, 0), note(65, 0), note(67, 0)];
    const result = analyzeHarmony(regions, defaultKey, events);
    expect(result[0].inversion).toBeGreaterThan(0);
    expect(result[0].bassNote).toBe(59); // B3
  });

  it('uses region.midis when available instead of allEvents', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
        midis: [52, 55, 60], // E3-G3-C4 (first inversion)
      }),
    ];
    // allEvents has root position, but midis should take priority
    const events = [note(48, 0), note(52, 0), note(55, 0)];
    const result = analyzeHarmony(regions, defaultKey, events);
    expect(result[0].inversion).toBe(1);
    expect(result[0].bassNote).toBe(52);
  });

  it('falls back to inversion 0 when no events provided', () => {
    const regions: ChordRegion[] = [
      region({ name: '1 major', noteName: 'C', degreeKey: '1 major' }),
    ];
    const result = analyzeHarmony(regions, defaultKey);
    expect(result[0].inversion).toBe(0);
    expect(result[0].bassNote).toBeUndefined();
  });
});
