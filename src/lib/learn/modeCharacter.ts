import { canonicalModeKey } from '@/lib/modeStepsFallback';

/**
 * One line on what a mode sounds like, in the voice of World Harmony's scale
 * cards ("Solemn dawn raga; flat 2nd & flat 6th"): the feel, then the notes
 * that make it. Keyed by ALL_MODES key; look lines up with modeCharacter(),
 * which accepts a lesson slug. The notes named in each line are the mode's
 * own degrees against the major scale (see modeDegreeFormula).
 */
export const MODE_CHARACTER: Readonly<Record<string, string>> = {
  // Diatonic
  ionian: 'The major scale: bright, settled, home',
  dorian: 'Minor with a bright raised 6th',
  phrygian: 'Dark, with a flat 2nd (Spanish colour)',
  lydian: 'Major with a dreamy raised 4th',
  mixolydian: 'Major with a bluesy flat 7th',
  aeolian: 'The natural minor scale',
  locrian: 'Unstable and tense; flat 2nd and flat 5th',

  // Harmonic minor family
  harmonicMinor: 'Minor with a raised 7th; dark, dramatic, one exotic leap',
  locrianNat6: 'Locrian with a natural 6th; tense, with a glint of light',
  ionianSharp5: 'Major with a raised 5th; bright but restless',
  dorianSharp4: 'Minor with a raised 4th; Romanian and klezmer colour',
  phrygianDominant:
    'Phrygian with a major 3rd; flamenco and Middle Eastern fire',
  lydianSharp2: 'Lydian with a raised 2nd; bright and exotic',
  alteredDiminished: 'Diminished and dark; flat 4th and double-flat 7th',

  // Melodic minor family
  melodicMinor: 'Minor with a major 6th and 7th; the smooth jazz minor',
  dorianFlat2: 'Dorian with a flat 2nd; dark, then lifting',
  lydianAugmented: 'Lydian with a raised 5th; floating, dreamlike',
  lydianDominant:
    'Major with a raised 4th and flat 7th; a bright, open dominant',
  mixolydianFlat6: 'Major that turns minor at the top; bittersweet',
  locrianNat2: 'Locrian with a natural 2nd; the half-diminished sound',
  altered: 'Every tension a dominant can carry; flat 2nd, flat 5th, flat 6th',

  // Harmonic major family
  harmonicMajor: 'Major with a flat 6th; bright with a shadow',
  dorianFlat5: 'Dorian with a flat 5th; smoky and unstable',
  alteredDominantNat5: 'Phrygian with a flat 4th; dark, held up by a pure 5th',
  melodicMinorSharp4: 'Melodic minor with a raised 4th; sleek and strange',
  mixolydianFlat2: 'Mixolydian with a flat 2nd; a dominant with bite',
  lydianAugmentedSharp2: 'Lydian augmented with a raised 2nd; bright and rare',
  locrianDoubleFlat7: 'Locrian with a double-flat 7th; diminished and brooding',

  // Double harmonic family
  doubleHarmonicMajor: 'Two exotic leaps; Byzantine and Arabic colour',
  lydianSharp2Sharp6:
    'Lydian with a raised 2nd and 6th; glittering and strange',
  ultraphrygian: 'Phrygian pushed darker; flat 4th and double-flat 7th',
  doubleHarmonicMinor: 'Hungarian minor; two dramatic augmented steps',
  oriental: 'A dominant with a flat 2nd and flat 5th; eastern colour',
  ionianSharp2Sharp5: 'Major with a raised 2nd and 5th; bright and exotic',
  locrianDoubleFlat3DoubleFlat7:
    'The darkest here; flat 2nd, double-flat 3rd and 7th',
};

/** A mode's character line, from a lesson slug or ALL_MODES key. */
export function modeCharacter(slug: string): string | undefined {
  const key = canonicalModeKey(slug);
  return key ? MODE_CHARACTER[key] : undefined;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL: Record<number, string> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
};

/**
 * A seven-note mode written as degrees against the major scale, e.g. Dorian
 * → "1 2 ♭3 4 5 6 ♭7". `steps` are semitones above the tonic (an octave step
 * is ignored). Null when the scale isn't seven notes.
 */
export function modeDegreeFormula(steps: readonly number[]): string | null {
  const degrees = [...new Set(steps.map((s) => ((s % 12) + 12) % 12))].sort(
    (a, b) => a - b,
  );
  if (degrees.length !== 7) return null;
  const parts = degrees.map((semitone, i) => {
    const mark = ACCIDENTAL[semitone - MAJOR[i]];
    return mark === undefined ? null : `${mark}${i + 1}`;
  });
  return parts.every((p) => p !== null) ? parts.join(' ') : null;
}
