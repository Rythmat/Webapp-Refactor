/**
 * Piano fingering as method books write it: 1 is the thumb on either hand,
 * 5 the little finger.
 */
export type PianoFinger = 1 | 2 | 3 | 4 | 5;

export type Hand = 'lh' | 'rh';

/** A finger number a note can carry; anything else is dropped. */
export const isPianoFinger = (n: unknown): n is PianoFinger =>
  n === 1 || n === 2 || n === 3 || n === 4 || n === 5;

/** A note to finger: lesson ticks at PPQ 480, plus what was authored. */
export interface FingeringInputNote {
  midi: number;
  onset: number;
  duration: number;
  hand?: Hand;
  finger?: PianoFinger;
}

export interface FingeringContext {
  /** The key's tonic as a pitch class. With `scalePcs`, picks a scale table. */
  tonicPc?: number;
  /** The step's scale as pitch classes. */
  scalePcs?: readonly number[];
  /** The hand a note plays when nothing else says (melody steps: 'rh'). */
  defaultHand?: Hand;
  /**
   * How the right hand fingers a root-position triad, from the bottom up:
   * thumb, middle, little finger ('135'), which smaller hands need, or
   * thumb, index, ring ('124'), the better rule for most hands. Theory
   * lessons play '135', genre lessons '124'; the left hand plays every
   * triad 5-3-1 (Peter, 2026-10-18). Default '135'.
   */
  rootTriad?: RootTriad;
}

export type RootTriad = '135' | '124';

export interface NoteFingering {
  hand: Hand;
  /** Null when the hand can't play the note's chord (more than five notes). */
  finger: PianoFinger | null;
  source: 'authored' | 'suggested';
}

/** A fingered note, for the keyboard's hands and the staff's numbers. */
export interface FingeredNote {
  /** The note's index in the input. */
  index: number;
  midi: number;
  onset: number;
  duration: number;
  hand: Hand;
  finger: PianoFinger;
  source: 'authored' | 'suggested';
}

export interface FingeringTimeline {
  /** Index-aligned with the input; null where no finger could be given. */
  notes: (FingeredNote | null)[];
  /** Each hand's notes, by onset then pitch. */
  byHand: Record<Hand, FingeredNote[]>;
}
