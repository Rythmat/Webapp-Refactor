import { MODES, MODE_NAMES } from '../data/modes';

/**
 * Given the starting mode, starting chord, and next chord, returns the
 * relative mode of the next chord.
 *
 * Steps:
 * 1. Get the mode intervals for startMode
 * 2. Find the interval (endChord[0] - startChord[0]) in that mode -> modeStep
 * 3. If not found, return 'ionian' as fallback
 * 4. Add the index of startMode in MODE_NAMES to modeStep
 * 5. Return MODE_NAMES[modeStep % 7]
 */
export function modeChange(
  startMode: string,
  startChord: number[],
  endChord: number[],
): string {
  const mode = MODES[startMode as keyof typeof MODES];
  if (!mode) {
    return 'ionian';
  }

  const end = endChord[0] - startChord[0];
  let modeStep = -1;

  for (let i = 0; i < mode.length; i++) {
    if (mode[i] === end) {
      modeStep = i;
      break;
    }
  }

  if (modeStep === -1) {
    return 'ionian';
  }

  for (let i = 0; i < MODE_NAMES.length; i++) {
    if (MODE_NAMES[i] === startMode) {
      modeStep += i;
      break;
    }
  }

  return MODE_NAMES[modeStep % MODE_NAMES.length];
}
