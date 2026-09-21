import { describe, expect, it } from 'vitest';
import { makeMeter } from '../meter';
import { quantizeStaff } from '../quantize';

const Q = 480;
const meter = makeMeter([4, 4], Q);

const span = (start: number, end: number) => ({ start, end });
const lengths = (notes: Array<{ start: number; end: number }>) =>
  quantizeStaff(notes, meter).spans.map((s) => s.end - s.start);

describe('a written length survives quantizing', () => {
  // A beat takes its grid from onsets alone, so a bar holding one note on the
  // beat reads as eighths. Snapping that note's end onto the eighth grid used
  // to round a sixteenth (120 of 480) up to an eighth (240), because
  // Math.round(0.5) rounds up — the editor's 16th button appeared to write
  // eighths.
  const WRITTEN: Array<[string, number]> = [
    ['32nd', 60],
    ['16th', 120],
    ['dotted 16th', 180],
    ['eighth', 240],
    ['dotted eighth', 360],
    ['quarter', 480],
    ['dotted quarter', 720],
    ['half', 960],
    ['whole', 1920],
  ];

  it.each(WRITTEN)('keeps a %s on the downbeat', (_name, ticks) => {
    expect(lengths([span(0, ticks)])).toEqual([ticks]);
  });

  it.each(WRITTEN)('keeps a %s off the downbeat', (_name, ticks) => {
    // Starting on beat 3 of the bar, well away from bar boundaries.
    expect(lengths([span(960, 960 + ticks)])).toEqual([ticks]);
  });

  it('keeps a run of sixteenths as sixteenths', () => {
    const run = [span(0, 120), span(120, 240), span(240, 360), span(360, 480)];
    expect(lengths(run)).toEqual([120, 120, 120, 120]);
  });

  it('keeps a sixteenth that starts on an off-beat', () => {
    expect(lengths([span(120, 240)])).toEqual([120]);
  });

  it('leaves the onset where it was written', () => {
    const { spans } = quantizeStaff([span(240, 360)], meter);
    expect(spans[0].start).toBe(240);
    expect(spans[0].end).toBe(360);
  });
});

describe('a performed length still gets rounded', () => {
  // The point of quantizing: a gated recording lands just short of the beat.
  it('rounds a gated quarter up to the beat', () => {
    expect(lengths([span(0, 460)])).toEqual([480]);
  });

  it('rounds a gated eighth', () => {
    expect(lengths([span(0, 228)])).toEqual([240]);
  });

  it('snaps a late onset back onto the grid', () => {
    const { spans } = quantizeStaff([span(12, 492)], meter);
    expect(spans[0].start).toBe(0);
  });

  it('never leaves a note with no length', () => {
    for (const s of quantizeStaff([span(0, 1)], meter).spans) {
      expect(s.end).toBeGreaterThan(s.start);
    }
  });
});

describe('other meters', () => {
  it('keeps sixteenths in 6/8 too', () => {
    const sixEight = makeMeter([6, 8], Q);
    const { spans } = quantizeStaff([span(0, 120)], sixEight);
    expect(spans[0].end - spans[0].start).toBe(120);
  });
});
