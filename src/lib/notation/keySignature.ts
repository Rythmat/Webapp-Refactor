// ── Key signatures ─────────────────────────────────────────────────────────
// A key signature is a count of fifths: +n sharps or −n flats. Modes take the
// signature of their parent major (D dorian → no sharps or flats), the way
// modal music is written.

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Letter indices (C D E F G A B = 0…6) in the order sharps are added. */
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
/** Fifths of each natural letter's major key. */
const LETTER_MAJOR_FIFTHS = [0, 2, 4, -1, 1, 3, 5];

/** Fifths added to a tonic's major signature to get the mode's signature. */
const MODE_FIFTHS_SHIFT: Record<string, number> = {
  ionian: 0,
  major: 0,
  dorian: -2,
  phrygian: -4,
  lydian: 1,
  mixolydian: -1,
  aeolian: -3,
  minor: -3,
  locrian: -5,
  melodicMinor: -3,
  harmonicMinor: -3,
  harmonicMajor: 0,
  doubleHarmonicMajor: 0,
};

/** Alteration (−1 / 0 / +1) the signature gives each letter, indexed C…B. */
export function keySignatureAlterations(fifths: number): number[] {
  const alterations = [0, 0, 0, 0, 0, 0, 0];
  const count = Math.min(7, Math.abs(fifths));
  for (let i = 0; i < count; i++) {
    if (fifths > 0) alterations[SHARP_ORDER[i]] = 1;
    else alterations[SHARP_ORDER[6 - i]] = -1;
  }
  return alterations;
}

/**
 * Signature for a spelled tonic (letter index + alteration) in a mode.
 * Unknown modes read as major. Keys past 7 accidentals (G♯ major) wrap to
 * their enharmonic signature.
 */
export function keyFifthsForTonic(
  letterIndex: number,
  alteration: number,
  mode = 'ionian',
): number {
  let fifths =
    LETTER_MAJOR_FIFTHS[letterIndex] +
    7 * alteration +
    (MODE_FIFTHS_SHIFT[mode] ?? 0);
  while (fifths > 7) fifths -= 12;
  while (fifths < -7) fifths += 12;
  return fifths;
}

/**
 * The signature that needs the fewest accidentals for these spelled notes.
 * Ties go to the key whose major or relative minor tonic is `tonicPc`, then
 * to the signature with fewer sharps or flats.
 */
export function inferKeyFifths(
  notes: ReadonlyArray<{ letterIndex: number; alteration: number }>,
  tonicPc?: number,
): number {
  let best = 0;
  let bestScore = Infinity;
  for (let fifths = -7; fifths <= 7; fifths++) {
    const signature = keySignatureAlterations(fifths);
    let accidentals = 0;
    for (const note of notes) {
      if (signature[note.letterIndex] !== note.alteration) accidentals++;
    }
    const majorTonic = mod12(7 * fifths);
    const matchesTonic =
      tonicPc !== undefined &&
      (majorTonic === mod12(tonicPc) ||
        mod12(majorTonic + 9) === mod12(tonicPc));
    // Accidentals dominate; the tonic hint and signature size only break ties.
    const score =
      accidentals * 100 + (matchesTonic ? 0 : 10) + Math.abs(fifths);
    if (score < bestScore) {
      bestScore = score;
      best = fifths;
    }
  }
  return best;
}
