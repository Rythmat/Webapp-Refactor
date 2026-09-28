/**
 * Every authored step, put through the resolver, comes out in register.
 *
 * registerRules.test.ts proves the rules decide correctly; this proves the
 * library actually obeys them. The two fail for different reasons: a rule that
 * is wrong breaks the first, and a step that reaches the student without
 * passing through `resolveStepContent` — a new code path, a new content
 * source — breaks this one.
 *
 * It is also the check Pop L3 D1.1 needed. Its chords were written an octave
 * high and shipped, because the only ceiling in the rules at the time was on a
 * chord's LOWEST note and that chord's lowest note was in range.
 */
import { describe, expect, it } from 'vitest';
import { loadAllFlows } from '@/content/flowStore';
import type { ActivityFlow } from '@/curriculum/types/activity';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import {
  BASS_REGISTER_CEILING,
  CHORD_REGISTER_CEILING,
  CHORD_REGISTER_TOP,
  classifyNote,
  type RegisterContext,
} from '../registerRules';
import { resolveStepContent } from '../resolveStepContent';

/** Every step in the library that writes its own notes. */
async function authoredSteps(): Promise<
  { flow: ActivityFlow; step: ActivityStepV2 }[]
> {
  const flows = [...(await loadAllFlows()).values()].flat();
  const out: { flow: ActivityFlow; step: ActivityStepV2 }[] = [];
  for (const flow of flows) {
    for (const section of flow.sections ?? []) {
      for (const step of (section.steps ?? []) as ActivityStepV2[]) {
        if ((step.targetNotes?.length ?? 0) > 0) out.push({ flow, step });
      }
    }
  }
  return out;
}

const where = (flow: ActivityFlow, step: ActivityStepV2) =>
  `${flow.genre} L${flow.level} ${step.activity}`;

describe('the lesson library obeys the register rules', () => {
  it('has steps to check', async () => {
    // A resolver that returned nothing would pass every test below.
    expect((await authoredSteps()).length).toBeGreaterThan(100);
  });

  it('leaves no chord below the staff’s reach or above it', async () => {
    const offenders: string[] = [];

    for (const { flow, step } of await authoredSteps()) {
      const ctx: RegisterContext = {
        section: step.section,
        ...(step.instrument_config
          ? { instrument_config: step.instrument_config }
          : {}),
      };
      const notes =
        resolveStepContent(step, {
          section: step.section,
          keyRoot: 60,
          tempo: 90,
          timeSignature: [4, 4],
          tpb: 480,
        }) ?? [];

      const chords = notes.filter((n) => classifyNote(n, ctx) === 'chord');
      const bass = notes.filter((n) => classifyNote(n, ctx) === 'bass');

      if (chords.length > 0) {
        const lowest = Math.min(...chords.map((n) => n.midi));
        if (lowest > CHORD_REGISTER_CEILING) {
          offenders.push(`${where(flow, step)}: chords start at ${lowest}`);
        }
        // Rule 2 is per hand, so check it per hand.
        for (const hand of ['lh', 'rh', undefined] as const) {
          const inHand = chords.filter((n) => n.hand === hand);
          if (inHand.length === 0) continue;
          const highest = Math.max(...inHand.map((n) => n.midi));
          if (highest > CHORD_REGISTER_TOP) {
            offenders.push(
              `${where(flow, step)}: ${hand ?? 'untagged'} chords reach ${highest}`,
            );
          }
        }
      }

      if (bass.length > 0) {
        const highest = Math.max(...bass.map((n) => n.midi));
        if (highest > BASS_REGISTER_CEILING) {
          offenders.push(`${where(flow, step)}: bass reaches ${highest}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
