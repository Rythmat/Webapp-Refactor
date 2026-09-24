import { describe, expect, it } from 'vitest';
import { splitChordSymbol } from '../ChordSymbolText';

/**
 * Splitting a chord into letter / accidental / quality / bass is what lets
 * four bars fit across a phone, so it has to hold for every shape the library
 * actually writes — and leave alone anything that is not a chord.
 */
describe('splitChordSymbol', () => {
  it('takes a plain triad as a bare letter', () => {
    expect(splitChordSymbol('C')).toEqual({
      root: 'C',
      accidental: '',
      quality: '',
      bass: '',
    });
  });

  it('lifts the accidental off the letter', () => {
    expect(splitChordSymbol('B♭')).toMatchObject({
      root: 'B',
      accidental: '♭',
      quality: '',
    });
    expect(splitChordSymbol('F♯min7')).toMatchObject({
      root: 'F',
      accidental: '♯',
      quality: 'min7',
    });
  });

  it('drops the quality below the letter', () => {
    expect(splitChordSymbol('Amin7')).toMatchObject({
      root: 'A',
      quality: 'min7',
    });
    expect(splitChordSymbol('B♭7sus4')).toMatchObject({
      root: 'B',
      accidental: '♭',
      quality: '7sus4',
    });
    expect(splitChordSymbol('Cmin7b5')).toMatchObject({ quality: 'min7b5' });
  });

  it('separates the bass of a slash chord', () => {
    expect(splitChordSymbol('E♭/G')).toMatchObject({
      root: 'E',
      accidental: '♭',
      quality: '',
      bass: 'G',
    });
    expect(splitChordSymbol('Amin7/C♯')).toMatchObject({
      root: 'A',
      quality: 'min7',
      bass: 'C♯',
    });
  });

  it('leaves alone anything that is not a chord letter', () => {
    // N.C. starts with no note letter; a hybrid degree starts with a number.
    expect(splitChordSymbol('N.C.')).toMatchObject({
      root: 'N.C.',
      quality: '',
    });
    expect(splitChordSymbol('♭7 maj')).toMatchObject({ root: '♭7 maj' });
    expect(splitChordSymbol('5 dom7')).toMatchObject({ root: '5 dom7' });
  });

  it('reads the ASCII spellings some charts still carry', () => {
    expect(splitChordSymbol('Bbmin7')).toMatchObject({
      root: 'B',
      accidental: 'b',
      quality: 'min7',
    });
  });
});
