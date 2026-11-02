import { describe, expect, it } from 'vitest';
import {
  beatEnvelope,
  beatRate,
  sumAmplitude,
  sumAt,
} from '../physics/combine';
import {
  equalTemperedHz,
  intervalHz,
  intervalNamed,
  INTERVALS,
  lissajousAt,
} from '../physics/intervals';
import {
  BANDS,
  bandOf,
  broadBandOf,
  hearingPosition,
  INSTRUMENT_RANGES,
} from '../physics/spectrum';
import { centsBetween, nearestNote } from '../physics/wave';

describe('waves adding up', () => {
  it('doubles in step and cancels half a cycle out', () => {
    expect(sumAmplitude(0)).toBeCloseTo(1);
    expect(sumAmplitude(180)).toBeCloseTo(0);
    expect(sumAmplitude(360)).toBeCloseTo(1);
    expect(sumAmplitude(90)).toBeCloseTo(Math.SQRT1_2);
  });

  it('agrees with the waves it draws, at every place', () => {
    for (const phase of [0, 45, 90, 180, 270]) {
      let peak = 0;
      for (let i = 0; i < 1000; i++) {
        peak = Math.max(peak, Math.abs(sumAt(i / 1000, phase)));
      }
      expect(peak).toBeCloseTo(sumAmplitude(phase), 3);
    }
  });

  it('beats at the difference between two tones', () => {
    expect(beatRate(220, 223)).toBe(3);
    expect(beatEnvelope(0, 220, 223)).toBeCloseTo(1);
    expect(beatEnvelope(1 / 6, 220, 223)).toBeCloseTo(0);
    expect(beatEnvelope(1 / 3, 220, 223)).toBeCloseTo(1);
  });
});

describe('the spectrum', () => {
  it('covers the range of hearing with no gaps', () => {
    expect(BANDS[0].low).toBe(20);
    expect(BANDS[BANDS.length - 1].high).toBe(20_000);
    BANDS.slice(1).forEach((band, i) => {
      expect(band.low).toBe(BANDS[i].high);
    });
  });

  it('names a tone’s band', () => {
    expect(bandOf(440).name).toBe('Low mids');
    expect(bandOf(100).name).toBe('Bass');
    expect(broadBandOf(120)).toBe('lows');
    expect(broadBandOf(1000)).toBe('mids');
    expect(broadBandOf(5000)).toBe('highs');
  });

  it('gives each octave the same width', () => {
    const octave = hearingPosition(200) - hearingPosition(100);
    expect(hearingPosition(2000) - hearingPosition(1000)).toBeCloseTo(octave);
  });

  // Slide 18 of the deck gave mix focus as the range; these are the notes.
  it('gives each instrument’s real lowest note', () => {
    const lowest = Object.fromEntries(
      INSTRUMENT_RANGES.map((item) => [item.id, nearestNote(item.low).name]),
    );
    expect(lowest).toEqual({
      piano: 'A0',
      bass: 'E1',
      guitar: 'E2',
      violin: 'G3',
      flute: 'C4',
    });
  });
});

describe('intervals', () => {
  it('holds each ratio in lowest terms', () => {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    for (const { high, low } of INTERVALS) expect(gcd(high, low)).toBe(1);
  });

  it('keeps a piano’s fifth 2 cents narrow and its third 14 wide', () => {
    const fifth = intervalHz(220, intervalNamed('fifth'));
    const third = intervalHz(220, intervalNamed('third'));
    expect(centsBetween(equalTemperedHz(220, 7), fifth)).toBeCloseTo(-2, 0);
    expect(centsBetween(equalTemperedHz(220, 4), third)).toBeCloseTo(14, 0);
  });

  it('closes a Lissajous figure after one full turn', () => {
    const fifth = intervalNamed('fifth');
    const [x0, y0] = lissajousAt(0, fifth, 0.3);
    const [x1, y1] = lissajousAt(1, fifth, 0.3);
    expect(x1).toBeCloseTo(x0);
    expect(y1).toBeCloseTo(y0);
  });
});
