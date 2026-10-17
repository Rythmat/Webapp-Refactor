import { describe, expect, it } from 'vitest';
import {
  describeKey,
  keySignatureDescription,
  modeFromKeyName,
} from '../keyDescription';

describe('describeKey', () => {
  it('describes C Ionian as the Theory overview does', () => {
    const key = describeKey('C', 'ionian');
    expect(key).toMatchObject({
      title: 'C Ionian',
      character: 'The major scale: bright, settled, home',
      signature: 'has no sharps or flats',
      notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    });
    expect(key?.degrees).toMatch(/^1, 2, 3, 4, 5, 6, 7$/);
  });

  it('spells the key and counts its accidentals', () => {
    expect(describeKey('D', 'dorian')?.signature).toBe(
      'has no sharps or flats',
    );
    expect(describeKey('Bb', 'ionian')?.notes[0]).toBe('B♭');
    expect(describeKey('Bb', 'ionian')?.signature).toBe('has 2 flats');
    expect(describeKey('E', 'ionian')?.signature).toBe('has 4 sharps');
  });

  it('gives up on a mode it cannot spell', () => {
    expect(describeKey('C', 'not-a-mode')).toBeNull();
  });
});

describe('keySignatureDescription', () => {
  it('names sharps and flats together when both appear', () => {
    expect(keySignatureDescription(['C', 'D♭', 'E', 'F♯'])).toBe(
      'has 1 sharp and 1 flat',
    );
  });
});

describe('modeFromKeyName', () => {
  it('reads the mode a key name gives', () => {
    expect(modeFromKeyName('C Major (Ionian)')).toBe('ionian');
    expect(modeFromKeyName('D Minor (Dorian)')).toBe('dorian');
    expect(modeFromKeyName('G major')).toBe('ionian');
    expect(modeFromKeyName('E minor')).toBe('aeolian');
    expect(modeFromKeyName('F#')).toBeNull();
  });
});
