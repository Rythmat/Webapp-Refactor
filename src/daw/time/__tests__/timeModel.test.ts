import { describe, expect, it } from 'vitest';
import {
  barSlots,
  barStartTick,
  barToTick,
  barsSpanned,
  feltBeatTicks,
  feltBeatsPerBar,
  gridStepTicks,
  isCompound,
  shiftBarIndex,
  shiftTickForBars,
  slotOfBar,
  snapTicks,
  tickToBar,
  ticksPerBar,
  ticksPerBeat,
  timelineSnapGrid,
  toClipTick,
  toSongTick,
  type TimeSignature,
} from '../timeModel';

// ── The time model ─────────────────────────────────────────────────────────
// One table per metre, so a view that still thinks in 4/4 shows up as a
// wrong number here first (state-reload-09, ia-flows-34, leadsheet-07).

const ts = (numerator: number, denominator: number): TimeSignature => ({
  numerator,
  denominator,
});

describe('bars and beats in each metre', () => {
  const table: Array<
    [TimeSignature, { bar: number; beat: number; felt: number; per: number }]
  > = [
    [ts(4, 4), { bar: 1920, beat: 480, felt: 480, per: 4 }],
    [ts(3, 4), { bar: 1440, beat: 480, felt: 480, per: 3 }],
    [ts(6, 8), { bar: 1440, beat: 240, felt: 720, per: 2 }],
    [ts(7, 8), { bar: 1680, beat: 240, felt: 240, per: 7 }],
    [ts(12, 8), { bar: 2880, beat: 240, felt: 720, per: 4 }],
    [ts(2, 2), { bar: 1920, beat: 960, felt: 960, per: 2 }],
    [ts(5, 4), { bar: 2400, beat: 480, felt: 480, per: 5 }],
  ];
  it.each(table)('%o', (metre, want) => {
    expect(ticksPerBar(metre)).toBe(want.bar);
    expect(ticksPerBeat(metre)).toBe(want.beat);
    expect(feltBeatTicks(metre)).toBe(want.felt);
    expect(feltBeatsPerBar(metre)).toBe(want.per);
  });

  it('calls 6/8, 9/8 and 12/8 compound, and 3/8 and 7/8 not', () => {
    expect(isCompound(ts(6, 8))).toBe(true);
    expect(isCompound(ts(9, 8))).toBe(true);
    expect(isCompound(ts(12, 8))).toBe(true);
    expect(isCompound(ts(3, 8))).toBe(false);
    expect(isCompound(ts(7, 8))).toBe(false);
    expect(isCompound(ts(6, 4))).toBe(false);
  });

  it('turns bars into ticks and back in 3/4 and 7/8', () => {
    expect(barToTick(4, ts(3, 4))).toBe(5760);
    expect(tickToBar(5759, ts(3, 4))).toBe(3);
    expect(tickToBar(5760, ts(3, 4))).toBe(4);
    expect(barStartTick(2000, ts(7, 8))).toBe(1680);
    expect(barsSpanned(0, ts(7, 8))).toBe(0);
    expect(barsSpanned(1681, ts(7, 8))).toBe(2);
  });
});

describe('song time and clip time', () => {
  it('converts a clip at bar 5 both ways', () => {
    const clip = { startTick: 7680 };
    expect(toSongTick(clip, 0)).toBe(7680);
    expect(toSongTick(clip, 480)).toBe(8160);
    expect(toClipTick(clip, 8160)).toBe(480);
    expect(toClipTick(clip, 0)).toBe(-7680);
  });
});

describe('snapping', () => {
  const grid = (metre: TimeSignature, step: number, enabled = true) => ({
    enabled,
    step,
    ts: metre,
  });

  it('snaps a quarter grid in 4/4 as it always has', () => {
    expect(snapTicks(500, grid(ts(4, 4), 480))).toBe(480);
    expect(snapTicks(730, grid(ts(4, 4), 480))).toBe(960);
    expect(snapTicks(-40, grid(ts(4, 4), 480))).toBe(0);
  });

  it('keeps a quarter grid in 7/8 on every bar line', () => {
    // 7/8 bar = 1680; quarter lines within it at 0, 480, 960, 1440.
    const g = grid(ts(7, 8), 480);
    expect(snapTicks(1500, g)).toBe(1440);
    // Nearer the next bar line (1680) than the last quarter (1440).
    expect(snapTicks(1600, g)).toBe(1680);
    // The second bar's quarters count from its own bar line.
    expect(snapTicks(1680 + 470, g)).toBe(1680 + 480);
  });

  it("makes 'Bar' the metre's bar and the beat grid the felt beat", () => {
    expect(gridStepTicks('1/1', ts(3, 4))).toBe(1440);
    expect(gridStepTicks('1/1', ts(7, 8))).toBe(1680);
    expect(gridStepTicks('1/4', ts(6, 8))).toBe(720);
    expect(gridStepTicks('1/4', ts(4, 4))).toBe(480);
    expect(gridStepTicks('1/8', ts(6, 8))).toBe(240);
    expect(gridStepTicks('1/4T', ts(4, 4))).toBe(320);
    // A dotted-quarter beat in 6/8.
    expect(snapTicks(800, grid(ts(6, 8), 720))).toBe(720);
    expect(snapTicks(1100, grid(ts(6, 8), 720))).toBe(1440);
  });

  it('lets a tick through, whole, when snap is off', () => {
    expect(snapTicks(733.6, grid(ts(4, 4), 480, false))).toBe(734);
    expect(snapTicks(-3, grid(ts(4, 4), 480, false))).toBe(0);
  });

  it('reads the timeline grid from the store', () => {
    expect(
      timelineSnapGrid({
        timelineSnapEnabled: true,
        timelineGridSize: '1/1',
        timeSignatureNumerator: 3,
        timeSignatureDenominator: 4,
      }),
    ).toEqual({ enabled: true, step: 1440, ts: ts(3, 4) });
  });
});

describe('bars on the chart: multi-bar rests', () => {
  it('gives each rest one slot that keeps its real bar', () => {
    // An intro rest of 2 at bar 0 and a stop rest of 3 at bar 6, 12 bars.
    const slots = barSlots(12, { 0: 2, 6: 3 });
    expect(slots.map((s) => s.realIndex)).toEqual([
      0, 2, 3, 4, 5, 6, 9, 10, 11,
    ]);
    expect(slots[0]).toEqual({ realIndex: 0, bars: 2, rest: true });
    expect(slots[5]).toEqual({ realIndex: 6, bars: 3, rest: true });
    expect(slots[6]).toEqual({ realIndex: 9, bars: 1, rest: false });
    // A section after both rests is found by its real bar.
    expect(slotOfBar(slots, 9)).toBe(6);
    expect(slotOfBar(slots, 7)).toBe(5);
    expect(slotOfBar(slots, 1)).toBe(0);
    expect(slotOfBar(slots, 12)).toBe(-1);
  });

  it('ignores a one-bar "rest" and an empty map', () => {
    expect(barSlots(3, { 1: 1 }).map((s) => s.bars)).toEqual([1, 1, 1]);
    expect(barSlots(2, null)).toHaveLength(2);
  });
});

describe('inserting and deleting bars', () => {
  it('moves bar indices at and after the insert', () => {
    expect(shiftBarIndex(2, 3, 1)).toBe(2);
    expect(shiftBarIndex(3, 3, 1)).toBe(4);
    expect(shiftBarIndex(7, 3, 2)).toBe(9);
  });

  it('drops the deleted bars and pulls later ones back', () => {
    expect(shiftBarIndex(3, 3, -1)).toBeNull();
    expect(shiftBarIndex(4, 3, -2)).toBeNull();
    expect(shiftBarIndex(5, 3, -2)).toBe(3);
    expect(shiftBarIndex(1, 3, -2)).toBe(1);
  });

  it('moves ticks by whole bars of the metre', () => {
    const six8 = ts(6, 8);
    expect(shiftTickForBars(1000, 1, 1, six8)).toBe(1000);
    expect(shiftTickForBars(1440, 1, 1, six8)).toBe(2880);
    // Deleting bar 1 in 6/8: a tick inside it lands at its start.
    expect(shiftTickForBars(2000, 1, -1, six8)).toBe(1440);
    expect(shiftTickForBars(3000, 1, -1, six8)).toBe(1560);
  });
});
