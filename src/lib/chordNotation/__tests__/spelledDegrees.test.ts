import { describe, expect, it } from 'vitest';
import { formatChord, formatChordLabel } from '..';

const C = { keyRootPc: 0, mode: 'ionian' };

describe('degrees from spelled roots', () => {
  it('reads the degree from the letters, not the pitch', () => {
    // B in F Lydian is the ♯4, not a ♭5.
    expect(
      formatChord({ root: 'B', quality: 'diminished' }, 'roman', {
        keyRootPc: 5,
        mode: 'lydian',
      }),
    ).toBe('♯iv°');
    // C♭ in A♭ Dorian is the ♭3.
    expect(
      formatChord({ root: 'Cb', quality: 'major' }, 'roman', {
        keyRootPc: 8,
        mode: 'dorian',
      }),
    ).toBe('♭III');
    expect(formatChordLabel('F# dim7', 'roman', C)).toBe('♯iv°7');
    expect(formatChordLabel('Gb maj', 'roman', C)).toBe('♭V');
  });

  it('reads a spelled slash bass the same way', () => {
    expect(formatChordLabel('D maj/F#', 'roman', C)).toBe('II/♯4');
    expect(formatChordLabel('D maj/Gb', 'roman', C)).toBe('II/♭5');
  });

  it('still works from a pitch class alone', () => {
    expect(formatChord({ root: 10, quality: 'major' }, 'roman', C)).toBe(
      '♭VII',
    );
  });
});

describe('labels a notation can’t write', () => {
  it('come back exactly as given', () => {
    // Roman needs a key; jazz can't write an unknown quality.
    expect(formatChordLabel('Dm7', 'roman')).toBe('Dm7');
    expect(formatChordLabel('Afunk9', 'jazz', C)).toBe('Afunk9');
    expect(formatChordLabel('4 maj7', 'jazz')).toBe('4 maj7');
  });

  it('are still written when the notation can write them', () => {
    expect(formatChordLabel('Dm7', 'jazz')).toBe('D−7');
    expect(formatChordLabel('4 maj7', 'roman')).toBe('IVΔ7');
  });
});
