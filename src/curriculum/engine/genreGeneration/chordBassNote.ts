/**
 * chordBassNote.ts — Derive bass MIDI note from chord symbols.
 *
 * Rules:
 *   1. No chord symbols → bass plays keyRoot
 *   2. Standard chord (e.g. 'Dm7', 'G7', 'Bbmaj7') → bass plays chord root
 *   3. Slash chord (e.g. 'Bbmaj7/F', 'C/E') → bass plays the note after '/'
 *
 * The first letter(s) of the chord symbol are the root, except in slash chords
 * where the bass note is the value after the slash.
 *
 * CHROMATIC APPROACH RULE (bass):
 * Approach note = target - 1 semitone, placed BEFORE the target.
 * a-of-3 approach → beat1 next bar = goal. Always ascending into target.
 * NEVER descending away from root (goal→approach = illegal through all styles to L2).
 * Advanced Jazz L3 may introduce approach from above as explicit technique only.
 */

// ── Note name → pitch class (0-11) ─────────────────────────────────────────

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  'B#': 0,
};

/**
 * Parse a note name from the start of a string.
 * Handles: 'D', 'Bb', 'F#', 'Eb', 'C#', etc.
 * Returns the pitch class (0-11) or null if unrecognized.
 */
export function parseNoteName(s: string): number | null {
  if (!s || s.length === 0) return null;
  const letter = s[0].toUpperCase();
  if (letter < 'A' || letter > 'G') return null;

  // Check for accidental (second char)
  if (s.length >= 2) {
    const acc = s[1];
    if (acc === '#' || acc === 'b' || acc === '♯' || acc === '♭') {
      const withAcc = letter + (acc === '♯' ? '#' : acc === '♭' ? 'b' : acc);
      const pc = NOTE_TO_PC[withAcc];
      if (pc !== undefined) return pc;
    }
  }

  // Plain letter
  return NOTE_TO_PC[letter] ?? null;
}

/**
 * Extract the bass pitch class from a chord symbol.
 *
 * - 'Dm7'       → D → 2
 * - 'Bbmaj7'    → Bb → 10
 * - 'G7'        → G → 7
 * - 'Bbmaj7/F'  → slash chord, bass = F → 5
 * - 'C/E'       → slash chord, bass = E → 4
 * - 'F#m7'      → F# → 6
 */
export function chordSymbolToBassPC(symbol: string): number | null {
  if (!symbol || symbol.trim().length === 0) return null;
  const trimmed = symbol.trim();

  // Check for slash chord: everything after '/' is the bass note
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx !== -1 && slashIdx < trimmed.length - 1) {
    const bassStr = trimmed.slice(slashIdx + 1);
    return parseNoteName(bassStr);
  }

  // Standard chord: root is the first letter + optional accidental
  return parseNoteName(trimmed);
}

/**
 * Convert a pitch class (0-11) to a MIDI note in bass register (octave 2: 36-47).
 * Floor at A1 (MIDI 33) — low E string gets used constantly in funk.
 */
export function bassPC_toMidi(pc: number): number {
  let midi = 36 + (pc % 12); // octave 2 (C2 = 36)
  while (midi < 33) midi += 12; // 33 = A1
  while (midi > 47) midi -= 12;
  return midi;
}

/**
 * Given an array of chord symbols (one per bar) and a keyRoot MIDI note,
 * return an array of bass MIDI notes (one per bar, looped to fill BACKING_BARS).
 *
 * Rules:
 *   - If chordSymbols is empty/undefined → all bars use keyRoot
 *   - If a chord symbol is present → bass note from chord root (or slash bass)
 *   - If a chord symbol can't be parsed → falls back to keyRoot
 */
export function deriveBassNotes(
  chordSymbols: string[] | undefined,
  keyRoot: number,
  bars: number,
): number[] {
  const keyPC = keyRoot % 12;
  const defaultBass = bassPC_toMidi(keyPC);

  if (!chordSymbols || chordSymbols.length === 0) {
    return Array(bars).fill(defaultBass);
  }

  const bassNotes: number[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const symbol = chordSymbols[bar % chordSymbols.length];
    const pc = chordSymbolToBassPC(symbol);
    bassNotes.push(pc !== null ? bassPC_toMidi(pc) : defaultBass);
  }
  return bassNotes;
}
