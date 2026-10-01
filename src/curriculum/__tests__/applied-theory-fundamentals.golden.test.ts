/**
 * Golden snapshots of the piano Applied Theory Fundamentals flow.
 *
 * Guitar is added alongside this flow and must leave it byte-identical: the
 * built flow for every key, the notes every step resolves to, and the piano
 * roll events those notes become. Any drift here is a piano regression.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/appliedTheoryFundamentals';
import {
  resolveStepContent,
  toPianoRollEvents,
} from '@/curriculum/engine/genreGeneration/resolveStepContent';

// The picker's 12 key centers, as the lesson route hands them to the builder.
const KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
] as const;

// Same roots GenreLessonContainerV2's KEY_MAP derives from defaultKey.
const KEY_ROOT: Record<(typeof KEYS)[number], number> = {
  C: 60,
  G: 67,
  D: 62,
  A: 69,
  E: 64,
  B: 71,
  'F#': 66,
  Db: 61,
  Ab: 68,
  Eb: 63,
  Bb: 70,
  F: 65,
};

// resolveStepContent logs a trace for A1.1; keep the test output quiet.
const logSpy = vi.spyOn(console, 'log');
beforeAll(() => {
  logSpy.mockImplementation(() => {});
});
afterAll(() => {
  logSpy.mockRestore();
});

describe('Applied Theory Fundamentals (piano) — golden', () => {
  for (const key of KEYS) {
    it(`builds the same flow for ${key}`, () => {
      // Exact JSON, one line per step, so the snapshot stays reviewable.
      const { sections, ...rest } = buildAppliedTheoryFundamentalsFlow(key);
      expect({
        ...rest,
        sections: sections.map((section) => ({
          id: section.id,
          name: section.name,
          steps: section.steps.map((step) => JSON.stringify(step)),
        })),
      }).toMatchSnapshot();
    });

    it(`resolves the same notes and roll events for ${key}`, () => {
      const flow = buildAppliedTheoryFundamentalsFlow(key);
      const keyRoot = KEY_ROOT[key];
      const resolved = flow.sections.flatMap((section) =>
        section.steps.map((step) => {
          const notes =
            resolveStepContent(step, {
              section: section.id,
              keyRoot,
              tempo: flow.params.tempoRange[0],
              timeSignature: [4, 4],
              tpb: 480,
              defaultScale: flow.params.defaultScale,
            }) ?? [];
          // One compact line per step: midi@onset+duration[hand] for the
          // notes, then the roll events' id/name/color, so a diff reads.
          const events = toPianoRollEvents(notes, '#d2404a', keyRoot);
          return [
            step.tag,
            notes
              .map((n) => `${n.midi}@${n.onset}+${n.duration}${n.hand ?? ''}`)
              .join(' '),
            events
              .map(
                (e) =>
                  `${e.id}:${e.pitchName}:${e.velocity}:${e.color ?? ''}:${Object.keys(e).join(',')}`,
              )
              .join(' '),
          ].join(' | ');
        }),
      );
      expect(resolved).toMatchSnapshot();
    });
  }
});
