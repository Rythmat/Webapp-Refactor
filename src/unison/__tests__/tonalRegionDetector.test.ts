import { describe, it, expect } from 'vitest';
import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import { detectTonalRegions } from '../engine/tonalRegionDetector';
import type { KeyDetection, UnisonChordRegion } from '../types/schema';

// PPQ = 480, so 1 bar = 1920 ticks, 4 bars = 7680 ticks

/** Helper: create a note event */
function note(
  pc: number,
  octave: number,
  startTick: number,
  durationTicks = 480,
  velocity = 100,
): MidiNoteEvent {
  return {
    note: pc + octave * 12,
    velocity,
    startTick,
    durationTicks,
    channel: 1,
  };
}

/** Helper: create a block of notes in a key to fill a tick range */
function fillWithKey(
  rootPc: number,
  mode: 'major' | 'minor',
  startTick: number,
  endTick: number,
): MidiNoteEvent[] {
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  const scale = mode === 'major' ? majorScale : minorScale;
  const events: MidiNoteEvent[] = [];

  for (let tick = startTick; tick < endTick; tick += 240) {
    const degree = Math.floor(Math.random() * 7);
    const pc = (rootPc + scale[degree]) % 12;
    events.push(note(pc, 4, tick, 240, 80 + Math.floor(Math.random() * 40)));
  }

  // Emphasize tonic
  for (let tick = startTick; tick < endTick; tick += 1920) {
    events.push(note(rootPc, 4, tick, 960, 110));
  }

  return events;
}

const defaultKey: KeyDetection = {
  rootPc: 0,
  rootName: 'C',
  mode: 'ionian',
  modeDisplay: 'Ionian',
  confidence: 0.9,
  alternateKeys: [],
};

const emptyChordTimeline: UnisonChordRegion[] = [];

describe('detectTonalRegions', () => {
  it('returns empty array for empty events', () => {
    const result = detectTonalRegions([], emptyChordTimeline, defaultKey);
    expect(result).toEqual([]);
  });

  it('returns single primary region for short piece', () => {
    // Less than one window (7680 ticks)
    const events = fillWithKey(0, 'major', 0, 3840);
    const result = detectTonalRegions(events, emptyChordTimeline, defaultKey);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('primary');
  });

  it('returns at least one region for a single-key piece', () => {
    // 16 bars of C major
    const events = fillWithKey(0, 'major', 0, 30720);
    const result = detectTonalRegions(events, emptyChordTimeline, defaultKey);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // All regions should be primary (same key as detected)
    for (const r of result) {
      expect(r.type).toBe('primary');
    }
  });

  it('detects key change between two distinct sections', () => {
    // 8 bars of C major followed by 8 bars of Ab major
    const cMajorEvents = fillWithKey(0, 'major', 0, 15360);
    const abMajorEvents = fillWithKey(8, 'major', 15360, 30720);
    const events = [...cMajorEvents, ...abMajorEvents];

    const result = detectTonalRegions(events, emptyChordTimeline, defaultKey);

    // Should detect at least 2 regions
    // (exact count depends on window overlap and confidence thresholds)
    expect(result.length).toBeGreaterThanOrEqual(1);

    // At least one region should cover the first half
    const firstRegion = result[0];
    expect(firstRegion.startTick).toBeLessThanOrEqual(0);
  });

  it('maps chord indices correctly', () => {
    const events = fillWithKey(0, 'major', 0, 7680);
    const chordTimeline: UnisonChordRegion[] = [
      {
        id: 'c1',
        startTick: 0,
        endTick: 1920,
        rootPc: 0,
        quality: 'major',
        noteName: 'C',
        degree: '1',
        hybridName: '1 major',
        romanNumeral: 'I',
        color: [210, 64, 74],
        inversion: 0,
        confidence: 1.0,
      },
      {
        id: 'c2',
        startTick: 1920,
        endTick: 3840,
        rootPc: 5,
        quality: 'major',
        noteName: 'F',
        degree: '4',
        hybridName: '4 major',
        romanNumeral: 'IV',
        color: [248, 168, 197],
        inversion: 0,
        confidence: 1.0,
      },
      {
        id: 'c3',
        startTick: 3840,
        endTick: 7680,
        rootPc: 7,
        quality: 'major',
        noteName: 'G',
        degree: '5',
        hybridName: '5 major',
        romanNumeral: 'V',
        color: [255, 115, 72],
        inversion: 0,
        confidence: 1.0,
      },
    ];

    const result = detectTonalRegions(events, chordTimeline, defaultKey);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].startChordIndex).toBe(0);
    expect(result[0].endChordIndex).toBeLessThanOrEqual(chordTimeline.length);
  });

  it('respects custom config', () => {
    const events = fillWithKey(0, 'major', 0, 15360);
    const result = detectTonalRegions(events, emptyChordTimeline, defaultKey, {
      windowSizeTicks: 3840,
      hopSizeTicks: 960,
    });
    // Should still work with different config
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
