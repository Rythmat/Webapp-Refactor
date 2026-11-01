import { describe, expect, it } from 'vitest';
import {
  centsBetween,
  cyclesIn,
  formatHz,
  formatLength,
  hzToPosition,
  midiToHz,
  nearestNote,
  noteName,
  positionToHz,
  wavelength,
  windowMsFor,
} from '../physics/wave';

describe('a sound wave’s numbers', () => {
  it('names concert pitch and the notes around it', () => {
    expect(nearestNote(440)).toEqual({ midi: 69, name: 'A4', cents: 0 });
    expect(nearestNote(220).name).toBe('A3');
    expect(nearestNote(55).name).toBe('A1');
    expect(noteName(60)).toBe('C4');
    expect(midiToHz(69)).toBeCloseTo(440);
  });

  it('says how far off a tone is, in cents', () => {
    expect(nearestNote(445).cents).toBe(20);
    expect(nearestNote(435).cents).toBe(-20);
    expect(centsBetween(880, 440)).toBeCloseTo(1200);
  });

  it('halves the wavelength when the frequency doubles', () => {
    expect(wavelength(440)).toBeCloseTo(0.78, 2);
    expect(wavelength(880)).toBeCloseTo(wavelength(440) / 2);
  });

  it('draws twice the cycles for twice the frequency in the same window', () => {
    expect(cyclesIn(220, 20)).toBeCloseTo(4.4);
    expect(cyclesIn(440, 20)).toBeCloseTo(8.8);
  });

  it('keeps one window across the range, zooming only when too fine to see', () => {
    expect(windowMsFor(55, 800)).toBe(20);
    expect(windowMsFor(1760, 800)).toBe(20);
    // 70 cycles in 800px is 11px each: still legible.
    expect(windowMsFor(3520, 800)).toBe(20);
    // In a phone's 358px they're 5px each: a whole decade in.
    expect(windowMsFor(3520, 358)).toBe(2);
  });

  it('gives a slider equal travel for each octave', () => {
    expect(positionToHz(0, 55, 3520)).toBeCloseTo(55);
    expect(positionToHz(1, 55, 3520)).toBeCloseTo(3520);
    // Six octaves: A4 (three up... of six) sits exactly at their halfway mark.
    expect(positionToHz(0.5, 55, 3520)).toBeCloseTo(440);
    expect(hzToPosition(440, 55, 3520)).toBeCloseTo(0.5);
  });

  it('says lengths and frequencies the way a person would', () => {
    expect(formatLength(1.559)).toBe('1.56 m');
    expect(formatLength(0.78)).toBe('78 cm');
    expect(formatLength(0.0974)).toBe('9.7 cm');
    expect(formatHz(55)).toBe('55 Hz');
    expect(formatHz(440)).toBe('440 Hz');
    expect(formatHz(1760)).toBe('1.76 kHz');
  });
});
