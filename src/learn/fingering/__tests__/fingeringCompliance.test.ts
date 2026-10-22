/**
 * Every piano step in the library, as the student gets it, gets a playable
 * fingering: a finger 1–5 on every note, no chord one hand can't hold, and no
 * finger asked to play a new key while it still holds the last.
 *
 * suggestFingering.test.ts proves the suggester on cases chosen to test it;
 * this proves it on what the lessons actually ask — including in both chord
 * clefs, since flipping the clef moves the chords between hands.
 */
import { describe, expect, it } from 'vitest';
import { loadAllFlows } from '@/content/flowStore';
import { resolveStepContent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import { stepKeyRoot } from '@/curriculum/utils/flowKey';
import {
  buildFingeringTimeline,
  type FingeredNote,
} from '@/lib/learn/pianoFingering';
import {
  genreFingeringContext,
  isTwoHandStep,
  stepStaves,
} from '../fingeringContext';

/** Every piano step with notes, resolved as the lesson resolves them. */
async function pianoSteps() {
  const flows = [
    ...(await loadAllFlows()).values(),
  ].flat() as unknown as ActivityFlowV2[];
  const out: {
    flow: ActivityFlowV2;
    step: ActivityStepV2;
    notes: ReturnType<typeof resolveStepContent> & object;
  }[] = [];
  for (const flow of flows) {
    if (flow.params?.instrument === 'guitar') continue;
    for (const section of flow.sections ?? [])
      for (const step of (section.steps ?? []) as ActivityStepV2[]) {
        const notes = resolveStepContent(step, {
          section: step.section,
          keyRoot: stepKeyRoot(flow, step),
          tempo: 90,
          timeSignature: [4, 4],
          tpb: 480,
          defaultScale: flow.params.defaultScale,
          genre: flow.genre,
          swing: flow.params.swing,
        });
        if (notes?.length) out.push({ flow, step, notes });
      }
  }
  return out;
}

const where = (flow: ActivityFlowV2, step: ActivityStepV2) =>
  `${flow.genre} L${flow.level} ${step.section}${step.stepNumber}`;

/** What a hand can't do with these notes. */
function problems(list: readonly FingeredNote[]): string[] {
  const out: string[] = [];
  // Held together: past the widest practical reach (thumb to 5, 15 semitones).
  const byOnset = new Map<number, FingeredNote[]>();
  for (const n of list) {
    const key = Math.round(n.onset / 30);
    byOnset.set(key, [...(byOnset.get(key) ?? []), n]);
  }
  for (const chord of byOnset.values()) {
    const midis = chord.map((n) => n.midi);
    const span = Math.max(...midis) - Math.min(...midis);
    if (span > 15) out.push(`one hand spans ${span} at ${chord[0].onset}`);
    const fingers = chord.map((n) => n.finger);
    if (new Set(fingers).size < new Set(midis).size)
      out.push(`two keys on one finger at ${chord[0].onset}`);
  }
  // A finger still holding one key can't play another.
  for (const a of list)
    for (const b of list)
      if (
        b.onset > a.onset + 30 &&
        b.onset < a.onset + a.duration - 30 &&
        a.finger === b.finger &&
        a.midi !== b.midi
      )
        out.push(
          `finger ${a.finger} held on ${a.midi} and asked for ${b.midi}`,
        );
  return out;
}

describe('every piano lesson step gets a playable fingering', () => {
  it('has steps to check', async () => {
    expect((await pianoSteps()).length).toBeGreaterThan(100);
  });

  it('in both chord clefs', async () => {
    const offenders: string[] = [];
    for (const { flow, step, notes } of await pianoSteps())
      for (const clef of ['treble', 'bass'] as const) {
        if (clef === 'bass' && step.section !== 'B') continue;
        const staves = stepStaves(step.section, isTwoHandStep(step), clef);
        const t = buildFingeringTimeline(
          notes,
          genreFingeringContext(flow, step, staves),
        );
        const unfingered = t.notes.filter((n) => !n).length;
        if (unfingered)
          offenders.push(
            `${where(flow, step)} (${clef}): ${unfingered} notes unfingered`,
          );
        for (const hand of ['rh', 'lh'] as const)
          for (const p of problems(t.byHand[hand]))
            offenders.push(`${where(flow, step)} (${clef}) ${hand}: ${p}`);
      }
    expect(offenders).toEqual([]);
  });
});
