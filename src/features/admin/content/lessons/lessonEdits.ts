/**
 * The edits the in-place lesson editor makes to a level: a step's notes from
 * the Parts editor, its fields, and adding, duplicating, deleting and moving
 * steps.
 *
 * A step's number is its identity. Student progress is keyed by section and
 * step number (useCurriculumProgress.ts), and band pairings' overrides name
 * steps by number, so nothing here renumbers: a new step takes the level's
 * highest number plus one, a moved step keeps its own, and a deleted one
 * leaves a gap. Tags stay unique, as each step's progress key elsewhere.
 */

import {
  partFromLessonStep,
  writePartToStep,
} from '@/curriculum/engine/parts/convert';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { stepKeyRoot } from '@/curriculum/utils/flowKey';

/** Where a step sits: its section and its place in that section. */
export interface StepPlace {
  section: ActivitySectionId;
  index: number;
}

export const stepAt = (
  flow: ActivityFlowV2,
  place: StepPlace,
): ActivityStepV2 | undefined =>
  flow.sections.find((s) => s.id === place.section)?.steps[place.index] as
    | ActivityStepV2
    | undefined;

/** The section's steps, changed by `edit`; the rest of the level as it was. */
function editSteps(
  flow: ActivityFlowV2,
  section: ActivitySectionId,
  edit: (steps: ActivityStepV2[]) => ActivityStepV2[],
): ActivityFlowV2 {
  return {
    ...flow,
    sections: flow.sections.map((s) =>
      s.id === section ? { ...s, steps: edit(s.steps as ActivityStepV2[]) } : s,
    ),
  };
}

/** The level with the step at `place` replaced. */
export const withStep = (
  flow: ActivityFlowV2,
  place: StepPlace,
  step: ActivityStepV2,
): ActivityFlowV2 =>
  editSteps(flow, place.section, (steps) =>
    steps.map((st, i) => (i === place.index ? step : st)),
  );

/** A bar for each chord (two to a bar when the step says so), else four. */
const chartBars = (step: ActivityStepV2) => {
  const chords = step.chordSymbols?.length ?? 0;
  if (!chords) return 4;
  return Math.ceil(chords / (step.chordsPerBar === 2 ? 2 : 1));
};

/**
 * The step's notes as a part for the Parts editor, both hands: the step's
 * own key, meter, tempo, swing and chords. A step with no notes yet is an
 * empty part of its chart's length, its notes starting in bar 1 as every
 * lesson's do.
 */
export function stepPart(
  flow: ActivityFlowV2,
  step: ActivityStepV2,
): InstrumentPart {
  const id = `lesson-${flow.genre}-l${flow.level}-${step.stepNumber}`;
  const part = partFromLessonStep(flow, step, { id });
  if (part) return part;
  // A note to read the step's settings from, taken away again.
  const shell = partFromLessonStep(
    flow,
    { ...step, targetNotes: [{ midi: 60, onset: 0, duration: 1 }] },
    { id },
  )!;
  return {
    ...shell,
    bars: chartBars(step),
    notes: [],
    source:
      shell.source.kind === 'lesson'
        ? { ...shell.source, tickOffset: 0 }
        : shell.source,
  };
}

/** The step with the part's notes written into it, in the step's key. */
export const stepWithPart = (
  flow: ActivityFlowV2,
  step: ActivityStepV2,
  part: InstrumentPart,
): ActivityStepV2 => writePartToStep(part, step, stepKeyRoot(flow, step) % 12);

/** The level's highest step number plus one. */
export const nextStepNumber = (flow: ActivityFlowV2): number =>
  Math.max(
    0,
    ...flow.sections.flatMap((s) => s.steps.map((st) => st.stepNumber)),
  ) + 1;

/** A tag no other step in the level has: `base`, else `base_2`, `base_3`… */
export function uniqueTag(flow: ActivityFlowV2, base: string): string {
  const taken = new Set(
    flow.sections.flatMap((s) => s.steps.map((st) => st.tag.split(' |')[0])),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

const tagBase = (step: ActivityStepV2) => step.tag.split(' |')[0];

/** A step inserted after `place`, the editor then on it. */
function insertAfter(
  flow: ActivityFlowV2,
  place: StepPlace,
  step: ActivityStepV2,
): { flow: ActivityFlowV2; place: StepPlace } {
  const at = place.index + 1;
  return {
    flow: editSteps(flow, place.section, (steps) => [
      ...steps.slice(0, at),
      step,
      ...steps.slice(at),
    ]),
    place: { section: place.section, index: at },
  };
}

/** A copy of the step, notes and all, right after it. */
export function duplicateStep(flow: ActivityFlowV2, place: StepPlace) {
  const step = stepAt(flow, place)!;
  return insertAfter(flow, place, {
    ...step,
    stepNumber: nextStepNumber(flow),
    tag: uniqueTag(flow, `${tagBase(step)}_copy`),
    activity: `${step.activity} (copy)`,
  });
}

/**
 * A new step right after this one, in its subsection, with its activity,
 * key, meter, tempo, swing, chords and band settings, and no notes or text
 * of its own yet.
 */
export function addStep(flow: ActivityFlowV2, place: StepPlace) {
  const step = stepAt(flow, place)!;
  const next: ActivityStepV2 = {
    ...step,
    stepNumber: nextStepNumber(flow),
    tag: uniqueTag(flow, `${tagBase(step)}_new`),
    activity: 'New step',
    successFeedback: '',
  };
  delete next.direction;
  delete next.targetNotes;
  delete next.variants;
  return insertAfter(flow, place, next);
}

/**
 * The level without the step, the editor on its neighbour; null for a
 * section's only step, which the lesson can't do without.
 */
export function deleteStep(
  flow: ActivityFlowV2,
  place: StepPlace,
): { flow: ActivityFlowV2; place: StepPlace } | null {
  const count =
    flow.sections.find((s) => s.id === place.section)?.steps.length ?? 0;
  if (count < 2) return null;
  return {
    flow: editSteps(flow, place.section, (steps) =>
      steps.filter((_, i) => i !== place.index),
    ),
    place: {
      section: place.section,
      index: Math.min(place.index, count - 2),
    },
  };
}

/** The step one place earlier (-1) or later (+1) in its section. */
export function moveStep(
  flow: ActivityFlowV2,
  place: StepPlace,
  by: -1 | 1,
): { flow: ActivityFlowV2; place: StepPlace } | null {
  const steps =
    (flow.sections.find((s) => s.id === place.section)?.steps as
      | ActivityStepV2[]
      | undefined) ?? [];
  const to = place.index + by;
  if (to < 0 || to >= steps.length) return null;
  return {
    flow: editSteps(flow, place.section, (all) => {
      const next = [...all];
      [next[place.index], next[to]] = [next[to], next[place.index]];
      return next;
    }),
    place: { section: place.section, index: to },
  };
}

/** The section's name, as the lesson's tabs and rail show it. */
export const renameSection = (
  flow: ActivityFlowV2,
  section: ActivitySectionId,
  name: string,
): ActivityFlowV2 => ({
  ...flow,
  sections: flow.sections.map((s) => (s.id === section ? { ...s, name } : s)),
});

/**
 * A group of steps renamed: every step of the section under that subsection
 * takes the new one, so the group stays one group in the lesson's rail.
 */
export const renameGroup = (
  flow: ActivityFlowV2,
  section: ActivitySectionId,
  from: string,
  to: string,
): ActivityFlowV2 =>
  editSteps(flow, section, (steps) =>
    steps.map((st) =>
      st.subsection === from ? { ...st, subsection: to } : st,
    ),
  );

/** The section's groups in the order they first appear, with their sizes. */
export function sectionGroups(
  flow: ActivityFlowV2,
  section: ActivitySectionId,
): { name: string; steps: number }[] {
  const counts = new Map<string, number>();
  for (const st of flow.sections.find((s) => s.id === section)?.steps ?? [])
    counts.set(st.subsection, (counts.get(st.subsection) ?? 0) + 1);
  return [...counts].map(([name, steps]) => ({ name, steps }));
}
