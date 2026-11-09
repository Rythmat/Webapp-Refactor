import { describe, expect, it } from 'vitest';
import { loadAllFlows } from '@/content/flowStore';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { genreFingeringContext } from '../fingeringContext';
import { stepFingerSuggestions } from '../stepFingering';

async function lesson(genre: string, level: number) {
  const flows = [
    ...(await loadAllFlows()).values(),
  ].flat() as unknown as ActivityFlowV2[];
  const flow = flows.find(
    (f) =>
      f.genre === genre &&
      f.level === level &&
      f.params.instrument !== 'guitar',
  )!;
  const steps = (flow.sections ?? []).flatMap(
    (s) => (s.steps ?? []) as ActivityStepV2[],
  );
  return { flow, steps };
}

const funkL1 = () => lesson('funk', 1);

describe('stepFingerSuggestions', () => {
  it('gives every note of a melody step its hand and finger, as the lesson does', async () => {
    const { flow, steps } = await funkL1();
    // A1.1: D minor pentatonic ascending, right hand.
    const step = steps.find((s) => s.activity.startsWith('A1.1'))!;
    const got = stepFingerSuggestions(flow, step)!;
    expect(got.shown).toHaveLength(step.targetNotes!.length);
    expect(got.shown.every((s) => s.hand === 'rh' && s.finger)).toBe(true);
    // Peter's pentatonic table for a white-note key: 1 2 3, 1 2 3.
    expect(got.shown.slice(0, 6).map((s) => s.finger)).toEqual([
      1, 2, 3, 1, 2, 3,
    ]);
    expect(got.auto).toEqual(got.shown);
  });

  it('keeps a pinned finger, and says what the note gets without it', async () => {
    const { flow, steps } = await funkL1();
    const base = steps.find((s) => s.activity.startsWith('A1.1'))!;
    const step = {
      ...base,
      targetNotes: base.targetNotes!.map((n, i) =>
        i === 0 ? { ...n, finger: 2 as const } : n,
      ),
    };
    const got = stepFingerSuggestions(flow, step)!;
    expect(got.shown[0].finger).toBe(2);
    expect(got.auto[0].finger).toBe(1);
  });

  it('gives a chord step on the bass staff to the left hand', async () => {
    const { flow, steps } = await funkL1();
    const step = steps.find((s) => s.section === 'B' && s.targetNotes?.length)!;
    expect(stepFingerSuggestions(flow, step, 'treble')!.shown[0].hand).toBe(
      'rh',
    );
    expect(stepFingerSuggestions(flow, step, 'bass')!.shown[0].hand).toBe('lh');
  });

  it('fingers a root-position triad thumb, index, ring in a genre lesson, the left hand 5 3 1', async () => {
    const { flow, steps } = await lesson('latin', 1);
    // B1.1: E G B up one at a time, then held.
    const step = steps.find((s) => s.activity.startsWith('B1.1'))!;
    const fingers = (clef: 'treble' | 'bass') =>
      stepFingerSuggestions(flow, step, clef)!.shown.map((s) => s.finger);
    expect(fingers('treble')).toEqual([1, 2, 4, 1, 2, 4]);
    expect(fingers('bass')).toEqual([5, 3, 1, 5, 3, 1]);
  });

  it('and thumb, middle, little finger in a theory lesson', () => {
    const flow = buildAppliedTheoryFundamentalsFlow('C');
    const step = (flow.sections ?? []).flatMap(
      (s) => (s.steps ?? []) as ActivityStepV2[],
    )[0];
    expect(genreFingeringContext(flow, step, 'treble').rootTriad).toBe('135');
  });

  it('has nothing for a guitar lesson or a step without notes', async () => {
    const { flow, steps } = await funkL1();
    const step = steps.find((s) => s.targetNotes?.length)!;
    const guitar = {
      ...flow,
      params: { ...flow.params, instrument: 'guitar' as const },
    };
    expect(stepFingerSuggestions(guitar, step)).toBeNull();
    expect(
      stepFingerSuggestions(flow, { ...step, targetNotes: [] }),
    ).toBeNull();
  });
});
