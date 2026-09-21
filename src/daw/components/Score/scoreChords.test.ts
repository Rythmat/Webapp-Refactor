import { describe, expect, it } from 'vitest';
import type { MeasureBox } from '@/components/notation/StaffView';
import type { ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { CHORD_FONT_SIZE, placeChords } from './scoreChords';

// A chord symbol belongs to its beat, and nothing may come between the two:
// where the melody under it climbs, the symbol has to climb with it.

const box = (measureIndex: number, startTick: number): MeasureBox => ({
  measureIndex,
  partIndex: 0,
  system: 0,
  x: measureIndex * 200,
  y: 100,
  width: 200,
  height: 80,
  startTick,
  endTick: startTick + 1920,
});

const region = (id: string, startTick: number): ChordRegion =>
  ({
    id,
    startTick,
    endTick: startTick + 1920,
    name: 'maj7',
    noteName: 'C',
  }) as ChordRegion;

const options = {
  measures: [box(0, 0), box(1, 1920)],
  visibleParts: new Set([0]),
  hidden: new Set<string>(),
  trackIdByPart: new Map([[0, 't1']]),
  format: 'jazz' as ChordFormat,
  scale: 1,
};

describe('placeChords', () => {
  it('sits a symbol over the beat it belongs to', () => {
    const [placed] = placeChords({
      ...options,
      regions: [region('r1', 480)],
      anchors: [{ partIndex: 0, tick: 480, x: 137 }],
    });
    expect(placed.x).toBe(137);
  });

  it('keeps clear of music that reaches up into it', () => {
    const [low] = placeChords({
      ...options,
      regions: [region('r1', 0)],
      anchors: [{ partIndex: 0, tick: 0, x: 20, inkTop: 130 }],
    });
    const [high] = placeChords({
      ...options,
      regions: [region('r1', 0)],
      // The same beat, with a note reaching well above the staff.
      anchors: [{ partIndex: 0, tick: 0, x: 20, inkTop: 40 }],
    });
    expect(low.y).toBe(80); // the usual spot, 20 above the stave
    expect(high.y).toBeLessThanOrEqual(40 - CHORD_FONT_SIZE);
  });

  it('only minds the music up to the next chord', () => {
    const [first] = placeChords({
      ...options,
      regions: [region('r1', 0), region('r2', 960)],
      anchors: [
        { partIndex: 0, tick: 0, x: 20, inkTop: 130 },
        // High note on the beat the next chord owns, not this one.
        { partIndex: 0, tick: 960, x: 120, inkTop: 20 },
      ],
    });
    expect(first.y).toBe(80);
  });
});
