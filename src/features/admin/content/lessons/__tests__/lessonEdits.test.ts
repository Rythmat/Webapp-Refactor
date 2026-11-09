import { describe, expect, it } from 'vitest';
import { bluesFlows } from '@/curriculum/data/activityFlows/blues_v2';
import { jazzFlows, jazzL2 } from '@/curriculum/data/activityFlows/jazz_v2';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import {
  addStep,
  deleteStep,
  duplicateStep,
  moveStep,
  nextStepNumber,
  renameGroup,
  renameSection,
  sectionGroups,
  stepAt,
  stepPart,
  stepWithPart,
  uniqueTag,
  withStep,
} from '../lessonEdits';

const numbers = (flow: ActivityFlowV2) =>
  flow.sections.map((s) => `${s.id}:${s.steps.map((st) => st.stepNumber)}`);
const tags = (flow: ActivityFlowV2) =>
  flow.sections.flatMap((s) => s.steps.map((st) => st.tag.split(' |')[0]));
const B1 = { section: 'B' as const, index: 0 };

describe('a step’s number is its identity', () => {
  it('gives a new step the level’s next number and leaves the rest', () => {
    const { flow, place } = addStep(jazzL2, B1);
    expect(stepAt(flow, place)!.stepNumber).toBe(nextStepNumber(jazzL2));
    expect(numbers(flow).join()).toContain(
      `B:${jazzL2.sections[1].steps[0].stepNumber},${nextStepNumber(jazzL2)},`,
    );
    // Every other step keeps its number.
    const before = jazzL2.sections.flatMap((s) => s.steps);
    for (const st of before)
      expect(
        flow.sections.some((s) =>
          s.steps.some(
            (x) => x.tag === st.tag && x.stepNumber === st.stepNumber,
          ),
        ),
      ).toBe(true);
  });

  it('moves a step with its number, and deletes one leaving a gap', () => {
    const moved = moveStep(jazzL2, B1, 1)!;
    const [a, b] = jazzL2.sections[1].steps;
    expect(
      moved.flow.sections[1].steps.slice(0, 2).map((st) => st.stepNumber),
    ).toEqual([b.stepNumber, a.stepNumber]);
    expect(moved.place).toEqual({ section: 'B', index: 1 });

    const deleted = deleteStep(jazzL2, B1)!;
    expect(deleted.flow.sections[1].steps.map((st) => st.stepNumber)).toEqual(
      jazzL2.sections[1].steps.slice(1).map((st) => st.stepNumber),
    );
  });

  it('won’t move past a section’s ends, or delete its only step', () => {
    expect(moveStep(jazzL2, B1, -1)).toBeNull();
    const one: ActivityFlowV2 = {
      ...jazzL2,
      sections: [
        { ...jazzL2.sections[0], steps: [jazzL2.sections[0].steps[0]] },
      ],
    };
    expect(deleteStep(one, { section: 'A', index: 0 })).toBeNull();
  });

  it('keeps every tag unique', () => {
    const twice = duplicateStep(duplicateStep(jazzL2, B1).flow, B1).flow;
    expect(new Set(tags(twice)).size).toBe(tags(twice).length);
    expect(uniqueTag(jazzL2, 'brand_new')).toBe('brand_new');
  });
});

describe('a new step', () => {
  it('keeps its neighbour’s settings and has no notes or text of its own', () => {
    const { flow, place } = addStep(jazzL2, B1);
    const step = stepAt(flow, place)!;
    const from = stepAt(jazzL2, B1)!;
    expect(step.targetNotes).toBeUndefined();
    expect(step.direction).toBeUndefined();
    expect(step.chordSymbols).toEqual(from.chordSymbols);
    expect(step.assessment).toBe(from.assessment);
    // Its part is empty, its chart long, ready to record into.
    const part = stepPart(flow, step);
    expect(part.notes).toEqual([]);
    expect(part.bars).toBeGreaterThan(0);
  });
});

describe('a step’s notes in the Parts editor', () => {
  const steps = [...jazzFlows, ...bluesFlows].flatMap((flow) =>
    flow.sections.flatMap((s) =>
      (s.steps as ActivityStepV2[])
        .filter((st) => st.targetNotes?.length)
        .map(
          (st) => [`${flow.genre} L${flow.level} ${st.tag}`, flow, st] as const,
        ),
    ),
  );

  it.each(steps)('%s comes back as it was', (_, flow, step) => {
    const back = stepWithPart(flow, step, stepPart(flow, step));
    const key = (n: {
      midi: number;
      onset: number;
      duration: number;
      hand?: string;
    }) => `${n.onset}:${n.midi}:${n.duration}:${n.hand ?? ''}`;
    expect(back.targetNotes!.map(key).sort()).toEqual(
      step.targetNotes!.map(key).sort(),
    );
  });

  it('writes an edit into the step it came from, and nowhere else', () => {
    const step = stepAt(jazzL2, B1)!;
    const part = stepPart(jazzL2, step);
    const edited = { ...part, notes: part.notes.slice(1) };
    const flow = withStep(jazzL2, B1, stepWithPart(jazzL2, step, edited));
    expect(stepAt(flow, B1)!.targetNotes!.length).toBe(
      step.targetNotes!.length - 1,
    );
    expect(flow.sections[0]).toBe(jazzL2.sections[0]);
  });
});

describe('names across the level', () => {
  it('renames a whole group, so it stays one group', () => {
    const [first] = sectionGroups(jazzL2, 'B');
    const flow = renameGroup(jazzL2, 'B', first.name, 'B1: Ninths');
    const groups = sectionGroups(flow, 'B');
    expect(groups[0]).toEqual({ name: 'B1: Ninths', steps: first.steps });
    expect(groups.length).toBe(sectionGroups(jazzL2, 'B').length);
    // Another section's steps keep theirs.
    expect(flow.sections[0]).toBe(jazzL2.sections[0]);
  });

  it('renames a section', () => {
    expect(renameSection(jazzL2, 'B', 'Voicings').sections[1].name).toBe(
      'Voicings',
    );
  });
});
