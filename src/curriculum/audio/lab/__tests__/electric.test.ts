import { describe, expect, it } from 'vitest';
import {
  brightness,
  currentAmps,
  fluxAt,
  inducedVoltage,
  peakMillivolts,
  pickupNamed,
  pickupRecipe,
  PICKUPS,
} from '../physics/electric';

describe('Ohm’s law', () => {
  it('gives current from voltage and resistance', () => {
    expect(currentAmps(6, 100)).toBeCloseTo(0.06);
    expect(currentAmps(12, 100)).toBeCloseTo(currentAmps(6, 50));
  });
});

describe('Faraday’s law', () => {
  it('makes no voltage when the magnet is still, wherever it is', () => {
    for (const x of [0.1, 0.4, 0.5, 0.9]) {
      expect(Math.abs(inducedVoltage(200, x, 0))).toBe(0);
    }
  });

  it('has the strongest field through the coil with the magnet inside it', () => {
    expect(fluxAt(0.5)).toBe(1);
    expect(fluxAt(0.1)).toBeLessThan(fluxAt(0.3));
    expect(fluxAt(0.9)).toBeCloseTo(fluxAt(0.1));
  });

  it('doubles with the turns and with the speed', () => {
    const base = inducedVoltage(100, 0.4, 1);
    expect(inducedVoltage(200, 0.4, 1)).toBeCloseTo(base * 2);
    expect(inducedVoltage(100, 0.4, 2)).toBeCloseTo(base * 2);
    expect(peakMillivolts(200, 2)).toBe(peakMillivolts(100, 2) * 2);
    expect(peakMillivolts(100, 4)).toBe(peakMillivolts(100, 2) * 2);
  });

  it('turns round when the magnet does, and on the far side of the coil', () => {
    expect(inducedVoltage(100, 0.4, -1)).toBeCloseTo(
      -inducedVoltage(100, 0.4, 1),
    );
    expect(inducedVoltage(100, 0.6, 1)).toBeCloseTo(
      -inducedVoltage(100, 0.4, 1),
    );
    // Dead centre, moving: the field is at its peak, and not changing.
    expect(Math.abs(inducedVoltage(100, 0.5, 1))).toBeCloseTo(0);
  });
});

describe('a pickup’s place', () => {
  it('sounds brighter toward the bridge', () => {
    const tones = PICKUPS.map(({ place }) => brightness(pickupRecipe(place)));
    expect(tones[0]).toBeLessThan(tones[1]);
    expect(tones[1]).toBeLessThan(tones[2]);
  });

  it('misses a harmonic that doesn’t move where it sits', () => {
    // At the middle of the string, every even harmonic has a still point.
    const recipe = pickupRecipe(0.5, 6);
    expect(recipe[1]).toBeCloseTo(0);
    expect(recipe[3]).toBeCloseTo(0);
    expect(recipe[0]).toBe(1);
  });

  it('scales its strongest harmonic to 1', () => {
    for (const { place } of PICKUPS) {
      expect(Math.max(...pickupRecipe(place))).toBeCloseTo(1);
    }
    expect(pickupNamed('bridge').place).toBeLessThan(pickupNamed('neck').place);
  });
});
