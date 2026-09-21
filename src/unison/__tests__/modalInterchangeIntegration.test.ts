import { describe, it, expect, beforeEach } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { analyzeHarmony } from '../engine/harmonicAnalyzer';
import type { KeyDetection } from '../types/schema';

/** Helper: create a ChordRegion with sensible defaults */
function region(
  overrides: Partial<ChordRegion> & { name: string; noteName: string },
): ChordRegion {
  return {
    id: `r-${regionCounter++}`,
    startTick: 0,
    endTick: 1920,
    color: [0, 100, 50] as [number, number, number],
    ...overrides,
  };
}
let regionCounter = 0;

function cKey(
  rootPc: number,
  rootName: string,
  mode: string,
  modeDisplay: string,
): KeyDetection {
  return {
    rootPc,
    rootName,
    mode,
    modeDisplay,
    confidence: 0.9,
    alternateKeys: [],
  };
}

const cMajor = cKey(0, 'C', 'ionian', 'Ionian');
const aMinor = cKey(9, 'A', 'aeolian', 'Aeolian');

describe('Modal Interchange Integration — analyzeHarmony Pass 2', () => {
  beforeEach(() => {
    regionCounter = 0;
  });

  // ── All diatonic progressions ──────────────────────────────────────────
  it('marks all chords as diatonic in 1-4-5-1 (C major)', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '4 major',
        noteName: 'F',
        degreeKey: '4 major',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: '5 major',
        noteName: 'G',
        degreeKey: '5 major',
        startTick: 3840,
        endTick: 5760,
      }),
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 5760,
        endTick: 7680,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);
    expect(result).toHaveLength(4);
    for (const chord of result) {
      expect(chord.isDiatonic).toBe(true);
      expect(chord.modalInterchange).toBeNull();
    }
  });

  it('marks all chords as diatonic in 1-4-5-1 (A minor)', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 minor',
        noteName: 'A',
        degreeKey: '1 minor',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '4 minor',
        noteName: 'D',
        degreeKey: '4 minor',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: '5 minor',
        noteName: 'E',
        degreeKey: '5 minor',
        startTick: 3840,
        endTick: 5760,
      }),
      region({
        name: '1 minor',
        noteName: 'A',
        degreeKey: '1 minor',
        startTick: 5760,
        endTick: 7680,
      }),
    ];
    const result = analyzeHarmony(regions, aMinor);
    for (const chord of result) {
      expect(chord.isDiatonic).toBe(true);
    }
  });

  // ── Borrowed chords from aeolian ───────────────────────────────────────
  it('detects ♭6 maj and ♭7 maj as borrowed from aeolian in C major', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: 'b6 major',
        noteName: 'Ab',
        degreeKey: 'b6 major',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: 'b7 major',
        noteName: 'Bb',
        degreeKey: 'b7 major',
        startTick: 3840,
        endTick: 5760,
      }),
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 5760,
        endTick: 7680,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    // Both 1 chords are diatonic
    expect(result[0].isDiatonic).toBe(true);
    expect(result[3].isDiatonic).toBe(true);

    // ♭6 = Ab major → borrowed
    expect(result[1].isDiatonic).toBe(false);
    expect(result[1].modalInterchange).not.toBeNull();
    expect(result[1].modalInterchange!.type).toBe('borrowed');
    expect(result[1].sourceMode).toBeDefined();

    // ♭7 = Bb major → borrowed
    expect(result[2].isDiatonic).toBe(false);
    expect(result[2].modalInterchange).not.toBeNull();
    expect(result[2].modalInterchange!.type).toBe('borrowed');
  });

  // ── 4 min (minor plagal) ────────────────────────────────────────────
  it('detects 4 min as borrowed in C major', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '4 minor',
        noteName: 'F',
        degreeKey: '4 minor',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 3840,
        endTick: 5760,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    expect(result[1].isDiatonic).toBe(false);
    expect(result[1].modalInterchange!.type).toBe('borrowed');
    // 4 min comes from aeolian
    expect(result[1].modalInterchange!.sourceMode).toBe('aeolian');
  });

  // ── Secondary dominants ────────────────────────────────────────────────
  it('detects 5 of 6 (E7 → Am) as secondary dominant in C major', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '3 dominant7',
        noteName: 'E',
        degreeKey: '3 dominant7',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: '6 minor',
        noteName: 'A',
        degreeKey: '6 minor',
        startTick: 3840,
        endTick: 5760,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    // E7 is not diatonic to C major (its 3 chord is Em, not E7)
    expect(result[1].isDiatonic).toBe(false);
    expect(result[1].modalInterchange).not.toBeNull();
    expect(result[1].modalInterchange!.type).toBe('secondary-dominant');
    expect(result[1].modalInterchange!.secondaryTarget).toBe('5 of 6');
    expect(result[1].modalInterchange!.resolved).toBe(true);
  });

  it('detects 5 of 5 (D7 → G) as secondary dominant in C major', () => {
    const regions: ChordRegion[] = [
      region({
        name: '2 dominant7',
        noteName: 'D',
        degreeKey: '2 dominant7',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '5 major',
        noteName: 'G',
        degreeKey: '5 major',
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    expect(result[0].isDiatonic).toBe(false);
    expect(result[0].modalInterchange!.type).toBe('secondary-dominant');
    expect(result[0].modalInterchange!.secondaryTarget).toBe('5 of 5');
    expect(result[0].modalInterchange!.resolved).toBe(true);
  });

  it('detects 5 of 2 (A7 → Dm) as secondary dominant in C major', () => {
    const regions: ChordRegion[] = [
      region({
        name: '6 dominant7',
        noteName: 'A',
        degreeKey: '6 dominant7',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '2 minor',
        noteName: 'D',
        degreeKey: '2 minor',
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    expect(result[0].isDiatonic).toBe(false);
    expect(result[0].modalInterchange!.type).toBe('secondary-dominant');
    expect(result[0].modalInterchange!.secondaryTarget).toBe('5 of 2');
  });

  // ── Multiple secondary dominants in sequence ───────────────────────────
  it('detects chain: 1 - 5 of 6 - 6 - 5 of 2 - 2 - 5 - 1', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 0,
        endTick: 960,
      }),
      region({
        name: '3 dominant7',
        noteName: 'E',
        degreeKey: '3 dominant7',
        startTick: 960,
        endTick: 1920,
      }),
      region({
        name: '6 minor',
        noteName: 'A',
        degreeKey: '6 minor',
        startTick: 1920,
        endTick: 2880,
      }),
      region({
        name: '6 dominant7',
        noteName: 'A',
        degreeKey: '6 dominant7',
        startTick: 2880,
        endTick: 3840,
      }),
      region({
        name: '2 minor',
        noteName: 'D',
        degreeKey: '2 minor',
        startTick: 3840,
        endTick: 4800,
      }),
      region({
        name: '5 dominant7',
        noteName: 'G',
        degreeKey: '5 dominant7',
        startTick: 4800,
        endTick: 5760,
      }),
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        startTick: 5760,
        endTick: 7680,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    expect(result[0].isDiatonic).toBe(true); // 1
    expect(result[1].modalInterchange!.type).toBe('secondary-dominant'); // 5 of 6
    expect(result[2].isDiatonic).toBe(true); // 6
    expect(result[3].modalInterchange!.type).toBe('secondary-dominant'); // 5 of 2
    expect(result[4].isDiatonic).toBe(true); // 2
    expect(result[5].isDiatonic).toBe(true); // 5 dom7 (regular dominant)
    expect(result[6].isDiatonic).toBe(true); // 1
  });

  // ── Secondary leading-tone ─────────────────────────────────────────────
  it('detects G#dim7 → Am as secondary leading-tone (7 of 6)', () => {
    const regions: ChordRegion[] = [
      region({
        name: '#5 diminished7',
        noteName: 'G#',
        degreeKey: '#5 diminished7',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '6 minor',
        noteName: 'A',
        degreeKey: '6 minor',
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    expect(result[0].isDiatonic).toBe(false);
    expect(result[0].modalInterchange!.type).toBe('secondary-leading-tone');
    expect(result[0].modalInterchange!.secondaryTarget).toBe('7 of 6');
  });

  // ── Borrowed chord in minor key ────────────────────────────────────────
  it('detects 5 maj as borrowed from harmonic minor in A aeolian', () => {
    // In A aeolian, the 5 chord is Em. E major is from A harmonic minor.
    const regions: ChordRegion[] = [
      region({
        name: '1 minor',
        noteName: 'A',
        degreeKey: '1 minor',
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: '5 major',
        noteName: 'E',
        degreeKey: '5 major',
        startTick: 1920,
        endTick: 3840,
      }),
      region({
        name: '1 minor',
        noteName: 'A',
        degreeKey: '1 minor',
        startTick: 3840,
        endTick: 5760,
      }),
    ];
    const result = analyzeHarmony(regions, aMinor);

    expect(result[0].isDiatonic).toBe(true);
    expect(result[1].isDiatonic).toBe(false);
    expect(result[1].modalInterchange!.type).toBe('borrowed');
    // E major exists in harmonicMinor at degree 5
    expect(result[1].sourceMode).toBeDefined();
  });

  // ── Color system consistency ───────────────────────────────────────────
  it('preserves original color for all chords regardless of interchange status', () => {
    const regions: ChordRegion[] = [
      region({
        name: '1 major',
        noteName: 'C',
        degreeKey: '1 major',
        color: [210, 64, 74] as [number, number, number],
        startTick: 0,
        endTick: 1920,
      }),
      region({
        name: 'b6 major',
        noteName: 'Ab',
        degreeKey: 'b6 major',
        color: [120, 133, 203] as [number, number, number],
        startTick: 1920,
        endTick: 3840,
      }),
    ];
    const result = analyzeHarmony(regions, cMajor);

    // Colors should pass through unchanged from input
    expect(result[0].color).toEqual([210, 64, 74]);
    expect(result[1].color).toEqual([120, 133, 203]);
  });

  // ── Existing test regression: preserves base fields ────────────────────
  it('still produces correct hybridName, degree', () => {
    const regions: ChordRegion[] = [
      region({ name: '1 major', noteName: 'C', degreeKey: '1 major' }),
    ];
    const result = analyzeHarmony(regions, cMajor);
    expect(result[0].hybridName).toBe('1 major');
    expect(result[0].degree).toBe('1');
    expect(result[0].quality).toBe('major');
  });
});
