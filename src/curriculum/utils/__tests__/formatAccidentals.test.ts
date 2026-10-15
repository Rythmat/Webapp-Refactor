import { describe, expect, it } from 'vitest';
import { formatAccidentalsForDisplay } from '../formatAccidentals';

describe('formatAccidentalsForDisplay', () => {
  it('turns single accidentals into ♭ and ♯', () => {
    expect(formatAccidentalsForDisplay('Bbmaj7')).toBe('B♭maj7');
    expect(formatAccidentalsForDisplay('F#m')).toBe('F♯m');
  });

  it('turns double accidentals into 𝄫 and 𝄪', () => {
    expect(formatAccidentalsForDisplay('Ebbm')).toBe('E𝄫m');
    expect(formatAccidentalsForDisplay('F##')).toBe('F𝄪');
    expect(formatAccidentalsForDisplay('Bbb minor 7(b5)')).toBe(
      'B𝄫 minor 7(b5)',
    );
  });
});
