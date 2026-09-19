import { describe, expect, it } from 'vitest';
import {
  formatChord,
  formatChordLabel,
  formatProgression,
  formatSecondaryLabel,
  normalizeQuality,
  parseChord,
  type ChordNotation,
} from '..';

const C = { keyRootPc: 0, mode: 'ionian' };
const all = (label: string, context = C) => {
  const spec = parseChord(label)!;
  return (['hybrid', 'jazz', 'roman'] as ChordNotation[]).map((n) =>
    formatChord(spec, n, context),
  );
};

describe('normalizeQuality', () => {
  it.each([
    ['minor7', 'minor7'],
    ['min7(♭5)', 'minor7b5'],
    ['m7b5', 'minor7b5'],
    ['ø7', 'minor7b5'],
    ['M7', 'major7'],
    ['m7', 'minor7'],
    ['Δ7', 'major7'],
    ['7', 'dominant7'],
    ['dom9', 'dominant9'],
    ['Minor', 'minor'],
    ['', 'major'],
    ['dim(maj7)', 'diminishedmajor7'],
    ['maj6/9', 'major6add9'],
    ['min(maj7)', 'minormajor7'],
    ['sus4', 'sus4'],
  ])('%s → %s', (raw, key) => {
    expect(normalizeQuality(raw)).toBe(key);
  });
});

describe('formatChord in C major: hybrid, jazz, roman', () => {
  it.each([
    ['2 minor7', ['2 min7', 'D−7', 'ii7']],
    ['5 dominant7', ['5 dom7', 'G7', 'V7']],
    ['1 major7', ['1 maj7', 'CΔ7', 'IΔ7']],
    ['6 minor', ['6 min', 'A−', 'vi']],
    ['4 major', ['4 maj', 'F', 'IV']],
    ['7 minor7b5', ['7 min7(♭5)', 'Bø7', 'viiø7']],
    ['7 diminished', ['7 dim', 'B°', 'vii°']],
    ['b7 major', ['♭7 maj', 'B♭', '♭VII']],
    ['#4 diminished7', ['#4 dim7', 'F♯°7', '♯iv°7']],
    ['5 dominant7b9', ['5 dom7(♭9)', 'G7♭9', 'V7♭9']],
    ['3 augmented', ['3 aug', 'E+', 'III+']],
    ['1 minormajor7', ['1 min(maj7)', 'C−Δ7', 'iΔ7']],
    ['2 minor9', ['2 min9', 'D−9', 'ii9']],
    ['5 dominant13', ['5 dom13', 'G13', 'V13']],
  ])('%s', (label, expected) => {
    expect(all(label)).toEqual(expected);
  });

  it('names the root by letter in hybrid when asked', () => {
    expect(
      formatChord(parseChord('2 minor7')!, 'hybrid', C, {
        hybridRoot: 'letter',
      }),
    ).toBe('D min7');
  });

  it('writes an engine slash quality with its bass', () => {
    expect(all('1 major/5')).toEqual(['1 maj/5', 'C/G', 'I/5']);
  });
});

describe('letter-named chords', () => {
  it('writes jazz without a key; Roman needs a key, so it stays hybrid', () => {
    const spec = parseChord('Dm7')!;
    expect(formatChord(spec, 'jazz')).toBe('D−7');
    expect(formatChord(spec, 'roman')).toBe('D min7');
  });

  it('reads curriculum and game spellings', () => {
    expect(formatChord(parseChord('Ebmaj7')!, 'jazz')).toBe('E♭Δ7');
    expect(formatChord(parseChord('Ddom9')!, 'jazz')).toBe('D9');
    expect(formatChord(parseChord('C# Minor')!, 'jazz')).toBe('C♯−');
    expect(formatChord(parseChord('F#dim7')!, 'jazz')).toBe('F♯°7');
  });

  it('keeps a slash bass: letter in jazz, degree in Roman', () => {
    const F = { keyRootPc: 5, mode: 'ionian' };
    const spec = parseChord('Bb/D')!;
    expect(formatChord(spec, 'jazz', F)).toBe('B♭/D');
    expect(formatChord(spec, 'roman', F)).toBe('IV/6');
    expect(formatChord(spec, 'hybrid', F)).toBe('4 maj/6');
    expect(formatChord(spec, 'hybrid', F, { hybridRoot: 'letter' })).toBe(
      'B♭ maj/D',
    );
  });

  it('reads a hybrid letter label with a spelled quality', () => {
    expect(formatChordLabel('D min7(♭5)', 'jazz', C)).toBe('Dø7');
    expect(formatChordLabel('D min7', 'roman', C)).toBe('ii7');
    expect(formatChordLabel('B♭ maj', 'roman', C)).toBe('♭VII');
  });
});

describe('modes', () => {
  it('numbers from the mode tonic in A aeolian', () => {
    const A = { keyRootPc: 9, mode: 'aeolian' };
    expect(formatChordLabel('A min7', 'roman', A)).toBe('i7');
    expect(formatChordLabel('A min7', 'jazz', A)).toBe('A−7');
    expect(formatChordLabel('E min', 'roman', A)).toBe('v');
  });
});

describe('labels and progressions', () => {
  it('leaves labels untouched in hybrid', () => {
    expect(formatChordLabel('Dm7', 'hybrid', C)).toBe('Dm7');
    expect(formatProgression('1 maj - 4 maj', 'hybrid', C)).toBe(
      '1 maj - 4 maj',
    );
  });

  it('leaves text that isn’t a chord alone', () => {
    expect(formatChordLabel('quartal voicing', 'jazz', C)).toBe(
      'quartal voicing',
    );
  });

  it('rewrites each chord of a progression, keeping separators', () => {
    expect(
      formatProgression('1 major7 - 1 dominant7#5 - b2 major7', 'roman', C),
    ).toBe('IΔ7 - I7♯5 - ♭IIΔ7');
    expect(formatProgression('2 min7 → 5 dom7 → 1 maj7', 'jazz', C)).toBe(
      'D−7 → G7 → CΔ7',
    );
  });
});

describe('formatSecondaryLabel', () => {
  it.each([
    ['5 of 2', 'roman', 'V/ii'],
    ['7 of 6', 'roman', 'vii°/vi'],
    ['5 of 7', 'roman', 'V/vii°'],
    ['5 of 2', 'jazz', '5 of D−'],
    ['5 of 5', 'jazz', '5 of G'],
    ['5 of 2', 'hybrid', '5 of 2'],
  ] as const)('%s in %s → %s', (label, notation, expected) => {
    expect(formatSecondaryLabel(label, notation, C)).toBe(expected);
  });

  it('needs a key for jazz', () => {
    expect(formatSecondaryLabel('5 of 2', 'jazz')).toBe('5 of 2');
  });
});
