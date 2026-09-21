import { describe, expect, it } from 'vitest';
import type { MeasureBox } from '@/components/notation/StaffView';
import {
  chordRange,
  placeChords,
  withChordsHidden,
  withPartChordsRestored,
} from '@/daw/components/Score/scoreChords';
import type { ChordRegion } from '@/daw/store/prismSlice';

const region = (id: string, startTick: number, noteName: string): ChordRegion =>
  ({
    id,
    startTick,
    endTick: startTick + 1920,
    name: noteName,
    noteName,
    color: [0, 0, 0],
  }) as ChordRegion;

const REGIONS = [
  region('r1', 0, 'C'),
  region('r2', 1920, 'Am'),
  region('r3', 3840, 'F'),
];

/** Two parts, two bars each, 200px wide bars. */
const MEASURES: MeasureBox[] = [0, 1].flatMap((partIndex) =>
  [0, 1].map((measureIndex) => ({
    measureIndex,
    partIndex,
    system: 0,
    x: 100 + measureIndex * 200,
    y: 50 + partIndex * 150,
    width: 200,
    height: 80,
    startTick: measureIndex * 1920,
    endTick: (measureIndex + 1) * 1920,
  })),
);

const TRACK_BY_PART = new Map([
  [0, 'lead'],
  [1, 'piano'],
]);

describe('placing chord symbols', () => {
  it('draws them only over the parts that show them', () => {
    const placed = placeChords({
      regions: REGIONS,
      measures: MEASURES,
      visibleParts: new Set([1]),
      hidden: new Set(),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed.map((p) => p.key)).toEqual(['1:r1', '1:r2']);
    // Bar 1 starts at x=100; bar 2 at x=300. The third chord is off the score.
    expect(placed.map((p) => p.x)).toEqual([100, 300]);
    expect(placed[0].y).toBe(180); // above the piano staff at y=200
    expect(placed[0].text).toBe('C');
  });

  it('shows the same chords over several parts', () => {
    const placed = placeChords({
      regions: REGIONS,
      measures: MEASURES,
      visibleParts: new Set([0, 1]),
      hidden: new Set(),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed).toHaveLength(4);
  });

  it('leaves out only the part a chord was removed from', () => {
    const placed = placeChords({
      regions: REGIONS,
      measures: MEASURES,
      visibleParts: new Set([0, 1]),
      hidden: new Set(['piano:r1']),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed.map((p) => p.key).sort()).toEqual(['0:r1', '0:r2', '1:r2']);
  });

  it('places a chord partway through a bar', () => {
    const placed = placeChords({
      regions: [region('mid', 960, 'G')],
      measures: MEASURES,
      visibleParts: new Set([0]),
      hidden: new Set(),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed[0].x).toBe(200); // halfway across a 200px bar
  });
});

describe('selecting and removing chords', () => {
  const placed = placeChords({
    regions: REGIONS,
    measures: MEASURES,
    visibleParts: new Set([0, 1]),
    hidden: new Set(),
    trackIdByPart: TRACK_BY_PART,
    format: 'hybrid',
    scale: 1,
  });

  it('ranges across parts and time', () => {
    expect(chordRange(placed, '0:r1', '1:r1').sort()).toEqual(['0:r1', '1:r1']);
    expect(chordRange(placed, '0:r1', '0:r2').sort()).toEqual(['0:r1', '0:r2']);
    expect(chordRange(placed, '0:r1', '1:r2').sort()).toEqual([
      '0:r1',
      '0:r2',
      '1:r1',
      '1:r2',
    ]);
  });

  it('hides a chord from one part only', () => {
    const hidden = withChordsHidden([], ['1:r1'], TRACK_BY_PART);
    expect(hidden).toEqual(['piano:r1']);
    // The lead part still shows it.
    const still = placeChords({
      regions: REGIONS,
      measures: MEASURES,
      visibleParts: new Set([0, 1]),
      hidden: new Set(hidden),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(still.some((p) => p.key === '0:r1')).toBe(true);
    expect(still.some((p) => p.key === '1:r1')).toBe(false);
  });

  it('hides from several parts when several are selected', () => {
    expect(
      withChordsHidden([], ['0:r1', '1:r1'], TRACK_BY_PART).sort(),
    ).toEqual(['lead:r1', 'piano:r1']);
  });

  it('restores one part without touching the others', () => {
    const hidden = ['lead:r1', 'piano:r1', 'piano:r2'];
    expect(withPartChordsRestored(hidden, 'piano')).toEqual(['lead:r1']);
  });
});

describe('standing over the beat', () => {
  it('uses the note, rest or slash written on that beat', () => {
    const placed = placeChords({
      regions: REGIONS,
      measures: MEASURES,
      anchors: [
        { partIndex: 0, tick: 0, x: 137 }, // where the note is actually drawn
        { partIndex: 0, tick: 1920, x: 321 },
      ],
      visibleParts: new Set([0]),
      hidden: new Set(),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed.map((p) => p.x)).toEqual([137, 321]);
  });

  it('falls back to the bar when the beat holds nothing', () => {
    const placed = placeChords({
      regions: [REGIONS[0]],
      measures: MEASURES,
      anchors: [{ partIndex: 0, tick: 960, x: 200 }],
      visibleParts: new Set([0]),
      hidden: new Set(),
      trackIdByPart: TRACK_BY_PART,
      format: 'hybrid',
      scale: 1,
    });
    expect(placed[0].x).toBe(100);
  });
});
