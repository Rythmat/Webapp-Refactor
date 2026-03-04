import { CHORD_COLORS, COLOR_TO_MODE } from '../data/keyColors';
import { MODES } from '../data/modes';
import { MELODY_CONTOURS } from '../data/melodyContours';

/**
 * Given a degree-qualified chord name, a number of rhythm hits, and a root
 * MIDI note, generates a random melodic line by stitching contour fragments
 * together until the desired number of notes is reached.
 *
 * Steps:
 * 1. Look up chord in CHORD_COLORS to get colorRef (default 13)
 * 2. Look up colorRef in COLOR_TO_MODE to get modeName (default 'ionian')
 * 3. Look up modeName in MODES to get mode intervals
 * 4. Collect all contours from MELODY_CONTOURS whose key contains "Scalar"
 * 5. Loop: pick a random contour, map each note through the mode scale,
 *    handling octave wrapping for steps > 6 or < 0
 * 6. Return melody array trimmed to rhythmHits length
 */
export function getChordMelody(
  chord: string,
  rhythmHits: number,
  root: number,
): number[] {
  const colorRef = CHORD_COLORS[chord] ?? 0;
  const modeName = COLOR_TO_MODE[colorRef] ?? 'ionian';
  const mode = MODES[modeName as keyof typeof MODES];

  // Collect all scalar contours
  const contours: number[][] = [];
  for (const [key, groups] of Object.entries(MELODY_CONTOURS)) {
    if (key.includes('Scalar')) {
      contours.push(...groups);
    }
  }

  const melody: number[] = [];
  while (melody.length < rhythmHits) {
    const contour = contours[Math.floor(Math.random() * contours.length)];
    for (const note of contour) {
      if (melody.length >= rhythmHits) {
        break;
      }
      let res = root;
      let step = note > 0 ? note - 1 : note;
      while (step > 6) {
        step -= 7;
        res += 12;
      }
      while (step < 0) {
        step += 7;
        res -= 12;
      }
      melody.push(mode[step] + res);
    }
  }

  return melody;
}
