import { describe, expect, it } from 'vitest';
import { recipeNamed } from '../physics/harmonics';
import {
  hzAtPlace,
  membraneReach,
  placeOf,
  placeResult,
  withoutFundamental,
} from '../physics/hearing';
import {
  COMMON_READING,
  phraseHz,
  phraseSemitones,
  stepMs,
} from '../physics/phrase';

describe('the cochlea’s map', () => {
  it('puts high notes near the entrance, low ones at the far end', () => {
    expect(placeOf(8000)).toBeLessThan(placeOf(1000));
    expect(placeOf(1000)).toBeLessThan(placeOf(100));
  });

  it('covers the range of hearing within the cochlea', () => {
    expect(placeOf(20_000)).toBeCloseTo(0, 1);
    expect(placeOf(20)).toBeCloseTo(1, 1);
  });

  it('runs both ways', () => {
    for (const hz of [100, 440, 3000]) {
      expect(hzAtPlace(placeOf(hz))).toBeCloseTo(hz, 5);
    }
  });

  it('moves most at a tone’s own place, and dies quickly past it', () => {
    const peak = placeOf(1000);
    expect(membraneReach(peak, 1000)).toBeCloseTo(1);
    expect(membraneReach(peak - 0.1, 1000)).toBeGreaterThan(
      membraneReach(peak + 0.1, 1000),
    );
    expect(membraneReach(peak + 0.1, 1000)).toBeLessThan(0.01);
  });

  it('separates two notes into two places', () => {
    const low = placeOf(220);
    const high = placeOf(3520);
    expect(membraneReach(low, 3520)).toBeLessThan(0.05);
    expect(membraneReach(high, 220)).toBeLessThan(0.5);
  });

  it('says which way a mark must go', () => {
    expect(placeResult(placeOf(1000), 1000, 0.1)).toBe('match');
    expect(placeResult(placeOf(1000) + 0.3, 1000, 0.1)).toBe('entrance');
    expect(placeResult(placeOf(1000) - 0.3, 1000, 0.1)).toBe('far');
  });
});

describe('a note without its own frequency', () => {
  it('leaves that frequency out, and keeps the rest', () => {
    const full = recipeNamed('bright').harmonics;
    const hollowed = withoutFundamental(full);
    expect(hollowed[0]).toBe(0);
    expect(hollowed.slice(1)).toEqual(full.slice(1));
  });
});

describe('the tune', () => {
  it('differs between major and minor only where the scales do', () => {
    const major = phraseSemitones('major');
    const minor = phraseSemitones('minor');
    expect(major).toHaveLength(minor.length);
    expect(major).not.toEqual(minor);
    expect(major[0]).toBe(minor[0]);
  });

  it('moves whole octaves between registers', () => {
    const at = (register: 'low' | 'high') =>
      phraseHz({ bpm: 100, scale: 'major', register })[0];
    expect(at('high') / at('low')).toBe(4);
  });

  it('plays two notes to a beat', () => {
    expect(stepMs(120)).toBe(250);
  });

  it('reports listeners’ readings as tendencies, never as the answer', () => {
    for (const reading of Object.values(COMMON_READING)) {
      expect(reading).toMatch(/many listeners/i);
    }
  });
});
