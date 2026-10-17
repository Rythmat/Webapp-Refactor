import type { StaffId } from './types';

// ── How each staff is read ─────────────────────────────────────────────────
// A staff names its clef, and with it where a pitch sits on the lines. Two
// of them only the Studio's Score writes on: the alto (C) clef a viola reads,
// its middle line middle C, and the bass clef with a small 8 under it, which
// bass guitar and double bass read. Those sound an octave below where they
// are written, so a note is kept at the pitch it sounds (a NotationKey's
// `midi`, the track's note) and drawn an octave up (its `octave`): MIDI C2
// is written on the bass clef's C3. Learn's lessons write on treble, bass
// and drum staves only, where written and sounding are the same.

/** The clef VexFlow draws each staff with, and places its notes by. */
export const VEXFLOW_CLEF: Readonly<
  Record<StaffId, 'treble' | 'bass' | 'alto' | 'percussion'>
> = {
  treble: 'treble',
  bass: 'bass',
  alto: 'alto',
  bass8vb: 'bass',
  percussion: 'percussion',
};

/** The small 8 a staff's clef always carries: under it, an octave down. */
export const CLEF_ANNOTATION: Readonly<Partial<Record<StaffId, '8vb'>>> = {
  bass8vb: '8vb',
};

/** Octaves a staff's notes are written above the pitch they sound. */
const WRITTEN_OCTAVES: Readonly<Partial<Record<StaffId, number>>> = {
  bass8vb: 1,
};

/** Octaves a staff's notes are written above the pitch they sound: 1 or 0. */
export function writtenOctaves(staff: StaffId): number {
  return WRITTEN_OCTAVES[staff] ?? 0;
}

/**
 * Each pitched staff's top line as written, an absolute diatonic step
 * (octave × 7 + letter, C = 0): F5 in treble, G4 in alto, A3 in bass, and A3
 * on the bass clef with an 8 too, where it sounds A2. A drumset staff places
 * notes by instrument, so it has none.
 */
export const TOP_LINE_STEP: Readonly<Partial<Record<StaffId, number>>> = {
  treble: 5 * 7 + 3,
  alto: 4 * 7 + 4,
  bass: 3 * 7 + 5,
  bass8vb: 3 * 7 + 5,
};
