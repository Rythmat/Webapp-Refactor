import { describe, expect, it } from 'vitest';
import { ampToDb, dbToAmp, formatDb } from '../physics/decibels';
import {
  compressionsAt,
  crossingSeconds,
  medium,
  PULSE_WIDTH,
  pulseDisplacement,
  seededField,
  squeezeAt,
  toneParticleX,
  tonePressure,
  toneReach,
  wavesAcross,
} from '../physics/particles';

describe('a pulse through a medium', () => {
  it('moves a particle and leaves it where it started', () => {
    const x = 0.5;
    expect(pulseDisplacement(x, 0, 0.02)).toBeCloseTo(0, 6);
    expect(pulseDisplacement(x, x, 0.02)).toBeCloseTo(0.02);
    expect(pulseDisplacement(x, 1, 0.02)).toBeCloseTo(0, 6);
    expect(PULSE_WIDTH).toBeLessThan(0.5);
  });

  it('races the media to scale: their real speeds, all slowed alike', () => {
    const air = crossingSeconds(medium('air').speed);
    const water = crossingSeconds(medium('water').speed);
    const steel = crossingSeconds(medium('steel').speed);
    expect(steel).toBeLessThan(water);
    expect(water).toBeLessThan(air);
    expect(air / water).toBeCloseTo(1480 / 343);
    expect(water / steel).toBeCloseTo(5000 / 1480);
  });

  it('never arrives through a vacuum', () => {
    expect(crossingSeconds(medium('vacuum').speed)).toBe(Infinity);
    expect(medium('vacuum').particles).toBe(0);
  });
});

describe('a steady tone through air', () => {
  // Count particles near a place: the drawing's own positions.
  const field = seededField(4000, 7);
  const near = (at: number, phase: number, waves: number) =>
    field.filter((p) => {
      const x = toneParticleX(p.x, phase, waves, 1);
      return Math.abs(x - at) < 0.02;
    }).length;

  it('bunches particles exactly where the drawn pressure is highest', () => {
    for (const phase of [0, 0.3, 0.71]) {
      const waves = 3;
      const middle = compressionsAt(phase, waves).find(
        (x) => x > 0.25 && x < 0.75,
      )!;
      expect(tonePressure(middle, phase, waves)).toBeCloseTo(1);
      const crowded = near(middle, phase, waves);
      const sparse = near(middle + 0.5 / waves, phase, waves);
      expect(tonePressure(middle + 0.5 / waves, phase, waves)).toBeCloseTo(-1);
      expect(crowded).toBeGreaterThan(sparse * 2.5);
    }
  });

  it('swings each particle around its own place, whatever the moment', () => {
    const reach = toneReach(3, 1);
    for (let phase = 0; phase < 1; phase += 0.05) {
      expect(
        Math.abs(toneParticleX(0.4, phase, 3, 1) - 0.4),
      ).toBeLessThanOrEqual(reach + 1e-9);
    }
  });

  it('never lets particles overtake one another', () => {
    const waves = 6;
    const phase = 0.2;
    for (let x = 0; x < 1; x += 0.001) {
      expect(toneParticleX(x + 0.001, phase, waves, 1)).toBeGreaterThan(
        toneParticleX(x, phase, waves, 1),
      );
    }
  });

  it('packs twice the wavelengths on stage for twice the frequency', () => {
    expect(wavesAcross(880)).toBeCloseTo(wavesAcross(440) * 2);
    expect(wavesAcross(440)).toBeCloseTo(3, 0);
  });

  it('calls a place what it is', () => {
    const waves = 3;
    const phase = 0.1;
    const peak = compressionsAt(phase, waves)[0];
    expect(squeezeAt(peak, phase, waves)).toBe('compression');
    expect(squeezeAt(peak + 0.5 / waves, phase, waves)).toBe('rarefaction');
    expect(squeezeAt(peak + 0.25 / waves, phase, waves)).toBe('between');
  });

  it('draws the same field on every visit', () => {
    expect(seededField(5, 3)).toEqual(seededField(5, 3));
    expect(seededField(5, 3)).not.toEqual(seededField(5, 4));
  });
});

describe('amplitude and decibels', () => {
  it('counts half the amplitude as about −6 dB', () => {
    expect(ampToDb(1)).toBe(0);
    expect(ampToDb(0.5)).toBeCloseTo(-6.02, 2);
    expect(ampToDb(0.25)).toBeCloseTo(-12.04, 2);
    expect(dbToAmp(-20)).toBeCloseTo(0.1);
  });

  it('says so in words', () => {
    expect(formatDb(0)).toBe('0 dB');
    expect(formatDb(ampToDb(0.5))).toBe('−6 dB');
    expect(formatDb(ampToDb(0))).toBe('Silent');
  });
});
