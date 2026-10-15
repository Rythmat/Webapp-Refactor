/**
 * practiceScales.ts — Every scale one genre level teaches.
 *
 * A Practice Track lights a scale on the keyboard, and the student can switch
 * between the scales their level actually covers: Funk L2's Melody section
 * teaches both A minor blues and A Dorian, so both belong on the switcher and
 * the student can see the ♭5 arrive and the 2 and 6 leave. Most levels teach
 * one scale, and the switcher renders as a plain label there.
 */

import { DEGREES } from '@prism/engine';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import {
  flowKeyLabel,
  flowMode,
  parseKeyRoot,
  scaleTitle,
  spellScaleNames,
  stepKeyLabel,
  stepMode,
} from '@/curriculum/utils/flowKey';
import {
  displayAccidentals,
  displayDegree,
} from '@/daw/utils/displayAccidentals';

export interface PracticeScale {
  /** The flow's own id for it, e.g. 'dorian', 'minor_blues'. */
  id: string;
  /** As a student reads it, without the tonic: 'Dorian', 'Minor Blues'. */
  title: string;
  /** Semitones from the tonic, ascending, one octave. */
  intervals: number[];
  /** Scale degrees, one per interval: ['1','2','♭3','4','5','6','♭7']. */
  degrees: string[];
  /** Note names in the flow's key: ['A','B','C','D','E','F♯','G']. */
  names: string[];
  /** The scale's tonic as a pitch class — its own step's key (stepKeyLabel). */
  tonicPc: number;
  /** As a student reads it: 'G', 'B♭'. */
  tonicLabel: string;
}

/** Distinct steps within one octave, ascending — the form two scales compare in. */
function normalize(intervals: readonly number[]): number[] {
  return [...new Set(intervals.map((i) => ((i % 12) + 12) % 12))].sort(
    (a, b) => a - b,
  );
}

/**
 * The fewest notes a scale can have. A pentatonic is the smallest thing anyone
 * names a scale, so a set of four or fewer is a chord.
 */
const FEWEST_SCALE_NOTES = 5;

/**
 * Whether a step's note set is a scale rather than a chord.
 *
 * `scaleIntervals` is the field a step uses for whatever notes it draws from,
 * and plenty of steps draw from a chord: Pop L1 has steps whose intervals are
 * [0,4,7] and [0,7], Pop L3 has [0,4,7,11] and [0,3,6], Funk L1 has
 * [0,3,5,7,10] beside a [0,3,7,10] that is a Dm7 arpeggio. Those are chord
 * tones, and a switcher offering "C E G" as a scale to improvise on is offering
 * the wrong thing — the notes of one chord, lit under a whole progression that
 * moves away from it.
 *
 * Showing chord tones properly would mean following the progression and lighting
 * each chord's own voicing as it comes round, which is a different feature and a
 * harder one: with upper extensions and several voicings per symbol, there is no
 * single right answer to light. So these are left out rather than half-served.
 */
function isScale(intervals: readonly number[]): boolean {
  return intervals.length >= FEWEST_SCALE_NOTES;
}

/**
 * The scales one flow teaches, in the order the switcher offers them: the
 * level's own default scale first — it is the level's home, whatever order the
 * steps happen to introduce things in — then every other scale its steps name,
 * by first appearance.
 *
 * A step's notes join the switcher only when they are a named scale and not a
 * chord (see `isScale`). The level's default is always offered, so a flow whose
 * steps are all arpeggios still has something lit to play over.
 *
 * Deduplicated by the notes, not the id: a step calling [0,2,3,5,7,9,10]
 * 'dorian' and the flow default calling the same notes 'minor' are one scale.
 */
export function flowPracticeScales(
  flow: ActivityFlowV2,
  /**
   * Lead with the scales these steps teach — a Practice Track playing one of
   * a level's styles (Latin L1's Mariachi) opens on that style's scale.
   */
  preferStyleRefs?: readonly string[],
): PracticeScale[] {
  const seen = new Set<string>();
  const scales: PracticeScale[] = [];

  // A scale is its notes on its tonic: a level in two keys (Latin L1, E minor
  // and G major) spells and lights each from its own (stepKeyLabel).
  const add = (
    id: string,
    intervals: readonly number[],
    rootLabel: string,
    mode: string,
  ) => {
    const steps = normalize(intervals);
    if (steps.length === 0) return;
    const tonicPc = parseKeyRoot(rootLabel) % 12;
    const signature = `${tonicPc}:${steps.join(',')}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    scales.push({
      id: scales.some((sc) => sc.id === id) ? `${id}_${rootLabel}` : id,
      title: scaleTitle(id),
      intervals: steps,
      degrees: steps.map((step) =>
        displayDegree(DEGREES[step] ?? String(step)),
      ),
      names: spellScaleNames(rootLabel, steps, mode),
      tonicPc,
      tonicLabel: displayAccidentals(rootLabel),
    });
  };
  const steps = flow.sections.flatMap((section) => section.steps);
  const addStep = (step: (typeof steps)[number]) => {
    if (step.scaleId && isScale(normalize(step.scaleIntervals ?? []))) {
      add(
        step.scaleId,
        step.scaleIntervals!,
        stepKeyLabel(flow, step),
        stepMode(flow, step),
      );
    }
  };

  if (preferStyleRefs?.length)
    steps
      .filter((step) => preferStyleRefs.includes(step.styleRef))
      .forEach(addStep);
  add(
    flow.params.defaultScaleId ?? 'scale',
    flow.params.defaultScale ?? [],
    flowKeyLabel(flow),
    flowMode(flow),
  );
  steps.forEach(addStep);
  return scales;
}
