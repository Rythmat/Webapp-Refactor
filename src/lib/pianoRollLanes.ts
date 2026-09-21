/**
 * Piano-roll lane shading shared by every piano roll — Learn's GenrePianoRoll
 * and Studio's PianoRoll — so white- and black-key rows read the same across
 * the app: flat rows, white keys lighter, black keys darker, in every bar.
 */

const BLACK_KEY_SEMITONES = new Set([1, 3, 6, 8, 10]); // Db Eb Gb Ab Bb

export const PIANO_ROLL_LANE_COLORS = {
  whiteKey: '#2a2a2a',
  blackKey: '#1a1a1a',
  separator: 'rgba(120,120,120,0.15)',
  label: '#d4d4d8',
  subLine: 'rgba(200,200,200,0.08)',
  beatLine: 'rgba(200,200,200,0.16)',
  barLine: 'rgba(255,255,255,0.22)',
  firstBarLine: 'rgba(200,200,255,0.45)',
} as const;

export const isBlackKeyPitch = (midi: number): boolean =>
  BLACK_KEY_SEMITONES.has(((midi % 12) + 12) % 12);

/** Lane label font size for a row height, as Learn sizes it (8–13px). */
export const pianoRollLabelFontSize = (rowHeight: number): number =>
  Math.max(8, Math.min(13, rowHeight * 0.65));

/** Row background for a MIDI pitch. The key center is tinted when a key is given. */
export function pianoRollLaneBackground(
  midiNote: number | null,
  keyRoot?: number,
  keyColor?: string,
): string {
  if (midiNote === null) return 'rgba(255,255,255,0.03)';
  const isKeyCenter = keyRoot !== undefined && midiNote % 12 === keyRoot % 12;
  if (isKeyCenter && keyColor) return `${keyColor}0d`; // ~5% opacity tint
  if (isKeyCenter) return '#1f2d1f'; // fallback green if no keyColor
  return isBlackKeyPitch(midiNote)
    ? PIANO_ROLL_LANE_COLORS.blackKey
    : PIANO_ROLL_LANE_COLORS.whiteKey;
}
