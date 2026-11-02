import { describe, expect, it } from 'vitest';
import { recipePeak } from '../physics/harmonics';
import {
  aliasOf,
  cableAt,
  CLIP_VOLTS,
  COMMON_MODE_LEAK,
  crossoverWeights,
  dbOf,
  gainToLine,
  hardClip,
  LINE_VOLTS,
  nyquist,
  outputVolts,
  pickupAt,
  powerDb,
  quantize,
  renderCable,
  renderStack,
  renderTone,
  softClip,
  speakerVolts,
  throughDriver,
} from '../physics/signal';

const RATE = 48000;
const peakOf = (samples: Float32Array) =>
  samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
/** A frequency's strength in a whole-number-of-cycles loop, by correlation. */
function strengthAt(samples: Float32Array, hz: number, rate = RATE) {
  let re = 0;
  let im = 0;
  samples.forEach((v, i) => {
    re += v * Math.cos((2 * Math.PI * hz * i) / rate);
    im += v * Math.sin((2 * Math.PI * hz * i) / rate);
  });
  return (2 * Math.hypot(re, im)) / samples.length;
}

describe('levels and gain', () => {
  it('needs about 56 dB for a mic and 22 for a guitar', () => {
    expect(gainToLine(0.002)).toBeCloseTo(55.8, 0);
    expect(gainToLine(0.1)).toBeCloseTo(21.8, 0);
    expect(outputVolts(0.002, gainToLine(0.002))).toBeCloseTo(LINE_VOLTS);
  });

  it('leaves room above line level before it clips', () => {
    expect(dbOf(CLIP_VOLTS / LINE_VOLTS)).toBeCloseTo(6, 0);
  });

  it('adds harmonics only once a tone clips', () => {
    const clean = renderTone(220, RATE, (s) => hardClip(s * 0.5));
    const hot = renderTone(220, RATE, (s) => hardClip(s * 4));
    expect(strengthAt(clean, 660)).toBeLessThan(0.001);
    expect(strengthAt(hot, 660)).toBeGreaterThan(0.2);
    expect(peakOf(hot)).toBeLessThanOrEqual(1);
  });

  it('rounds off under a tube curve where a transistor flattens', () => {
    expect(softClip(0.1)).toBeCloseTo(0.1, 2);
    expect(softClip(1)).toBeLessThan(hardClip(1));
    expect(softClip(10)).toBeLessThanOrEqual(1);
  });
});

describe('the converter', () => {
  it('holds up to half the sample rate, and folds what’s above it', () => {
    expect(nyquist(44100)).toBe(22050);
    expect(aliasOf(1000, 8000)).toBe(1000);
    expect(aliasOf(5000, 8000)).toBe(3000);
    expect(aliasOf(3000, 5000)).toBe(2000);
    expect(aliasOf(5000, 12000)).toBe(5000);
  });

  it('really does give the same samples for the folded tone', () => {
    const rate = 8000;
    for (let i = 0; i < 40; i++) {
      const high = Math.sin((2 * Math.PI * 5000 * i) / rate);
      const low = -Math.sin((2 * Math.PI * 3000 * i) / rate);
      expect(high).toBeCloseTo(low, 9);
    }
  });

  it('rounds to the levels its bits allow', () => {
    expect(quantize(0.3, 2)).toBe(0.5);
    expect(quantize(0.2, 2)).toBe(0);
    expect(Math.abs(quantize(0.123456, 16) - 0.123456)).toBeLessThan(0.0001);
    expect(quantize(5, 3)).toBe(1);
  });

  it('adds audible error at low bit depths, and next to none at high', () => {
    const clean = renderTone(880, RATE);
    const errorAt = (bits: number) => {
      const rounded = renderTone(880, RATE, (s) => quantize(s, bits));
      let error = 0;
      let signal = 0;
      rounded.forEach((v, i) => {
        error += (v - clean[i]) ** 2;
        signal += clean[i] ** 2;
      });
      return Math.sqrt(error / signal);
    };
    // About 6 dB of signal to noise a bit: a tenth of the signal at 3 bits.
    expect(errorAt(3)).toBeGreaterThan(0.05);
    expect(errorAt(16)).toBeLessThan(0.0001);
  });
});

describe('power', () => {
  it('gives 3 dB for twice the watts and 10 for ten times', () => {
    expect(powerDb(100, 50)).toBeCloseTo(3, 0);
    expect(powerDb(100, 10)).toBeCloseTo(10);
  });

  it('gives speaker level in tens of volts', () => {
    expect(speakerVolts(100)).toBeCloseTo(28.3, 0);
  });
});

describe('the crossover', () => {
  it('shares a harmonic’s power, whatever its frequency', () => {
    for (const hz of [100, 800, 1500, 4000, 12000]) {
      const { woofer, tweeter } = crossoverWeights(hz, 1500);
      expect(woofer ** 2 + tweeter ** 2).toBeCloseTo(1);
    }
  });

  it('gives lows to the woofer and highs to the tweeter', () => {
    expect(crossoverWeights(200, 1500).woofer).toBeGreaterThan(0.99);
    expect(crossoverWeights(6000, 1500).tweeter).toBeGreaterThan(0.99);
    expect(crossoverWeights(1500, 1500).woofer).toBeCloseTo(Math.SQRT1_2);
  });

  it('leaves a driver quieter than the whole, as it really is', () => {
    const rich = Array.from({ length: 30 }, (_, i) => 1 / (i + 1));
    const peak = recipePeak(rich);
    const render = (driver: 'both' | 'woofer' | 'tweeter') =>
      renderStack(220, RATE, throughDriver(rich, 220, 1500, driver), peak);
    expect(peakOf(render('both'))).toBeCloseTo(1, 1);
    expect(peakOf(render('tweeter'))).toBeLessThan(peakOf(render('woofer')));
    expect(strengthAt(render('woofer'), 220)).toBeGreaterThan(
      strengthAt(render('tweeter'), 220) * 10,
    );
  });
});

describe('a cable', () => {
  it('picks up more hum the longer it is', () => {
    expect(pickupAt(50)).toBeGreaterThan(pickupAt(5));
  });

  it('leaves hum on an unbalanced cable, in the sound itself', () => {
    const out = renderCable(440, RATE, 40, 'unbalanced');
    expect(strengthAt(out, 60)).toBeGreaterThan(0.3);
    expect(strengthAt(out, 440)).toBeCloseTo(0.5, 1);
  });

  it('cancels hum on a balanced one, keeping the signal, in the sound itself', () => {
    const unbalanced = strengthAt(renderCable(440, RATE, 40, 'unbalanced'), 60);
    const balanced = renderCable(440, RATE, 40, 'balanced');
    expect(strengthAt(balanced, 60)).toBeLessThan(unbalanced * 0.02);
    expect(strengthAt(balanced, 440)).toBeCloseTo(0.5, 2);
  });

  it('has the hum on both wires, and the signal flipped on the second', () => {
    const at = cableAt(0.5, 0.004, 40, 'balanced');
    const hum = (at.hot + at.cold) / 2;
    expect(at.hot - hum).toBeCloseTo(0.5, 1);
    expect(at.cold - hum).toBeCloseTo(-0.5, 1);
    expect(COMMON_MODE_LEAK).toBeGreaterThan(0);
  });

  it('loops clean: its last sample leads straight back to its first', () => {
    const out = renderCable(440, RATE, 40, 'unbalanced');
    expect(Math.abs(out[out.length - 1] - out[0])).toBeLessThan(0.2);
  });
});
