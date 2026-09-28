/**
 * practiceKeyboard.ts — Which keys the Practice Track draws, and where the
 * scale is lit on them.
 *
 * Three octaves, always. `PianoKeyboard` in `gaming` mode asks 238px an octave
 * and doesn't cap how many it draws, so a fourth would push the keyboard past
 * the page on a laptop and well past it on a phone — and the keys are the one
 * thing a player always has to be able to see. Three is what the Theory
 * Practice Track shows; what changes here is *which* three, because a bass line
 * and a right-hand melody live two octaves apart.
 */

/** PianoKeyboard counts its octaves from MIDI 0, so C3 sits in octave 4. */
const OCTAVE_SPAN = 3;
const WINDOW_SEMITONES = OCTAVE_SPAN * 12;
/** C1 at the bottom, so a bass line fits; C6 at the top for a high melody. */
const LOWEST_START_C = 2;
const HIGHEST_START_C = 6;

export interface KeyboardWindow {
  startC: number;
  endC: number;
}

/**
 * C3, the foot of the window every Theory Practice Track shows and where a
 * right hand sits without being asked to move.
 */
const HOME_START_C = 4;

/**
 * The three octaves that best hold a part written between `low` and `high`.
 *
 * A window has to start on a C, and three C-aligned octaves is a coarse ruler:
 * a part from G2 to E5 is only 33 semitones wide, yet no C-aligned window of 36
 * holds it — C2 stops five short at the top, C3 starts five short at the bottom.
 * So the choice is made in two steps. Where some window holds the whole part,
 * take the best of them. Where none does, start at the part's own floor and let
 * the top spill.
 *
 * Anchoring low is the right way to lose notes, because the parts too wide to
 * fit are the two-hand ones and the left hand is what the rest is built on.
 *
 * `preferLow` decides between windows that all hold the part, and it is the
 * question of which way the student is going to roam. A Practice Track invites
 * playing that isn't written down, so the written notes are the middle of it,
 * not the edges: a bass line wants the room underneath it and takes the lowest
 * window that fits, while a melody or a comping part wants the room above and
 * sits as near the home position as it can. Without that, a narrow part drags
 * the keyboard to wherever it happens to be centred — Funk L1's melody, written
 * D3 to D4, would be improvised on a keyboard starting at C2.
 */
export function keyboardWindow(
  low: number,
  high: number,
  { preferLow = false }: { preferLow?: boolean } = {},
): KeyboardWindow {
  const window = (startC: number): KeyboardWindow => ({
    startC,
    endC: startC + OCTAVE_SPAN - 1,
  });

  const holds: number[] = [];
  for (let c = LOWEST_START_C; c <= HIGHEST_START_C; c++) {
    if (c * 12 <= low && c * 12 + WINDOW_SEMITONES - 1 >= high) holds.push(c);
  }
  if (holds.length > 0) {
    return window(
      preferLow
        ? holds[0]
        : holds.reduce((best, c) =>
            Math.abs(c - HOME_START_C) < Math.abs(best - HOME_START_C)
              ? c
              : best,
          ),
    );
  }

  return window(
    Math.min(HIGHEST_START_C, Math.max(LOWEST_START_C, Math.floor(low / 12))),
  );
}

/**
 * The MIDI note the lit scale's tonic sounds at: the tonic in whichever octave
 * of the window leaves the whole scale most centrally placed, so the names sit
 * over the middle of the keyboard rather than running off its end.
 */
export function scaleTonicIn(
  window: KeyboardWindow,
  keyRootPc: number,
  scaleSpan = 12,
): number {
  const low = window.startC * 12;
  const high = window.endC * 12 + 11;
  const pc = ((keyRootPc % 12) + 12) % 12;
  const ideal = (low + high) / 2 - scaleSpan / 2;

  let best = low + ((((pc - low) % 12) + 12) % 12);
  for (let candidate = best; candidate + scaleSpan <= high; candidate += 12) {
    if (Math.abs(candidate - ideal) < Math.abs(best - ideal)) best = candidate;
  }
  return best;
}
