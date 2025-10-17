// Email field melody - Lower melody
export const EmailMelody = [
  48, // C3
  52, // E3
  55, // G3
  48, // C3
  50, // D3
  53, // F3
  55, // G3
  60, // C4
  48, // C3
  43, // G2
];

// Password field melody - "Also sprach Zarathustra" theme
export const PasswordMelody = [
  60, // C4 - First note
  67, // G4 - Second note
  72, // C5 - Third note (octave higher)
  60, // C4
  64, // E4
  67, // G4
  72, // C5
  76, // E5
  79, // G5
  84, // C6 - Climactic high C
];

// Confirm Password melody - Complementary to Password melody
export const ConfirmPasswordMelody = [
  72, // C5
  69, // A4
  67, // G4
  64, // E4
  60, // C4
  67, // G4
  72, // C5
  76, // E5
  72, // C5
  67, // G4
];

// Success progression: I-IV-V-I in C major
export const SuccessProgression = [
  [60, 64, 67], // C major (C4, E4, G4)
  [65, 69, 72], // F major (F4, A4, C5)
  [67, 71, 74], // G major (G4, B4, D5)
  [72, 76, 79], // C major (C5, E5, G5)
  // [55, 50, 48, 44, 41, 36, 29],
  // [53],
  // [52],
  // [50],
  // [52, 48, 43, 23]
];

// Failure progression: Dramatic diminished progression with chromatic descent
export const FailureProgression = [
  [72, 75, 78, 81], // Dim7 (C5, Eb5, Gb5, A5)
  [71, 74, 77, 80], // Dim7 (B4, D5, F5, Ab5)
  [70, 73, 76, 79], // Dim7 (Bb4, Db5, E5, G5)
  [69, 72, 75, 78], // Dim7 (A4, C5, Eb5, Gb5)
  // [74, 67],
  // [66, 73],
  // [63, 70],
  // [62, 69],
];

// Autofill progression: ii-V-I in F major (Jazz progression)
export const AutofillProgression = [
  [67, 70, 74, 77], // Gm7 (G4, Bb4, D5, F5)
  [72, 75, 79, 82], // C7 (C5, E5, G5, Bb5)
  [65, 69, 72, 76], // FMaj7 (F4, A4, C5, E5)
  // [65, 63, 58, 53, 49, 42],
  // [63, 56, 53, 56, 41],
  // [62, 60, 55, 50, 46, 39],
];
