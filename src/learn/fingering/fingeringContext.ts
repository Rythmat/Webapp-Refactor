import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { stepKeyRoot } from '@/curriculum/utils/flowKey';
import type { FingeringContext } from '@/lib/learn/pianoFingering';
import type { ChordClef, NotationStaves } from '@/lib/notation';

/**
 * A step that gives both hands a role is a two-hand part: its roll splits
 * into LH and RH lanes and its staff is a grand staff.
 */
export function isTwoHandStep(step: Pick<ActivityStepV2, 'instrument_config'>) {
  const c = step.instrument_config;
  return (
    !!c &&
    c.hand_config !== 'open' &&
    c.lh_role !== 'open' &&
    c.rh_role !== 'open'
  );
}

/**
 * The staff a genre step is written on: a two-hand step on the grand staff;
 * a melody on treble; a bass line on bass; chords on the clef the student
 * picked. Undefined leaves it to the notation's own split.
 */
export function stepStaves(
  section: string,
  twoHands: boolean,
  chordClef: ChordClef,
): NotationStaves | undefined {
  if (twoHands) return 'grand';
  if (section === 'A') return 'treble';
  if (section === 'C') return 'bass';
  if (section === 'B') return chordClef;
  return undefined;
}

/**
 * The theory lessons on the genre lesson screen: the right hand's
 * root-position triads fingered 1-3-5, as Learn's theory lessons play them.
 * Every genre lesson plays them 1-2-4.
 */
const THEORY_FLOWS = new Set(['applied-theory-fundamentals']);

/**
 * What fingering a genre step needs to know. The hand follows the staff the
 * student reads: treble is the right hand, bass the left (so flipping the
 * chord clef moves the chords between hands), and a grand staff splits by
 * the notes' hands, or where the staff splits them.
 */
export function genreFingeringContext(
  flow: ActivityFlowV2,
  step: ActivityStepV2,
  staves: NotationStaves | undefined,
): FingeringContext {
  const tonicPc = stepKeyRoot(flow, step) % 12;
  const intervals =
    step.scaleIntervals ??
    (step.scaleId ? SCALES[step.scaleId] : undefined) ??
    flow.params.defaultScale;
  return {
    tonicPc,
    rootTriad: THEORY_FLOWS.has(flow.genre) ? '135' : '124',
    ...(intervals?.length
      ? { scalePcs: intervals.map((i) => (tonicPc + i) % 12) }
      : {}),
    ...(staves === 'treble'
      ? { defaultHand: 'rh' as const }
      : staves === 'bass'
        ? { defaultHand: 'lh' as const }
        : {}),
  };
}
